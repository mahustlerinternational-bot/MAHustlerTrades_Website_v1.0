import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ZIINA_API='https://api-v2.ziina.com/api/payment_intent';

function validSignature(raw:string,received:string|null,secret:string){
  if(!received)return false;
  const expected=createHmac('sha256',secret).update(raw).digest('hex');
  const a=Buffer.from(expected,'utf8'),b=Buffer.from(received,'utf8');
  return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(req:NextRequest){
  const raw=await req.text();
  const secret=process.env.ZIINA_WEBHOOK_SECRET??'';
  if(secret&&!validSignature(raw,req.headers.get('x-hmac-signature'),secret)) return NextResponse.json({error:'Invalid webhook signature'},{status:401});
  let body:any;try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
  if(body.event&&body.event!=='payment_intent.status.updated')return NextResponse.json({received:true});
  const intentId=String(body.data?.id??body.id??'');
  if(!intentId)return NextResponse.json({error:'Missing payment intent id'},{status:400});

  const token=process.env.ZIINA_API_TOKEN??'';
  if(!token)return NextResponse.json({error:'Ziina verification is not configured'},{status:503});
  const verifyResponse=await fetch(`${ZIINA_API}/${encodeURIComponent(intentId)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
  if(!verifyResponse.ok)return NextResponse.json({error:'Could not verify payment with Ziina'},{status:502});
  const verified=await verifyResponse.json();
  if(String(verified.status).toLowerCase()!=='completed')return NextResponse.json({received:true,status:verified.status});

  const {data:intent,error:intentError}=await supabaseAdmin.from('payment_intents').select('*').eq('ziina_intent_id',intentId).maybeSingle();
  if(intentError)return NextResponse.json({error:intentError.message},{status:500});
  if(!intent)return NextResponse.json({error:'Unknown payment intent'},{status:404});
  if(intent.status==='completed')return NextResponse.json({received:true,duplicate:true});
  const expectedFils=Math.round(Number(intent.amount_aed)*100);
  if(verified.currency_code!=='AED'||Number(verified.amount)!==expectedFils)return NextResponse.json({error:'Payment amount mismatch'},{status:409});

  let fulfillmentError:string|null=null;
  if(intent.type==='course'){
    const {error}=await supabaseAdmin.from('enrollments').upsert({user_id:intent.user_id,course_id:intent.reference_id,status:'active',payment_method:'ziina',amount_paid:intent.amount_usd,enrolled_at:new Date().toISOString()},{onConflict:'user_id,course_id'});
    fulfillmentError=error?.message??null;
    const couponId=intent.metadata?.coupon_id;
    if(!error&&couponId){
      const {data:coupon}=await supabaseAdmin.from('coupons').select('max_uses').eq('id',couponId).maybeSingle();
      const {error:couponError}=await supabaseAdmin.rpc('increment_coupon_uses',{p_coupon_id:couponId,p_max_uses:coupon?.max_uses??null});
      if(couponError)console.error('[ziina webhook] coupon counter:',couponError.message);
    }
  }else if(intent.type==='package'){
    const {error}=await supabaseAdmin.from('profiles').update({package_id:intent.reference_id}).eq('id',intent.user_id);
    fulfillmentError=error?.message??null;
  }else if(intent.type==='event'){
    const ticketType=intent.metadata?.ticket_type==='vip'?'vip':'standard';
    const {error}=await supabaseAdmin.from('event_registrations').upsert({user_id:intent.user_id,event_id:intent.reference_id,ticket_type:ticketType,status:'confirmed',amount_paid:intent.amount_usd,registered_at:new Date().toISOString()},{onConflict:'user_id,event_id'});
    fulfillmentError=error?.message??null;
    if(!error){const {error:countError}=await supabaseAdmin.rpc('increment_event_count',{p_event_id:intent.reference_id});if(countError)console.error('[ziina webhook] event counter:',countError.message);}
  }
  if(fulfillmentError){console.error('[ziina webhook] fulfillment failed:',fulfillmentError);return NextResponse.json({error:'Fulfillment failed'},{status:500});}
  const {error:updateError}=await supabaseAdmin.from('payment_intents').update({status:'completed',fulfilled_at:new Date().toISOString()}).eq('id',intent.id);
  if(updateError)return NextResponse.json({error:updateError.message},{status:500});
  return NextResponse.json({received:true});
}

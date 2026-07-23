import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
import { getMembershipPaymentLinks } from '@/lib/packages/paymentLinks';

export const dynamic = 'force-dynamic';

const ZIINA_API = 'https://api-v2.ziina.com/api/payment_intent';
const ZIINA_TOKEN = process.env.ZIINA_API_TOKEN ?? '';
const USD_TO_AED = 3.6725;

type ProductType = 'course'|'package'|'event';

async function resolvePurchase(type:ProductType,id:string,body:any) {
  if (type === 'package') {
    const { data } = await supabaseAdmin.from('packages').select('id,name,price').eq('id',id).eq('is_active',true).maybeSingle();
    if (!data) return null;
    const links = await getMembershipPaymentLinks();
    return { amount:Number(data.price), description:`${data.name} Membership — MAHustler Trades`, metadata:{}, manualUrl:links[id]??'' };
  }
  if (type === 'event') {
    const { data } = await supabaseAdmin.from('events').select('id,title,ticket_price,vip_ticket_price').eq('id',id).eq('is_published',true).maybeSingle();
    if (!data) return null;
    const ticketType = body.ticket_type === 'vip' ? 'vip' : 'standard';
    const amount = ticketType === 'vip' ? Number(data.vip_ticket_price??0) : Number(data.ticket_price??0);
    return { amount, description:`${data.title} — ${ticketType} ticket`, metadata:{ticket_type:ticketType}, manualUrl:'' };
  }
  const { data:course } = await supabaseAdmin.from('courses').select('id,title,price').eq('id',id).eq('is_published',true).maybeSingle();
  if (!course) return null;
  let amount = Number(course.price);
  let couponId:string|undefined;
  const couponCode = String(body.coupon_code??'').trim().toUpperCase();
  if (couponCode) {
    const { data:coupon } = await supabaseAdmin.from('coupons').select('*').eq('code',couponCode).eq('is_active',true).maybeSingle();
    if (!coupon || (coupon.expires_at && new Date(coupon.expires_at)<new Date()) || (coupon.max_uses && coupon.uses_count>=coupon.max_uses) || (coupon.course_id && coupon.course_id!==id)) return null;
    if (coupon.discount_type==='full') amount=0;
    else if (coupon.discount_type==='percent') amount=amount*(1-Number(coupon.discount_value)/100);
    else amount=Math.max(0,amount-Number(coupon.discount_value));
    couponId=coupon.id;
  }
  return { amount, description:course.title, metadata:{coupon_id:couponId,coupon_code:couponCode||undefined}, manualUrl:'' };
}

export async function POST(req:NextRequest) {
  const session = await requireAuthSession(req);
  if (!session?.userId) return NextResponse.json({error:'Unauthorized'},{status:401});
  const body = await req.json();
  const type = body.type as ProductType;
  const id = String(body.id??'');
  if (!['course','package','event'].includes(type)||!id) return NextResponse.json({error:'Valid type and id are required'},{status:400});

  if(type==='course'){
    const {data:profile,error:profileError}=await supabaseAdmin.from('profiles').select('ib_status').eq('id',session.userId).single();
    if(profileError)return NextResponse.json({error:'Unable to verify course payment eligibility'},{status:500});
    if(profile?.ib_status==='active')return NextResponse.json({error:'Payment is not required. Your approved Elite access includes every course for free.',free_ib_access:true},{status:409});
  }

  const purchase = await resolvePurchase(type,id,body);
  if (!purchase) return NextResponse.json({error:'Product, ticket, or coupon is invalid'},{status:404});
  if (purchase.manualUrl) return NextResponse.json({checkout_url:purchase.manualUrl,manual:true});
  if (purchase.amount<=0) return NextResponse.json({error:'No payment is required for this item'},{status:400});
  if (!ZIINA_TOKEN) return NextResponse.json({requires_payment:true,gateway:'ziina',amount_usd:purchase.amount,amount_aed:(purchase.amount*USD_TO_AED).toFixed(2),message:'Ziina API token is not configured',checkout_url:null},{status:503});

  const amountAed = Number((purchase.amount*USD_TO_AED).toFixed(2));
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL??'http://localhost:3010').replace(/\/$/,'');
  const portalPath = type==='course'?'courses':type==='event'?'events':'packages';
  try {
    const response = await fetch(ZIINA_API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ZIINA_TOKEN}`},body:JSON.stringify({
      amount:Math.round(amountAed*100),currency_code:'AED',message:purchase.description,
      success_url:`${appUrl}/portal/${portalPath}?payment=success&payment_intent={PAYMENT_INTENT_ID}`,
      cancel_url:`${appUrl}/portal/${portalPath}?payment=cancelled`,failure_url:`${appUrl}/portal/${portalPath}?payment=failed`,
      test:process.env.NODE_ENV!=='production',allow_tips:false,
    })});
    const data=await response.json();
    if(!response.ok||!data.id||!data.redirect_url) return NextResponse.json({error:data.message??data.error??'Ziina rejected the payment request'},{status:502});
    const {error:logError}=await supabaseAdmin.from('payment_intents').insert({user_id:session.userId,ziina_intent_id:data.id,type,reference_id:id,amount_usd:purchase.amount,amount_aed:amountAed,status:'pending',checkout_url:data.redirect_url,metadata:purchase.metadata});
    if(logError){console.error('[ziina] failed to persist payment intent:',logError.message);return NextResponse.json({error:'Payment was created but could not be recorded. Please contact support before paying.',intent_id:data.id},{status:500});}
    return NextResponse.json({checkout_url:data.redirect_url,intent_id:data.id,amount_aed:amountAed,currency:'AED'});
  } catch(error){return NextResponse.json({error:'Payment gateway error: '+(error instanceof Error?error.message:'Unknown error')},{status:502});}
}

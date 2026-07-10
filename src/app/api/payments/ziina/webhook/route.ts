import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error:'Invalid body' },{ status:400 }); }
  const { id:intentId, status } = body;
  if (status!=='COMPLETED'&&status!=='completed') return NextResponse.json({ received:true });
  const { data:intent } = await supabaseAdmin.from('payment_intents' as any).select('*').eq('ziina_intent_id',intentId).maybeSingle();
  if (!intent) return NextResponse.json({ received:true });
  if ((intent as any).type==='course') {
    await supabaseAdmin.from('enrollments').upsert({ user_id:(intent as any).user_id, course_id:(intent as any).reference_id, status:'active', payment_method:'ziina', amount_paid:(intent as any).amount_usd, enrolled_at:new Date().toISOString() },{ onConflict:'user_id,course_id' });
  } else if ((intent as any).type==='package') {
    await supabaseAdmin.from('profiles').update({ package_id:(intent as any).reference_id }).eq('id',(intent as any).user_id);
  }
  await supabaseAdmin.from('payment_intents' as any).update({ status:'completed', fulfilled_at:new Date().toISOString() }).eq('ziina_intent_id',intentId);
  return NextResponse.json({ received:true });
}

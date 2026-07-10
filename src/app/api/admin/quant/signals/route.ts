import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { data, error } = await supabaseAdmin.from('quant_signals').select('*').order('broadcasted_at',{ ascending:false }).limit(20);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??[]);
}
export async function POST(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  if (!b.instrument||!b.signal_type||!b.entry_price||!b.tp_price||!b.sl_price)
    return NextResponse.json({ error:'instrument, signal_type, entry_price, tp_price, sl_price required' },{ status:400 });
  const entry=parseFloat(b.entry_price), tp=parseFloat(b.tp_price), sl=parseFloat(b.sl_price);
  const rr   = Math.abs(tp-entry)/Math.abs(entry-sl);
  const risk  = Math.abs(entry-sl)/entry*100;
  // Cancel existing active signals for same instrument
  await supabaseAdmin.from('quant_signals').update({ status:'cancelled', closed_at:new Date().toISOString() })
    .eq('instrument',b.instrument).eq('status','active');
  const { data, error } = await supabaseAdmin.from('quant_signals').insert({
    instrument:b.instrument, signal_type:b.signal_type,
    entry_price:entry, tp_price:tp, sl_price:sl,
    rr_ratio:parseFloat(rr.toFixed(2)), risk_pct:parseFloat(risk.toFixed(2)),
    analysis_notes:b.analysis_notes??null, status:'active',
    broadcasted_at:new Date().toISOString(), created_by:s.userId,
  }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data,{ status:201 });
}

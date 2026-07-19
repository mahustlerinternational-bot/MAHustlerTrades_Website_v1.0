import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
import { openSignal } from '@/lib/quant/signalService';
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
  if(!['long','short'].includes(b.signal_type))return NextResponse.json({error:'signal_type must be long or short'},{status:400});
  try{
    const signal=await openSignal({instrument:b.instrument,signal_type:b.signal_type,entry_price:Number(b.entry_price),tp_price:Number(b.tp_price),sl_price:Number(b.sl_price),analysis_notes:b.analysis_notes},'manual',s.userId);
    return NextResponse.json(signal,{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { data, error } = await supabaseAdmin.from('quant_regimes').select('*').order('recorded_at',{ ascending:false }).limit(10);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??[]);
}
export async function POST(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  const { accumulation_pct=18, trending_pct=72, distribution_pct=6, ranging_pct=14 } = b;
  const regimes = { accumulation_pct, trending_pct, distribution_pct, ranging_pct };
  // active_regime must match the regime_type enum exactly: 'Accumulation' | 'Trending' | 'Distribution' | 'Ranging'
  const LABELS: Record<string,string> = {
    accumulation_pct: 'Accumulation', trending_pct: 'Trending',
    distribution_pct: 'Distribution', ranging_pct: 'Ranging',
  };
  const topKey = Object.entries(regimes).reduce((a,b)=>b[1]>a[1]?b:a)[0];
  const active_regime = LABELS[topKey];
  const { data, error } = await supabaseAdmin.from('quant_regimes').insert({
    ...regimes, active_regime, recorded_at:new Date().toISOString(), created_by:s.userId,
  }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data,{ status:201 });
}

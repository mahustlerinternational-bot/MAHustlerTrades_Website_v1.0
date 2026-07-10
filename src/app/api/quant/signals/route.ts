import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('quant_signals').select('*').eq('status','active').order('broadcasted_at',{ ascending:false }).limit(1).maybeSingle();
  if (error && error.code!=='PGRST116') return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??null);
}

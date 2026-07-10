import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let q = supabaseAdmin.from('events').select('*').eq('is_published',true).order('event_date',{ ascending:true });
  if (searchParams.get('upcoming')==='true') q = q.gte('event_date',new Date().toISOString());
  const { data, error } = await q;
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??[]);
}

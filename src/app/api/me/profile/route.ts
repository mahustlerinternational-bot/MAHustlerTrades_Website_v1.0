import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('profiles').select('*, package:packages(*,features:package_features(*))').eq('id',s.userId).single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function PATCH(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const b = await req.json();
  const u: Record<string,unknown> = {};
  if (b.full_name!==undefined) u.full_name=b.full_name;
  if (b.avatar_url!==undefined) u.avatar_url=b.avatar_url;
  if (!Object.keys(u).length) return NextResponse.json({ error:'No valid fields' },{ status:400 });
  const { data, error } = await supabaseAdmin.from('profiles').update(u).eq('id',s.userId).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}

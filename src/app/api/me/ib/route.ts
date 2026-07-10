import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('ib_registrations').select('*').eq('user_id',s.userId).order('submitted_at',{ ascending:false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??null);
}
export async function POST(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { broker_name, account_number } = await req.json();
  if (!broker_name||!account_number) return NextResponse.json({ error:'broker_name and account_number required' },{ status:400 });
  const { data:existing } = await supabaseAdmin.from('ib_registrations').select('id,status').eq('user_id',s.userId).neq('status','rejected').maybeSingle();
  if (existing) return NextResponse.json({ error:`You already have a ${existing.status} IB application.`, existing },{ status:409 });
  const { data, error } = await supabaseAdmin.from('ib_registrations').insert({ user_id:s.userId, broker_name:broker_name.trim(), account_number:account_number.trim(), status:'pending', submitted_at:new Date().toISOString() }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  await supabaseAdmin.from('profiles').update({ ib_status:'pending' }).eq('id',s.userId);
  return NextResponse.json(data,{ status:201 });
}

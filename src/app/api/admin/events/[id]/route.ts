import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest,{ params }:{ params:{ id:string } }) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const [evRes, regRes] = await Promise.all([
    supabaseAdmin.from('events').select('*').eq('id',params.id).single(),
    supabaseAdmin.from('event_registrations').select('*, profile:profiles(full_name)').eq('event_id',params.id).limit(50),
  ]);
  if (evRes.error) return NextResponse.json({ error:evRes.error.message },{ status:500 });
  return NextResponse.json({ ...evRes.data, registrations:regRes.data??[] });
}
export async function PUT(req: NextRequest,{ params }:{ params:{ id:string } }) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  const allowed = ['title','description','event_type','event_date','duration_minutes','location','is_virtual','capacity','ticket_price','vip_ticket_price','badge','host_name','is_published'];
  const u: Record<string,unknown> = {};
  for (const k of allowed) if (b[k]!==undefined) u[k]=b[k];
  const { data, error } = await supabaseAdmin.from('events').update(u).eq('id',params.id).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function DELETE(req: NextRequest,{ params }:{ params:{ id:string } }) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { count } = await supabaseAdmin.from('event_registrations').select('*',{ count:'exact', head:true }).eq('event_id',params.id).eq('status','confirmed');
  if (count && count > 0) return NextResponse.json({ error:`Cannot delete: ${count} confirmed registrations exist.` },{ status:409 });
  const { error } = await supabaseAdmin.from('events').delete().eq('id',params.id);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ success:true });
}

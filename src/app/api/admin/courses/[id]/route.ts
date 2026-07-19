import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { data, error } = await supabaseAdmin.from('courses').select('*').eq('id',id).single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function PUT(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  const allowed = ['title','description','price','level','market','duration_hours','lesson_count','sort_order','is_published','logo_url','cover_image_url'];
  const u: Record<string,unknown> = {};
  for (const k of allowed) if (b[k]!==undefined) u[k]=b[k];
  const { data, error } = await supabaseAdmin.from('courses').update(u).eq('id',id).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function DELETE(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { count } = await supabaseAdmin.from('enrollments').select('*',{ count:'exact', head:true }).eq('course_id',id).eq('status','active');
  if (count && count > 0) return NextResponse.json({ error:`Cannot delete: ${count} active enrollments exist. Unpublish instead.` },{ status:409 });
  const { error } = await supabaseAdmin.from('courses').delete().eq('id',id);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ success:true });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function PATCH(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  const allowed = ['code','description','discount_type','discount_value','course_id','max_uses','expires_at','is_active'];
  const u: Record<string,unknown> = {};
  for (const k of allowed) if (b[k]!==undefined) u[k]=b[k];
  if (u.code) u.code = String(u.code).toUpperCase().trim();
  const { data, error } = await supabaseAdmin.from('coupons').update(u).eq('id',id).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function DELETE(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { error } = await supabaseAdmin.from('coupons').delete().eq('id',id);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ success:true });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { data, error } = await supabaseAdmin.from('coupons').select('*').order('created_at',{ ascending:false });
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function POST(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  if (!b.code || !b.discount_type) return NextResponse.json({ error:'code and discount_type required' },{ status:400 });
  const { data, error } = await supabaseAdmin.from('coupons').insert({
    code:b.code.toUpperCase().trim(), description:b.description??null,
    discount_type:b.discount_type, discount_value:parseFloat(b.discount_value??'0'),
    course_id:b.course_id??null, max_uses:b.max_uses??null,
    expires_at:b.expires_at??null, is_active:b.is_active??true, created_by:s.userId,
  }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data,{ status:201 });
}

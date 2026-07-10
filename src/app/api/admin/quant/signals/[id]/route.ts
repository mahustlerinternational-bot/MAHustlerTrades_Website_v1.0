import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function PATCH(req: NextRequest,{ params }:{ params:{ id:string } }) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  const u: Record<string,unknown> = {};
  if (b.status) u.status=b.status;
  if (b.closed_price) u.closed_price=parseFloat(b.closed_price);
  if (b.status && b.status!=='active') u.closed_at=new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('quant_signals').update(u).eq('id',params.id).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}

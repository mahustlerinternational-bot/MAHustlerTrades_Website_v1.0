import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get('page')  ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const search= searchParams.get('search') ?? '';
  const role  = searchParams.get('role')   ?? '';
  const offset= (page-1)*limit;
  let q = supabaseAdmin.from('profiles').select('*, package:packages(name,slug)',{ count:'exact' }).order('created_at',{ ascending:false }).range(offset, offset+limit-1);
  if (search) q = q.ilike('full_name',`%${search}%`);
  if (role)   q = q.eq('role',role);
  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ data:data??[], total:count??0, page, limit });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  let q = supabaseAdmin.from('ib_registrations').select('*, profile:profiles(full_name,role)').order('submitted_at',{ ascending:false });
  if (status) q = q.eq('status',status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}

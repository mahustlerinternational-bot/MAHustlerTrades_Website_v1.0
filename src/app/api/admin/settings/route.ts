import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { data, error } = await supabaseAdmin.from('site_settings').select('key,value,description,updated_at').neq('key','integrations').order('key');
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}
export async function PATCH(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error:'key required' },{ status:400 });
  if (key==='integrations') return NextResponse.json({ error:'Use the secure integrations endpoint for this setting' },{ status:400 });
  const { data, error } = await supabaseAdmin.from('site_settings')
    .upsert({ key, value, updated_by:s.userId },{ onConflict:'key' }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}

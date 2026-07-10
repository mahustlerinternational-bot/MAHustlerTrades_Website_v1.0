import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { data, error } = await supabaseAdmin.from('packages').select('*,features:package_features(*)').eq('is_active',true).order('sort_order');
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??[]);
}

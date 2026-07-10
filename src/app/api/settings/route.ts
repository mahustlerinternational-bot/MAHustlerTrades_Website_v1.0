// src/app/api/settings/route.ts
//
// Public read-only endpoint for site content that's meant to be displayed
// on public pages (homepage hero, stats bar). Unlike /api/admin/settings,
// this requires no auth — it only exposes the keys that are already meant
// to be public-facing content, never the IB guide or Quant AI config.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PUBLIC_KEYS = ['hero', 'stats'];

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('key, value')
    .in('key', PUBLIC_KEYS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map: Record<string, unknown> = {};
  (data ?? []).forEach(row => { map[row.key] = row.value; });

  return NextResponse.json(map);
}

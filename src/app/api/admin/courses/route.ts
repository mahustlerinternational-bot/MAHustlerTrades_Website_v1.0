import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit')?? '50');
  const { data, count, error } = await supabaseAdmin.from('courses').select('*',{ count:'exact' }).order('sort_order').limit(limit);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ data:data??[], total:count??0 });
}
export async function POST(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  if (!b.title || !b.description) return NextResponse.json({ error:'title and description required' },{ status:400 });
  const slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const { data, error } = await supabaseAdmin.from('courses').insert({
    title:b.title, description:b.description, price:parseFloat(b.price??'0'),
    level:b.level??'All Levels', market:b.market??null,
    duration_hours:b.duration_hours??null, lesson_count:b.lesson_count??null,
    sort_order:b.sort_order??0, is_published:b.is_published??false,
    logo_url:b.logo_url??null, cover_image_url:b.cover_image_url??null, slug,
  }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data,{ status:201 });
}

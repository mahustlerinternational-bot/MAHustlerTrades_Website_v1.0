import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit')?? '50');
  const { data, count, error } = await supabaseAdmin.from('events').select('*',{ count:'exact' }).order('event_date',{ ascending:false }).limit(limit);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ data:data??[], total:count??0 });
}
export async function POST(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const b = await req.json();
  if (!b.title || !b.event_date) return NextResponse.json({ error:'title and event_date required' },{ status:400 });
  const { data, error } = await supabaseAdmin.from('events').insert({
    title:b.title, description:b.description??null, event_type:b.event_type??'webinar',
    event_date:b.event_date, duration_minutes:b.duration_minutes??null,
    location:b.location??null, is_virtual:b.is_virtual??true,
    capacity:b.capacity??null, ticket_price:b.ticket_price??0,
    vip_ticket_price:b.vip_ticket_price??null, badge:b.badge??null,
    host_name:b.host_name??null, is_published:b.is_published??false,
  }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data,{ status:201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('event_registrations').select('*,event:events(*)').eq('user_id',s.userId).neq('status','cancelled').order('registered_at',{ ascending:false });
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??[]);
}
export async function POST(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { event_id, ticket_type='standard' } = await req.json();
  if (!event_id) return NextResponse.json({ error:'event_id required' },{ status:400 });
  const { data:existing } = await supabaseAdmin.from('event_registrations').select('id').eq('user_id',s.userId).eq('event_id',event_id).neq('status','cancelled').maybeSingle();
  if (existing) return NextResponse.json({ error:'Already registered' },{ status:409 });
  const { data:ev } = await supabaseAdmin.from('events').select('*').eq('id',event_id).eq('is_published',true).single();
  if (!ev) return NextResponse.json({ error:'Event not found' },{ status:404 });
  if (ev.capacity && ev.registered_count>=ev.capacity) return NextResponse.json({ error:'Event is full' },{ status:409 });
  const price = ticket_type==='vip' ? (ev.vip_ticket_price??0) : (ev.ticket_price??0);
  if (price>0) return NextResponse.json({ requires_payment:true, gateway:'ziina', event_id, amount_usd:price, amount_aed:(price*3.6725).toFixed(2) },{ status:202 });
  const { data, error } = await supabaseAdmin.from('event_registrations').insert({ user_id:s.userId, event_id, ticket_type, status:'confirmed', amount_paid:0, registered_at:new Date().toISOString() }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  const { error:countError } = await supabaseAdmin.rpc('increment_event_count',{ p_event_id:event_id });
  if (countError) console.error('[events] registered_count update failed:', countError.message);
  return NextResponse.json(data,{ status:201 });
}

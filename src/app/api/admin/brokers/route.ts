import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface BrokerRecord {
  id: string;
  name: string;
  referral_link: string;
  min_deposit: number;
  is_active: boolean;
  sort_order: number;
}

async function readBrokers(): Promise<BrokerRecord[]> {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('value')
    .eq('key', 'ib_brokers')
    .maybeSingle();
  return Array.isArray(data?.value) ? data.value as BrokerRecord[] : [];
}

async function writeBrokers(brokers: BrokerRecord[], userId: string) {
  return supabaseAdmin.from('site_settings').upsert({
    key: 'ib_brokers',
    value: brokers,
    description: 'Admin-managed approved IB broker catalog',
    updated_by: userId,
  }, { onConflict: 'key' });
}

function validateUrl(value: unknown) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:');
  } catch { return false; }
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const brokers = await readBrokers();
  return NextResponse.json(brokers.sort((a, b) => a.sort_order - b.sort_order));
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  if (name.length < 2) return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });
  if (!validateUrl(body.referral_link)) return NextResponse.json({ error: 'A valid HTTPS referral link is required' }, { status: 400 });

  const brokers = await readBrokers();
  if (brokers.some(b => b.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'A broker with this name already exists' }, { status: 409 });
  }
  const broker: BrokerRecord = {
    id: crypto.randomUUID(),
    name,
    referral_link: String(body.referral_link).trim(),
    min_deposit: Math.max(0, Number(body.min_deposit) || 0),
    is_active: body.is_active !== false,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : brokers.length,
  };
  const { error } = await writeBrokers([...brokers, broker], session.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(broker, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Broker id is required' }, { status: 400 });
  if (body.referral_link !== undefined && !validateUrl(body.referral_link)) {
    return NextResponse.json({ error: 'A valid HTTPS referral link is required' }, { status: 400 });
  }
  const brokers = await readBrokers();
  const index = brokers.findIndex(b => b.id === body.id);
  if (index < 0) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
  const current = brokers[index];
  brokers[index] = {
    ...current,
    ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
    ...(body.referral_link !== undefined ? { referral_link: String(body.referral_link).trim() } : {}),
    ...(body.min_deposit !== undefined ? { min_deposit: Math.max(0, Number(body.min_deposit) || 0) } : {}),
    ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
    ...(body.sort_order !== undefined ? { sort_order: Number(body.sort_order) || 0 } : {}),
  };
  const { error } = await writeBrokers(brokers, session.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(brokers[index]);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Broker id is required' }, { status: 400 });
  const brokers = await readBrokers();
  const next = brokers.filter(b => b.id !== id);
  if (next.length === brokers.length) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
  const { error } = await writeBrokers(next, session.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

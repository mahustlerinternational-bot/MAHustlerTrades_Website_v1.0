import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, supabaseAdmin } from '@/lib/supabase/server';
import type {BrokerRecord} from '@/lib/ib/brokerTypes';
import {removeCourseMedia, signedCourseMediaUrl} from '@/lib/lms/media';

export const dynamic = 'force-dynamic';

export type {BrokerRecord} from '@/lib/ib/brokerTypes';

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

function optionalVideoUrl(value: unknown) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  return validateUrl(normalized) ? normalized : undefined;
}

function optionalTutorialPath(value: unknown) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  return normalized.startsWith('brokers/tutorials/') ? normalized : undefined;
}

async function withPlayback(broker: BrokerRecord): Promise<BrokerRecord> {
  return {
    ...broker,
    tutorial_playback_url: broker.tutorial_video_storage_path
      ? await signedCourseMediaUrl(broker.tutorial_video_storage_path)
      : broker.tutorial_video_url ?? null,
  };
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const brokers = await readBrokers();
  return NextResponse.json(await Promise.all(
    brokers.sort((a, b) => a.sort_order - b.sort_order).map(withPlayback),
  ));
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  if (name.length < 2) return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });
  if (!validateUrl(body.referral_link)) return NextResponse.json({ error: 'A valid HTTPS referral link is required' }, { status: 400 });
  const tutorialVideoUrl = optionalVideoUrl(body.tutorial_video_url);
  const tutorialStoragePath = optionalTutorialPath(body.tutorial_video_storage_path);
  if (tutorialVideoUrl === undefined) return NextResponse.json({error: 'Tutorial video link must be a valid HTTPS URL'}, {status: 400});
  if (tutorialStoragePath === undefined) return NextResponse.json({error: 'Invalid tutorial upload path'}, {status: 400});

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
    tutorial_video_url: tutorialStoragePath ? null : tutorialVideoUrl,
    tutorial_video_storage_path: tutorialStoragePath,
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
  const tutorialVideoUrl = optionalVideoUrl(body.tutorial_video_url);
  const tutorialStoragePath = optionalTutorialPath(body.tutorial_video_storage_path);
  if (body.tutorial_video_url !== undefined && tutorialVideoUrl === undefined) {
    return NextResponse.json({error: 'Tutorial video link must be a valid HTTPS URL'}, {status: 400});
  }
  if (body.tutorial_video_storage_path !== undefined && tutorialStoragePath === undefined) {
    return NextResponse.json({error: 'Invalid tutorial upload path'}, {status: 400});
  }
  const brokers = await readBrokers();
  const index = brokers.findIndex(b => b.id === body.id);
  if (index < 0) return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
  const current = brokers[index];
  const nextStoragePath = body.tutorial_video_storage_path !== undefined
    ? tutorialStoragePath
    : current.tutorial_video_storage_path ?? null;
  const nextVideoUrl = nextStoragePath
    ? null
    : body.tutorial_video_url !== undefined
      ? tutorialVideoUrl
      : current.tutorial_video_url ?? null;
  brokers[index] = {
    ...current,
    ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
    ...(body.referral_link !== undefined ? { referral_link: String(body.referral_link).trim() } : {}),
    ...(body.min_deposit !== undefined ? { min_deposit: Math.max(0, Number(body.min_deposit) || 0) } : {}),
    ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
    ...(body.sort_order !== undefined ? { sort_order: Number(body.sort_order) || 0 } : {}),
    tutorial_video_url: nextVideoUrl,
    tutorial_video_storage_path: nextStoragePath,
  };
  const { error } = await writeBrokers(brokers, session.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (
    current.tutorial_video_storage_path &&
    current.tutorial_video_storage_path !== nextStoragePath
  ) {
    await removeCourseMedia(current.tutorial_video_storage_path);
  }
  return NextResponse.json(await withPlayback(brokers[index]));
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
  const removed = brokers.find(broker => broker.id === id);
  if (removed?.tutorial_video_storage_path) {
    await removeCourseMedia(removed.tutorial_video_storage_path);
  }
  return NextResponse.json({ success: true });
}

// src/app/api/admin/setup-storage/route.ts
//
// One-time setup route: creates the Storage buckets this app depends on.
// SQL migrations cannot create Storage buckets — they're a separate Supabase
// subsystem. This route lets an admin trigger bucket creation from the app
// itself instead of needing manual dashboard steps.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const REQUIRED_BUCKETS = [
  { id: 'avatars',       public: true, fileSizeLimit: 5  * 1024 * 1024 }, // 5MB
  { id: 'course-assets', public: true, fileSizeLimit: 10 * 1024 * 1024 }, // 10MB
  { id: 'support-attachments', public: false, fileSizeLimit: 10 * 1024 * 1024 }, // 10MB, signed links only
  { id: 'course-media', public: false, fileSizeLimit: 50 * 1024 * 1024 }, // Supabase default project cap
];

export async function POST(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const results: Record<string, string> = {};

  for (const bucket of REQUIRED_BUCKETS) {
    const { data: existing } = await supabaseAdmin.storage.getBucket(bucket.id);
    if (existing) {
      results[bucket.id] = 'already exists';
      continue;
    }
    const { error } = await supabaseAdmin.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
    });
    results[bucket.id] = error ? `error: ${error.message}` : 'created';
  }

  return NextResponse.json({ results });
}

// GET — check current status without creating anything
export async function GET(req: NextRequest) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const status = REQUIRED_BUCKETS.map(b => ({
    id: b.id,
    exists: buckets?.some(existing => existing.id === b.id) ?? false,
  }));

  return NextResponse.json({ buckets: status });
}

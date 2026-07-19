import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const form = await req.formData();
  const file = form.get('file');
  const assetType = form.get('assetType');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'An image file is required' }, { status: 400 });
  }
  if (assetType !== 'course-logo' && assetType !== 'course-cover') {
    return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
  }
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP, and GIF images are allowed' }, { status: 415 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Image must be smaller than 10 MB' }, { status: 413 });
  }

  const folder = assetType === 'course-logo' ? 'logos' : 'covers';
  const path = `courses/${folder}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from('course-assets')
    .upload(path, bytes, { contentType: file.type, cacheControl: '31536000', upsert: false });

  if (error) return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });

  const { data } = supabaseAdmin.storage.from('course-assets').getPublicUrl(path);
  return NextResponse.json({ path, publicUrl: data.publicUrl }, { status: 201 });
}

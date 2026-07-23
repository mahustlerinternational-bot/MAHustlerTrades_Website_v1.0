import {NextRequest, NextResponse} from 'next/server';

import {requireAdminSession, supabaseAdmin} from '@/lib/supabase/server';
import {
  cleanVaultFileName,
  ensureEliteVaultBucket,
  ELITE_VAULT_BUCKET,
  MAX_VAULT_FILE_SIZE,
  vaultStoragePath,
} from '@/lib/vault/access';

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  try {
    const body = await req.json();
    const fileName = cleanVaultFileName(body.file_name);
    const fileSize = Number(body.file_size);
    const contentType = String(body.content_type ?? 'application/octet-stream').slice(0, 150);
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_VAULT_FILE_SIZE) {
      return NextResponse.json(
        {error: 'Vault files must be larger than 0 bytes and no more than 50 MB'},
        {status: 413},
      );
    }
    await ensureEliteVaultBucket();
    const path = vaultStoragePath(fileName);
    const {data, error} = await supabaseAdmin.storage
      .from(ELITE_VAULT_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? 'Could not prepare upload');
    return NextResponse.json({
      bucket: ELITE_VAULT_BUCKET,
      path,
      token: data.token,
      file_name: fileName,
      file_size: fileSize,
      mime_type: contentType,
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Could not prepare upload'},
      {status: 400},
    );
  }
}


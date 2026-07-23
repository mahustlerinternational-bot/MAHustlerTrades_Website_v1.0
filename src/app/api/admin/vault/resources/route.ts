import {NextRequest, NextResponse} from 'next/server';

import {requireAdminSession, supabaseAdmin} from '@/lib/supabase/server';
import {
  cleanVaultFileName,
  cleanVaultTags,
  cleanVaultText,
  ELITE_VAULT_BUCKET,
  isSafeExternalUrl,
  MAX_VAULT_FILE_SIZE,
} from '@/lib/vault/access';

export const dynamic = 'force-dynamic';

function validStoragePath(path: string) {
  return path.startsWith('resources/') && !path.includes('..') && path.length <= 500;
}

async function storageObjectExists(path: string) {
  if (!validStoragePath(path)) return false;
  const lastSlash = path.lastIndexOf('/');
  const directory = path.slice(0, lastSlash);
  const fileName = path.slice(lastSlash + 1);
  const {data, error} = await supabaseAdmin.storage
    .from(ELITE_VAULT_BUCKET)
    .list(directory, {limit: 100, search: fileName});
  return !error && Boolean(data?.some(item => item.name === fileName));
}

async function folderExists(id: string | null) {
  if (!id) return true;
  const {data} = await supabaseAdmin.from('vault_folders').select('id').eq('id', id).maybeSingle();
  return Boolean(data);
}

function basePatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if (body.folder_id !== undefined) patch.folder_id = body.folder_id ? String(body.folder_id) : null;
  if (body.title !== undefined) patch.title = cleanVaultText(body.title, 160);
  if (body.description !== undefined) patch.description = cleanVaultText(body.description, 2000) || null;
  if (body.version !== undefined) patch.version = cleanVaultText(body.version, 40) || null;
  if (body.tags !== undefined) patch.tags = cleanVaultTags(body.tags);
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
  if (body.is_featured !== undefined) patch.is_featured = Boolean(body.is_featured);
  if (body.is_published !== undefined) patch.is_published = Boolean(body.is_published);
  return patch;
}

async function sourcePatch(body: Record<string, unknown>, type: 'file' | 'link') {
  if (type === 'link') {
    if (!isSafeExternalUrl(body.external_url)) throw new Error('A valid HTTPS resource link is required');
    return {
      resource_type: 'link',
      external_url: String(body.external_url).trim(),
      storage_path: null,
      file_name: null,
      mime_type: null,
      file_size: null,
    };
  }
  const storagePath = String(body.storage_path ?? '');
  const fileName = cleanVaultFileName(body.file_name);
  const fileSize = Number(body.file_size);
  if (!validStoragePath(storagePath) || !(await storageObjectExists(storagePath))) {
    throw new Error('The uploaded Vault file could not be verified');
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_VAULT_FILE_SIZE) {
    throw new Error('Vault files must be no more than 50 MB');
  }
  return {
    resource_type: 'file',
    storage_path: storagePath,
    external_url: null,
    file_name: fileName,
    mime_type: cleanVaultText(body.mime_type, 150) || 'application/octet-stream',
    file_size: fileSize,
  };
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {data, error} = await supabaseAdmin
    .from('vault_resources')
    .select('*')
    .order('sort_order')
    .order('title');
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  try {
    const body = await req.json() as Record<string, unknown>;
    const type = body.resource_type === 'link' ? 'link' : 'file';
    const title = cleanVaultText(body.title, 160);
    const folderId = body.folder_id ? String(body.folder_id) : null;
    if (!title) return NextResponse.json({error: 'Resource title is required'}, {status: 400});
    if (!(await folderExists(folderId))) {
      return NextResponse.json({error: 'Selected folder was not found'}, {status: 400});
    }
    const source = await sourcePatch(body, type);
    const {data, error} = await supabaseAdmin
      .from('vault_resources')
      .insert({
        ...basePatch(body),
        ...source,
        folder_id: folderId,
        title,
        created_by: session.userId,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, {status: 201});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Resource could not be created'},
      {status: 400},
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({error: 'Resource id is required'}, {status: 400});
    const {data: current} = await supabaseAdmin
      .from('vault_resources')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!current) return NextResponse.json({error: 'Resource not found'}, {status: 404});
    if (body.folder_id !== undefined && !(await folderExists(body.folder_id ? String(body.folder_id) : null))) {
      return NextResponse.json({error: 'Selected folder was not found'}, {status: 400});
    }
    const patch = basePatch(body);
    if (patch.title === '') return NextResponse.json({error: 'Resource title is required'}, {status: 400});
    const requestedType = body.resource_type === 'file' || body.resource_type === 'link'
      ? body.resource_type
      : current.resource_type;
    const sourceChanged =
      body.resource_type !== undefined ||
      body.storage_path !== undefined ||
      body.external_url !== undefined;
    if (sourceChanged) Object.assign(patch, await sourcePatch(body, requestedType));
    const {data, error} = await supabaseAdmin
      .from('vault_resources')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (
      current.resource_type === 'file' &&
      current.storage_path &&
      data.storage_path !== current.storage_path
    ) {
      await supabaseAdmin.storage.from(ELITE_VAULT_BUCKET).remove([current.storage_path]);
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Resource could not be updated'},
      {status: 400},
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({error: 'Resource id is required'}, {status: 400});
  const {data, error} = await supabaseAdmin
    .from('vault_resources')
    .delete()
    .eq('id', id)
    .select('id,resource_type,storage_path')
    .maybeSingle();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (!data) return NextResponse.json({error: 'Resource not found'}, {status: 404});
  if (data.resource_type === 'file' && data.storage_path) {
    await supabaseAdmin.storage.from(ELITE_VAULT_BUCKET).remove([data.storage_path]);
  }
  return NextResponse.json({success: true});
}


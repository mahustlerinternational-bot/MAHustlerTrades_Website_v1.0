import {NextRequest, NextResponse} from 'next/server';

import {requireAdminSession, supabaseAdmin} from '@/lib/supabase/server';
import {cleanVaultText} from '@/lib/vault/access';

export const dynamic = 'force-dynamic';

async function folderExists(id: string | null) {
  if (!id) return true;
  const {data} = await supabaseAdmin.from('vault_folders').select('id').eq('id', id).maybeSingle();
  return Boolean(data);
}

async function wouldCreateCycle(id: string, parentId: string | null) {
  let current = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === id || visited.has(current)) return true;
    visited.add(current);
    const {data} = await supabaseAdmin
      .from('vault_folders')
      .select('parent_id')
      .eq('id', current)
      .maybeSingle();
    current = data?.parent_id ?? null;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {data, error} = await supabaseAdmin
    .from('vault_folders')
    .select('*')
    .order('sort_order')
    .order('name');
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const body = await req.json();
  const name = cleanVaultText(body.name, 100);
  const parentId = body.parent_id ? String(body.parent_id) : null;
  if (!name) return NextResponse.json({error: 'Folder name is required'}, {status: 400});
  if (!(await folderExists(parentId))) {
    return NextResponse.json({error: 'Parent folder was not found'}, {status: 400});
  }
  const {data, error} = await supabaseAdmin
    .from('vault_folders')
    .insert({
      parent_id: parentId,
      name,
      description: cleanVaultText(body.description, 500) || null,
      icon: cleanVaultText(body.icon, 40) || 'folder',
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      is_published: body.is_published === true,
      created_by: session.userId,
    })
    .select('*')
    .single();
  if (error) {
    const duplicate = error.code === '23505';
    return NextResponse.json(
      {error: duplicate ? 'A folder with this name already exists here' : error.message},
      {status: duplicate ? 409 : 500},
    );
  }
  return NextResponse.json(data, {status: 201});
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const body = await req.json();
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({error: 'Folder id is required'}, {status: 400});
  const parentId = body.parent_id === undefined
    ? undefined
    : body.parent_id
      ? String(body.parent_id)
      : null;
  if (parentId !== undefined && !(await folderExists(parentId))) {
    return NextResponse.json({error: 'Parent folder was not found'}, {status: 400});
  }
  if (parentId !== undefined && await wouldCreateCycle(id, parentId)) {
    return NextResponse.json({error: 'A folder cannot be moved inside itself or its descendants'}, {status: 400});
  }
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = cleanVaultText(body.name, 100);
    if (!name) return NextResponse.json({error: 'Folder name is required'}, {status: 400});
    patch.name = name;
  }
  if (body.parent_id !== undefined) patch.parent_id = parentId;
  if (body.description !== undefined) patch.description = cleanVaultText(body.description, 500) || null;
  if (body.icon !== undefined) patch.icon = cleanVaultText(body.icon, 40) || 'folder';
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
  if (body.is_published !== undefined) patch.is_published = Boolean(body.is_published);
  const {data, error} = await supabaseAdmin
    .from('vault_folders')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) {
    const duplicate = error.code === '23505';
    return NextResponse.json(
      {error: duplicate ? 'A folder with this name already exists here' : error.message},
      {status: duplicate ? 409 : 500},
    );
  }
  if (!data) return NextResponse.json({error: 'Folder not found'}, {status: 404});
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({error: 'Folder id is required'}, {status: 400});
  const [children, resources] = await Promise.all([
    supabaseAdmin.from('vault_folders').select('id', {count: 'exact', head: true}).eq('parent_id', id),
    supabaseAdmin.from('vault_resources').select('id', {count: 'exact', head: true}).eq('folder_id', id),
  ]);
  if ((children.count ?? 0) > 0 || (resources.count ?? 0) > 0) {
    return NextResponse.json(
      {error: 'Move or delete this folder’s subfolders and resources first'},
      {status: 409},
    );
  }
  const {data, error} = await supabaseAdmin
    .from('vault_folders')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (!data) return NextResponse.json({error: 'Folder not found'}, {status: 404});
  return NextResponse.json({success: true});
}


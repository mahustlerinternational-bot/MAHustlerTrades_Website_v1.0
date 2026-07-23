import {NextRequest, NextResponse} from 'next/server';

import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';
import {
  ELITE_VAULT_BUCKET,
  getEliteVaultAccess,
  isSafeExternalUrl,
} from '@/lib/vault/access';

async function folderIsVisible(id: string | null) {
  let current = id;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current)) return false;
    visited.add(current);
    const {data} = await supabaseAdmin
      .from('vault_folders')
      .select('parent_id,is_published')
      .eq('id', current)
      .maybeSingle();
    if (!data?.is_published) return false;
    current = data.parent_id;
  }
  return true;
}

export async function GET(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const access = await getEliteVaultAccess(session.userId);
  if (!access.allowed) return NextResponse.json({error: 'Elite Vault access required'}, {status: 403});
  const {id} = await params;
  const {data: resource, error} = await supabaseAdmin
    .from('vault_resources')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (!resource || !(await folderIsVisible(resource.folder_id))) {
    return NextResponse.json({error: 'Resource not found'}, {status: 404});
  }
  await supabaseAdmin.rpc('increment_vault_download', {p_resource_id: resource.id});
  if (resource.resource_type === 'link') {
    if (!isSafeExternalUrl(resource.external_url)) {
      return NextResponse.json({error: 'Resource link is unavailable'}, {status: 410});
    }
    if (new URL(req.url).searchParams.get('json') === '1') {
      return NextResponse.json({url: resource.external_url, resource_type: 'link'});
    }
    return NextResponse.redirect(resource.external_url, 307);
  }
  if (!resource.storage_path) {
    return NextResponse.json({error: 'Resource file is unavailable'}, {status: 410});
  }
  const {data, error: signError} = await supabaseAdmin.storage
    .from(ELITE_VAULT_BUCKET)
    .createSignedUrl(resource.storage_path, 60, {
      download: resource.file_name || 'elite-vault-resource',
    });
  if (signError || !data?.signedUrl) {
    return NextResponse.json({error: signError?.message ?? 'Download is unavailable'}, {status: 500});
  }
  if (new URL(req.url).searchParams.get('json') === '1') {
    return NextResponse.json({url: data.signedUrl, resource_type: 'file'});
  }
  return NextResponse.redirect(data.signedUrl, 307);
}

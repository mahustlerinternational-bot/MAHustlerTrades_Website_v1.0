import {NextRequest, NextResponse} from 'next/server';

import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';
import {getEliteVaultAccess} from '@/lib/vault/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const access = await getEliteVaultAccess(session.userId);
  if (!access.allowed) {
    return NextResponse.json(
      {error: 'Elite Vault requires an active membership or approved Elite access'},
      {status: 403},
    );
  }
  const [folderResult, resourceResult] = await Promise.all([
    supabaseAdmin
      .from('vault_folders')
      .select('*')
      .eq('is_published', true)
      .order('sort_order')
      .order('name'),
    supabaseAdmin
      .from('vault_resources')
      .select('id,folder_id,resource_type,title,description,file_name,mime_type,file_size,version,tags,sort_order,is_featured,is_published,download_count,created_at,updated_at')
      .eq('is_published', true)
      .order('sort_order')
      .order('title'),
  ]);
  if (folderResult.error || resourceResult.error) {
    return NextResponse.json(
      {error: folderResult.error?.message ?? resourceResult.error?.message},
      {status: 500},
    );
  }
  const publishedFolders = folderResult.data ?? [];
  const byId = new Map(publishedFolders.map(folder => [folder.id, folder]));
  const folderIsVisible = (folder: (typeof publishedFolders)[number]) => {
    let current = folder;
    const visited = new Set<string>();
    while (current.parent_id) {
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      const parent = byId.get(current.parent_id);
      if (!parent) return false;
      current = parent;
    }
    return true;
  };
  const folders = publishedFolders.filter(folderIsVisible);
  const visibleIds = new Set(folders.map(folder => folder.id));
  const resources = (resourceResult.data ?? []).filter(
    resource => !resource.folder_id || visibleIds.has(resource.folder_id),
  );
  return NextResponse.json({
    folders,
    resources,
    access: access.role === 'admin' ? 'admin' : 'elite',
  });
}

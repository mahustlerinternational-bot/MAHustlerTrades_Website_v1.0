import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const ELITE_VAULT_BUCKET = 'elite-vault';
export const MAX_VAULT_FILE_SIZE = 50 * 1024 * 1024;

export async function getEliteVaultAccess(userId: string) {
  const {data, error} = await supabaseAdmin
    .from('profiles')
    .select('role,package_id,ib_status')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return {allowed: false, role: 'member'};
  return {
    allowed:
      data.role === 'admin' ||
      data.ib_status === 'active' ||
      Boolean(data.package_id),
    role: String(data.role ?? 'member'),
  };
}

export async function ensureEliteVaultBucket() {
  const options = {
    public: false,
    fileSizeLimit: MAX_VAULT_FILE_SIZE,
  };
  const {data} = await supabaseAdmin.storage.getBucket(ELITE_VAULT_BUCKET);
  if (data) {
    const {error} = await supabaseAdmin.storage.updateBucket(ELITE_VAULT_BUCKET, options);
    if (error) throw new Error(error.message);
    return;
  }
  const {error} = await supabaseAdmin.storage.createBucket(ELITE_VAULT_BUCKET, options);
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export function isSafeExternalUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' ||
      (process.env.NODE_ENV !== 'production' && url.protocol === 'http:');
  } catch {
    return false;
  }
}

export function cleanVaultFileName(value: unknown) {
  const clean = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .trim();
  return (clean || 'vault-resource').slice(0, 180);
}

export function cleanVaultText(value: unknown, maximum: number) {
  return String(value ?? '').trim().slice(0, maximum);
}

export function cleanVaultTags(value: unknown) {
  const tags = Array.isArray(value)
    ? value
    : String(value ?? '').split(',');
  return [...new Set(tags.map(tag => cleanVaultText(tag, 30)).filter(Boolean))].slice(0, 12);
}

export function vaultStoragePath(fileName: string) {
  const month = new Date().toISOString().slice(0, 7);
  const normalized = cleanVaultFileName(fileName)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-100) || 'resource';
  return `resources/${month}/${crypto.randomUUID()}-${normalized}`;
}


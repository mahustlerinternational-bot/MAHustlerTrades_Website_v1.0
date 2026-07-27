import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const ELITE_ACCESS_ERROR =
  'This workspace requires an active membership or approved Elite access';

type PackageReference = {is_active?: boolean | null} | {is_active?: boolean | null}[] | null;

export async function hasEliteAccess(userId: string) {
  const {data, error} = await supabaseAdmin
    .from('profiles')
    .select('role,ib_status,package:packages(is_active)')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return false;
  const packageReference = data.package as PackageReference;
  const packageIsActive = Array.isArray(packageReference)
    ? packageReference.some(item => item?.is_active === true)
    : packageReference?.is_active === true;

  return data.role === 'admin' || data.ib_status === 'active' || packageIsActive;
}

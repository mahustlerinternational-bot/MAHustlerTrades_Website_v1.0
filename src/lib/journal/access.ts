import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const TRADING_JOURNAL_ACCESS_ERROR =
  'My Trading Journal requires an active membership or approved Elite access';

export async function hasTradingJournalAccess(userId: string) {
  const {data, error} = await supabaseAdmin
    .from('profiles')
    .select('role,package_id,ib_status')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return (
    data.role === 'admin' ||
    data.ib_status === 'active' ||
    Boolean(data.package_id)
  );
}

import 'server-only';

import {hasEliteAccess} from '@/lib/access/elite';

export const TRADING_JOURNAL_ACCESS_ERROR =
  'My Trading Journal requires an active membership or approved Elite access';

export async function hasTradingJournalAccess(userId: string) {
  return hasEliteAccess(userId);
}

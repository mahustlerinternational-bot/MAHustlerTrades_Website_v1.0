import {NextRequest, NextResponse} from 'next/server';

import {ELITE_ACCESS_ERROR, hasEliteAccess} from '@/lib/access/elite';
import {parseCalendarFeed} from '@/lib/market-tools/calendar';
import {requireAuthSession} from '@/lib/supabase/server';

const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!(await hasEliteAccess(session.userId))) {
    return NextResponse.json({error: ELITE_ACCESS_ERROR}, {status: 403});
  }

  try {
    const response = await fetch(CALENDAR_URL, {
      headers: {'accept': 'application/json', 'user-agent': 'MAHustlerTrades-EliteTools/1.0'},
      next: {revalidate: 300},
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Calendar source returned ${response.status}`);
    const events = parseCalendarFeed(await response.json());
    return NextResponse.json({
      events,
      fetchedAt: new Date().toISOString(),
      source: 'Forex Factory weekly calendar export',
      sourceUrl: 'https://www.forexfactory.com/calendar',
      limitations: 'The weekly export may not include live Actual values. Verify releases at the cited source.',
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Economic calendar could not be loaded',
    }, {status: 502});
  }
}

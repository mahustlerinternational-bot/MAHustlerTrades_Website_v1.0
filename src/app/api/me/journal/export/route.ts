import {NextRequest, NextResponse} from 'next/server';

import {journalTradesToCsv} from '@/lib/journal/csv';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';
import type {JournalTrade} from '@/types/journal';

export async function GET(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {data, error} = await supabaseAdmin
    .from('trading_journal_trades')
    .select('*')
    .eq('user_id', session.userId)
    .order('opened_at');
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  const csv = journalTradesToCsv((data ?? []).map(trade => ({...trade, screenshots: []})) as JournalTrade[]);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mahustler-trading-journal-${stamp}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}


import {NextRequest, NextResponse} from 'next/server';

import {journalCsvToObjects} from '@/lib/journal/csv';
import {hasTradingJournalAccess, TRADING_JOURNAL_ACCESS_ERROR} from '@/lib/journal/access';
import {journalValidationMessage, parseJournalTrade} from '@/lib/journal/validation';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

const MAX_CSV_SIZE = 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

export async function POST(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!(await hasTradingJournalAccess(session.userId))) {
    return NextResponse.json({error: TRADING_JOURNAL_ACCESS_ERROR}, {status: 403});
  }
  try {
    const body = await req.json();
    const csv = String(body.csv ?? '');
    if (!csv.trim()) return NextResponse.json({error: 'CSV file is empty'}, {status: 400});
    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_SIZE) {
      return NextResponse.json({error: 'CSV import must be no more than 1 MB'}, {status: 413});
    }
    const rows = journalCsvToObjects(csv);
    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({error: `CSV import is limited to ${MAX_IMPORT_ROWS} trades at a time`}, {status: 413});
    }
    const trades = rows.map((row, index) => {
      try {
        return {...parseJournalTrade(row), user_id: session.userId, source: 'csv'};
      } catch (error) {
        throw new Error(`Row ${index + 2}: ${journalValidationMessage(error)}`);
      }
    });
    const {data, error} = await supabaseAdmin
      .from('trading_journal_trades')
      .insert(trades)
      .select('id');
    if (error) {
      if (error.code === '23505') throw new Error('CSV contains an external_ref that already exists in your journal');
      throw new Error(error.message);
    }
    return NextResponse.json({imported: data?.length ?? trades.length}, {status: 201});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'CSV could not be imported'},
      {status: 400},
    );
  }
}

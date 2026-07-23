import {NextRequest, NextResponse} from 'next/server';

import {JOURNAL_SCREENSHOT_BUCKET} from '@/lib/journal/storage';
import {journalValidationMessage, parseJournalTrade} from '@/lib/journal/validation';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function journalPayload(userId: string) {
  const [tradeResult, screenshotResult] = await Promise.all([
    supabaseAdmin
      .from('trading_journal_trades')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', {ascending: false})
      .limit(5000),
    supabaseAdmin
      .from('trading_journal_screenshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at'),
  ]);
  if (tradeResult.error || screenshotResult.error) {
    throw new Error(tradeResult.error?.message ?? screenshotResult.error?.message);
  }
  const screenshots = screenshotResult.data ?? [];
  const paths = screenshots.map(item => item.storage_path);
  const signed = paths.length
    ? await supabaseAdmin.storage.from(JOURNAL_SCREENSHOT_BUCKET).createSignedUrls(paths, 60 * 60)
    : {data: [], error: null};
  const urls = new Map<string, string>();
  signed.data?.forEach((item, index) => {
    if (item.signedUrl) urls.set(paths[index], item.signedUrl);
  });
  const byTrade = new Map<string, Record<string, unknown>[]>();
  for (const screenshot of screenshots) {
    const safe = {
      id: screenshot.id,
      trade_id: screenshot.trade_id,
      file_name: screenshot.file_name,
      mime_type: screenshot.mime_type,
      file_size: screenshot.file_size,
      created_at: screenshot.created_at,
      url: urls.get(screenshot.storage_path),
    };
    byTrade.set(screenshot.trade_id, [...(byTrade.get(screenshot.trade_id) ?? []), safe]);
  }
  return (tradeResult.data ?? []).map(trade => ({
    ...trade,
    screenshots: byTrade.get(trade.id) ?? [],
  }));
}

export async function GET(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  try {
    return NextResponse.json({trades: await journalPayload(session.userId)});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Trading journal could not be loaded'},
      {status: 500},
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  try {
    const trade = parseJournalTrade(await req.json());
    const {data, error} = await supabaseAdmin
      .from('trading_journal_trades')
      .insert({...trade, user_id: session.userId, source: 'manual'})
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({...data, screenshots: []}, {status: 201});
  } catch (error) {
    return NextResponse.json({error: journalValidationMessage(error)}, {status: 400});
  }
}


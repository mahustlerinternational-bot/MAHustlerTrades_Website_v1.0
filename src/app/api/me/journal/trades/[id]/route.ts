import {NextRequest, NextResponse} from 'next/server';

import {JOURNAL_SCREENSHOT_BUCKET} from '@/lib/journal/storage';
import {journalValidationMessage, parseJournalTrade} from '@/lib/journal/validation';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  try {
    const {id} = await params;
    const trade = parseJournalTrade(await req.json());
    const {data, error} = await supabaseAdmin
      .from('trading_journal_trades')
      .update(trade)
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({error: 'Trade not found'}, {status: 404});
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({error: journalValidationMessage(error)}, {status: 400});
  }
}

export async function DELETE(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await params;
  const {data: trade} = await supabaseAdmin
    .from('trading_journal_trades')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle();
  if (!trade) return NextResponse.json({error: 'Trade not found'}, {status: 404});
  const {data: screenshots} = await supabaseAdmin
    .from('trading_journal_screenshots')
    .select('storage_path')
    .eq('trade_id', id)
    .eq('user_id', session.userId);
  const {error} = await supabaseAdmin
    .from('trading_journal_trades')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  const paths = (screenshots ?? []).map(item => item.storage_path);
  if (paths.length) await supabaseAdmin.storage.from(JOURNAL_SCREENSHOT_BUCKET).remove(paths);
  return NextResponse.json({ok: true});
}


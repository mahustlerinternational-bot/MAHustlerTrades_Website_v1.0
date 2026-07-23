import {NextRequest, NextResponse} from 'next/server';

import {JOURNAL_SCREENSHOT_BUCKET} from '@/lib/journal/storage';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export async function DELETE(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await params;
  const {data} = await supabaseAdmin
    .from('trading_journal_screenshots')
    .select('id,storage_path')
    .eq('id', id)
    .eq('user_id', session.userId)
    .maybeSingle();
  if (!data) return NextResponse.json({error: 'Screenshot not found'}, {status: 404});
  const {error} = await supabaseAdmin
    .from('trading_journal_screenshots')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  await supabaseAdmin.storage.from(JOURNAL_SCREENSHOT_BUCKET).remove([data.storage_path]);
  return NextResponse.json({ok: true});
}


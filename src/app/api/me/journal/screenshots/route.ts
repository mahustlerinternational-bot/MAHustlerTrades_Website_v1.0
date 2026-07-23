import {NextRequest, NextResponse} from 'next/server';

import {
  cleanJournalFileName,
  ensureJournalScreenshotBucket,
  JOURNAL_SCREENSHOT_BUCKET,
  JOURNAL_SCREENSHOT_TYPES,
  journalScreenshotPath,
  MAX_JOURNAL_SCREENSHOT_SIZE,
} from '@/lib/journal/storage';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

async function ownsTrade(userId: string, tradeId: string) {
  const {data} = await supabaseAdmin
    .from('trading_journal_trades')
    .select('id')
    .eq('id', tradeId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(req: NextRequest) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  try {
    const body = await req.json();
    const action = String(body.action ?? 'prepare');
    const tradeId = String(body.trade_id ?? '');
    if (!tradeId || !(await ownsTrade(session.userId, tradeId))) {
      return NextResponse.json({error: 'Trade not found'}, {status: 404});
    }
    await ensureJournalScreenshotBucket();

    if (action === 'prepare') {
      const fileName = cleanJournalFileName(body.file_name);
      const fileSize = Number(body.file_size);
      const mimeType = String(body.mime_type ?? '').toLowerCase();
      if (!JOURNAL_SCREENSHOT_TYPES.has(mimeType)) {
        return NextResponse.json({error: 'Screenshots must be JPG, PNG, WEBP or GIF images'}, {status: 415});
      }
      if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_JOURNAL_SCREENSHOT_SIZE) {
        return NextResponse.json({error: 'Each screenshot must be no more than 5 MB'}, {status: 413});
      }
      const path = journalScreenshotPath(session.userId, tradeId, fileName);
      const {data, error} = await supabaseAdmin.storage
        .from(JOURNAL_SCREENSHOT_BUCKET)
        .createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? 'Could not prepare screenshot upload');
      return NextResponse.json({
        bucket: JOURNAL_SCREENSHOT_BUCKET,
        path,
        token: data.token,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
      });
    }

    if (action === 'confirm') {
      const path = String(body.path ?? '');
      const expectedPrefix = `${session.userId}/${tradeId}/`;
      if (!path.startsWith(expectedPrefix) || path.includes('..')) {
        return NextResponse.json({error: 'Invalid screenshot path'}, {status: 400});
      }
      const fileName = cleanJournalFileName(body.file_name);
      const fileSize = Number(body.file_size);
      const mimeType = String(body.mime_type ?? '').toLowerCase();
      if (!JOURNAL_SCREENSHOT_TYPES.has(mimeType) || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_JOURNAL_SCREENSHOT_SIZE) {
        return NextResponse.json({error: 'Invalid screenshot metadata'}, {status: 400});
      }
      const objectName = path.split('/').pop()!;
      const folder = path.slice(0, -(objectName.length + 1));
      const {data: objects, error: listError} = await supabaseAdmin.storage
        .from(JOURNAL_SCREENSHOT_BUCKET)
        .list(folder, {search: objectName, limit: 10});
      if (listError || !objects?.some(item => item.name === objectName)) {
        return NextResponse.json({error: 'Uploaded screenshot could not be verified'}, {status: 400});
      }
      const {data, error} = await supabaseAdmin
        .from('trading_journal_screenshots')
        .insert({
          trade_id: tradeId,
          user_id: session.userId,
          storage_path: path,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
        })
        .select('id,trade_id,file_name,mime_type,file_size,created_at')
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json(data, {status: 201});
    }

    return NextResponse.json({error: 'Unsupported screenshot action'}, {status: 400});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Screenshot operation failed'},
      {status: 400},
    );
  }
}


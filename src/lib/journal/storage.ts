import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const JOURNAL_SCREENSHOT_BUCKET = 'journal-screenshots';
export const MAX_JOURNAL_SCREENSHOT_SIZE = 5 * 1024 * 1024;
export const JOURNAL_SCREENSHOT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export async function ensureJournalScreenshotBucket() {
  const options = {
    public: false,
    fileSizeLimit: MAX_JOURNAL_SCREENSHOT_SIZE,
    allowedMimeTypes: [...JOURNAL_SCREENSHOT_TYPES],
  };
  const {data} = await supabaseAdmin.storage.getBucket(JOURNAL_SCREENSHOT_BUCKET);
  if (data) {
    const {error} = await supabaseAdmin.storage.updateBucket(JOURNAL_SCREENSHOT_BUCKET, options);
    if (error) throw new Error(error.message);
    return;
  }
  const {error} = await supabaseAdmin.storage.createBucket(JOURNAL_SCREENSHOT_BUCKET, options);
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export function cleanJournalFileName(value: unknown) {
  return (String(value ?? 'trade-screenshot')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .trim() || 'trade-screenshot').slice(0, 180);
}

export function journalScreenshotPath(userId: string, tradeId: string, fileName: string) {
  const extension = fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)?.[1] ?? 'jpg';
  return `${userId}/${tradeId}/${crypto.randomUUID()}.${extension}`;
}


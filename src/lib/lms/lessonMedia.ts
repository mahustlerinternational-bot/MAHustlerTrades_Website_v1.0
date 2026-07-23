import type {LessonMedia} from '@/types/lms';

export function lessonMediaFromValue(
  value: unknown,
  legacyVideoUrl: unknown = null,
  legacyVideoStoragePath: unknown = null,
): LessonMedia | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const media = value as Record<string, unknown>;
    const type = String(media.type ?? '');
    const url = String(media.url ?? '').trim() || null;
    const storagePath = String(media.storage_path ?? '').trim() || null;
    if ((type === 'video' || type === 'image') && (url || storagePath)) {
      return {type, url: storagePath ? null : url, storage_path: storagePath};
    }
  }
  const storagePath = String(legacyVideoStoragePath ?? '').trim() || null;
  const url = String(legacyVideoUrl ?? '').trim() || null;
  return storagePath || url
    ? {type: 'video', url: storagePath ? null : url, storage_path: storagePath}
    : null;
}

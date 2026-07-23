-- Independent lesson introduction/outro media. Existing lesson videos are
-- preserved as introduction media for backward compatibility.

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS intro_media JSONB,
  ADD COLUMN IF NOT EXISTS outro_media JSONB;

UPDATE public.course_lessons
SET intro_media = jsonb_build_object(
  'type', 'video',
  'url', video_url,
  'storage_path', video_storage_path
)
WHERE intro_media IS NULL
  AND (video_url IS NOT NULL OR video_storage_path IS NOT NULL);

ALTER TABLE public.course_lessons
  DROP CONSTRAINT IF EXISTS course_lessons_intro_media_shape;
ALTER TABLE public.course_lessons
  ADD CONSTRAINT course_lessons_intro_media_shape CHECK (
    intro_media IS NULL OR (
      jsonb_typeof(intro_media) = 'object'
      AND intro_media->>'type' IN ('video','image')
      AND (
        NULLIF(intro_media->>'url','') IS NOT NULL
        OR NULLIF(intro_media->>'storage_path','') IS NOT NULL
      )
    )
  );

ALTER TABLE public.course_lessons
  DROP CONSTRAINT IF EXISTS course_lessons_outro_media_shape;
ALTER TABLE public.course_lessons
  ADD CONSTRAINT course_lessons_outro_media_shape CHECK (
    outro_media IS NULL OR (
      jsonb_typeof(outro_media) = 'object'
      AND outro_media->>'type' IN ('video','image')
      AND (
        NULLIF(outro_media->>'url','') IS NOT NULL
        OR NULLIF(outro_media->>'storage_path','') IS NOT NULL
      )
    )
  );

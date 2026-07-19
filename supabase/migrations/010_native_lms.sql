-- Native LMS extensions for the existing courses, modules, lessons and enrollments.

ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.course_lessons
  DROP CONSTRAINT IF EXISTS course_lessons_duration_nonnegative;
ALTER TABLE public.course_lessons
  ADD CONSTRAINT course_lessons_duration_nonnegative
  CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id        UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  progress_seconds INT NOT NULL DEFAULT 0 CHECK (progress_seconds >= 0),
  last_viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id,lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_sort ON public.course_modules(course_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module_sort ON public.course_lessons(module_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id,last_viewed_at DESC);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Draft lessons must never be returned to members through the direct database API.
DROP POLICY IF EXISTS "Preview or enrolled lessons" ON public.course_lessons;
CREATE POLICY "Preview or enrolled lessons" ON public.course_lessons FOR SELECT
  USING (
    is_admin() OR (
      is_published=TRUE AND (
        is_preview=TRUE OR EXISTS (
          SELECT 1 FROM public.enrollments e
          JOIN public.course_modules cm ON cm.id=module_id
          WHERE e.course_id=cm.course_id
            AND e.user_id=auth.uid()
            AND e.status='active'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users read own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users read own lesson progress" ON public.lesson_progress FOR SELECT
  USING (user_id=auth.uid());
DROP POLICY IF EXISTS "Users insert own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users insert own lesson progress" ON public.lesson_progress FOR INSERT
  WITH CHECK (
    user_id=auth.uid() AND EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_modules m ON m.id=l.module_id
      JOIN public.enrollments e ON e.course_id=m.course_id
      WHERE l.id=lesson_id AND e.user_id=auth.uid() AND e.status='active'
    )
  );
DROP POLICY IF EXISTS "Users update own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users update own lesson progress" ON public.lesson_progress FOR UPDATE
  USING (user_id=auth.uid()) WITH CHECK (
    user_id=auth.uid() AND EXISTS (
      SELECT 1 FROM public.course_lessons l
      JOIN public.course_modules m ON m.id=l.module_id
      JOIN public.enrollments e ON e.course_id=m.course_id
      WHERE l.id=lesson_id AND e.user_id=auth.uid() AND e.status='active'
    )
  );
DROP POLICY IF EXISTS "Admins manage lesson progress" ON public.lesson_progress;
CREATE POLICY "Admins manage lesson progress" ON public.lesson_progress FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS trg_course_modules_updated ON public.course_modules;
CREATE TRIGGER trg_course_modules_updated BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_course_lessons_updated ON public.course_lessons;
CREATE TRIGGER trg_course_lessons_updated BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_lesson_progress_updated ON public.lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.sync_course_lesson_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  old_course UUID;
  new_course UUID;
BEGIN
  IF TG_OP IN ('DELETE','UPDATE') THEN
    SELECT course_id INTO old_course FROM public.course_modules WHERE id=OLD.module_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT course_id INTO new_course FROM public.course_modules WHERE id=NEW.module_id;
  END IF;

  IF old_course IS NOT NULL THEN
    UPDATE public.courses c SET lesson_count=(
      SELECT COUNT(*) FROM public.course_lessons l
      JOIN public.course_modules m ON m.id=l.module_id
      WHERE m.course_id=old_course
    ) WHERE c.id=old_course;
  END IF;

  IF new_course IS NOT NULL AND new_course IS DISTINCT FROM old_course THEN
    UPDATE public.courses c SET lesson_count=(
      SELECT COUNT(*) FROM public.course_lessons l
      JOIN public.course_modules m ON m.id=l.module_id
      WHERE m.course_id=new_course
    ) WHERE c.id=new_course;
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_lesson_count ON public.course_lessons;
CREATE TRIGGER trg_sync_course_lesson_count
  AFTER INSERT OR DELETE OR UPDATE OF module_id ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_lesson_count();

-- Initialize stored counts for courses that already have curriculum rows.
UPDATE public.courses c SET lesson_count=(
  SELECT COUNT(*) FROM public.course_lessons l
  JOIN public.course_modules m ON m.id=l.module_id
  WHERE m.course_id=c.id
);

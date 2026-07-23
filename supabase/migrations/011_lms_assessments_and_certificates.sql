-- Structured LMS assessments, sequential progression and electronic certificates.
-- This migration extends the native LMS without changing existing course content
-- or lesson-progress records.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS lms_sequential BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS certificate_template_path TEXT,
  ADD COLUMN IF NOT EXISTS certificate_template_name TEXT,
  ADD COLUMN IF NOT EXISTS certificate_title TEXT NOT NULL DEFAULT 'Certificate of Completion',
  ADD COLUMN IF NOT EXISTS certificate_signatory_name TEXT,
  ADD COLUMN IF NOT EXISTS certificate_signatory_title TEXT;

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS parent_lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE;

ALTER TABLE public.course_lessons
  DROP CONSTRAINT IF EXISTS course_lessons_not_own_parent;
ALTER TABLE public.course_lessons
  ADD CONSTRAINT course_lessons_not_own_parent
  CHECK (parent_lesson_id IS NULL OR parent_lesson_id <> id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_parent_sort
  ON public.course_lessons(parent_lesson_id,sort_order);

CREATE TABLE IF NOT EXISTS public.lms_assessments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id            UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id            UUID REFERENCES public.course_modules(id) ON DELETE CASCADE,
  lesson_id            UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  scope                 TEXT NOT NULL CHECK (scope IN ('module','lesson','submodule','final')),
  title                 TEXT NOT NULL,
  description           TEXT,
  passing_score         INT NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 1 AND 100),
  max_attempts          INT CHECK (max_attempts IS NULL OR max_attempts > 0),
  time_limit_minutes    INT CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  is_required           BOOLEAN NOT NULL DEFAULT TRUE,
  is_published          BOOLEAN NOT NULL DEFAULT FALSE,
  randomize_questions   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lms_assessment_target_check CHECK (
    (scope='final' AND module_id IS NULL AND lesson_id IS NULL) OR
    (scope='module' AND module_id IS NOT NULL AND lesson_id IS NULL) OR
    (scope IN ('lesson','submodule') AND module_id IS NULL AND lesson_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_one_final_assessment
  ON public.lms_assessments(course_id) WHERE scope='final';
CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_one_module_assessment
  ON public.lms_assessments(module_id) WHERE scope='module';
CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_one_unit_assessment
  ON public.lms_assessments(lesson_id) WHERE scope IN ('lesson','submodule');
CREATE INDEX IF NOT EXISTS idx_lms_assessments_course
  ON public.lms_assessments(course_id,is_published,scope);

CREATE TABLE IF NOT EXISTS public.lms_questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id   UUID NOT NULL REFERENCES public.lms_assessments(id) ON DELETE CASCADE,
  prompt           TEXT NOT NULL,
  question_type    TEXT NOT NULL DEFAULT 'single_choice'
                   CHECK (question_type IN ('single_choice','multiple_choice','true_false')),
  options           JSONB NOT NULL DEFAULT '[]'::JSONB,
  correct_answer    JSONB NOT NULL DEFAULT '[]'::JSONB,
  explanation       TEXT,
  points            INT NOT NULL DEFAULT 1 CHECK (points > 0),
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lms_questions_assessment_sort
  ON public.lms_questions(assessment_id,sort_order);

CREATE TABLE IF NOT EXISTS public.lms_assessment_attempts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id      UUID NOT NULL REFERENCES public.lms_assessments(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number     INT NOT NULL CHECK (attempt_number > 0),
  status             TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress','passed','failed')),
  answers            JSONB NOT NULL DEFAULT '{}'::JSONB,
  earned_points      NUMERIC(10,2),
  total_points       NUMERIC(10,2),
  score_percent      NUMERIC(5,2) CHECK (score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at       TIMESTAMPTZ,
  duration_seconds   INT CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id,user_id,attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_lms_attempts_user_assessment
  ON public.lms_assessment_attempts(user_id,assessment_id,attempt_number DESC);
CREATE INDEX IF NOT EXISTS idx_lms_passed_attempts
  ON public.lms_assessment_attempts(user_id,assessment_id)
  WHERE status='passed';

CREATE TABLE IF NOT EXISTS public.course_certificates (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id                UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certificate_number       TEXT NOT NULL UNIQUE,
  verification_code        TEXT NOT NULL UNIQUE,
  template_path_snapshot   TEXT,
  issued_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata                 JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_certificates_user
  ON public.course_certificates(user_id,issued_at DESC);

ALTER TABLE public.lms_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage LMS assessments" ON public.lms_assessments;
CREATE POLICY "Admins manage LMS assessments" ON public.lms_assessments FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Members read published LMS assessments" ON public.lms_assessments;
CREATE POLICY "Members read published LMS assessments" ON public.lms_assessments FOR SELECT
  USING (
    is_published=TRUE AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id=lms_assessments.course_id
        AND e.user_id=auth.uid()
        AND e.status='active'
    )
  );

-- Questions and answer keys are deliberately admin-only through the database.
-- Member question delivery and scoring happen through authenticated server routes.
DROP POLICY IF EXISTS "Admins manage LMS questions" ON public.lms_questions;
CREATE POLICY "Admins manage LMS questions" ON public.lms_questions FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Members read own LMS attempts" ON public.lms_assessment_attempts;
CREATE POLICY "Members read own LMS attempts" ON public.lms_assessment_attempts FOR SELECT
  USING (user_id=auth.uid());
DROP POLICY IF EXISTS "Admins manage LMS attempts" ON public.lms_assessment_attempts;
CREATE POLICY "Admins manage LMS attempts" ON public.lms_assessment_attempts FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Members read own certificates" ON public.course_certificates;
CREATE POLICY "Members read own certificates" ON public.course_certificates FOR SELECT
  USING (user_id=auth.uid());
DROP POLICY IF EXISTS "Admins manage certificates" ON public.course_certificates;
CREATE POLICY "Admins manage certificates" ON public.course_certificates FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.validate_lms_lesson_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  parent_module UUID;
  grandparent UUID;
BEGIN
  IF NEW.parent_lesson_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT module_id,parent_lesson_id
    INTO parent_module,grandparent
    FROM public.course_lessons
    WHERE id=NEW.parent_lesson_id;
  IF parent_module IS NULL OR parent_module <> NEW.module_id THEN
    RAISE EXCEPTION 'A submodule must belong to a lesson in the same module';
  END IF;
  IF grandparent IS NOT NULL THEN
    RAISE EXCEPTION 'Only one submodule level is supported';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lms_lesson_parent ON public.course_lessons;
CREATE TRIGGER trg_validate_lms_lesson_parent
  BEFORE INSERT OR UPDATE OF module_id,parent_lesson_id ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.validate_lms_lesson_parent();

CREATE OR REPLACE FUNCTION public.validate_lms_assessment_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=''
AS $$
DECLARE
  target_course UUID;
  is_submodule BOOLEAN;
BEGIN
  IF NEW.scope='module' THEN
    SELECT course_id INTO target_course
      FROM public.course_modules WHERE id=NEW.module_id;
  ELSIF NEW.scope IN ('lesson','submodule') THEN
    SELECT m.course_id,(l.parent_lesson_id IS NOT NULL)
      INTO target_course,is_submodule
      FROM public.course_lessons l
      JOIN public.course_modules m ON m.id=l.module_id
      WHERE l.id=NEW.lesson_id;
    IF NEW.scope='submodule' AND NOT COALESCE(is_submodule,FALSE) THEN
      RAISE EXCEPTION 'Submodule assessments must target a submodule';
    END IF;
    IF NEW.scope='lesson' AND COALESCE(is_submodule,FALSE) THEN
      RAISE EXCEPTION 'Lesson assessments cannot target a submodule';
    END IF;
  ELSE
    target_course=NEW.course_id;
  END IF;
  IF target_course IS NULL OR target_course <> NEW.course_id THEN
    RAISE EXCEPTION 'Assessment target does not belong to this course';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lms_assessment_target ON public.lms_assessments;
CREATE TRIGGER trg_validate_lms_assessment_target
  BEFORE INSERT OR UPDATE OF course_id,module_id,lesson_id,scope ON public.lms_assessments
  FOR EACH ROW EXECUTE FUNCTION public.validate_lms_assessment_target();

DROP TRIGGER IF EXISTS trg_lms_assessments_updated ON public.lms_assessments;
CREATE TRIGGER trg_lms_assessments_updated BEFORE UPDATE ON public.lms_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_lms_questions_updated ON public.lms_questions;
CREATE TRIGGER trg_lms_questions_updated BEFORE UPDATE ON public.lms_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_lms_attempts_updated ON public.lms_assessment_attempts;
CREATE TRIGGER trg_lms_attempts_updated BEFORE UPDATE ON public.lms_assessment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

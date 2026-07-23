-- Normalize assessment titles created before the LMS builder stopped appending
-- "Assessment" to labels that already contained the word.
UPDATE public.lms_assessments
SET title = regexp_replace(title, '( Assessment){2,}$', ' Assessment')
WHERE title ~ '( Assessment){2,}$';

UPDATE public.lms_assessments
SET title = 'Final Course Assessment'
WHERE scope = 'final'
  AND title <> 'Final Course Assessment';

WITH ranked_modules AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY course_id
      ORDER BY sort_order, created_at, id
    ) AS module_number
  FROM public.course_modules
)
UPDATE public.lms_assessments AS assessment
SET title = 'Module ' || ranked.module_number || ' - Module Assessment'
FROM ranked_modules AS ranked
WHERE assessment.scope = 'module'
  AND assessment.module_id = ranked.id;

WITH ranked_modules AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY course_id
      ORDER BY sort_order, created_at, id
    ) AS module_number
  FROM public.course_modules
),
ranked_lessons AS (
  SELECT
    lesson.id,
    lesson.module_id,
    row_number() OVER (
      PARTITION BY lesson.module_id
      ORDER BY lesson.sort_order, lesson.created_at, lesson.id
    ) AS lesson_number
  FROM public.course_lessons AS lesson
  WHERE lesson.parent_lesson_id IS NULL
)
UPDATE public.lms_assessments AS assessment
SET title =
  'Lesson ' || modules.module_number || '.' || lessons.lesson_number ||
  ' - Lesson Assessment'
FROM ranked_lessons AS lessons
JOIN ranked_modules AS modules ON modules.id = lessons.module_id
WHERE assessment.scope = 'lesson'
  AND assessment.lesson_id = lessons.id;

WITH ranked_modules AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY course_id
      ORDER BY sort_order, created_at, id
    ) AS module_number
  FROM public.course_modules
),
ranked_lessons AS (
  SELECT
    lesson.id,
    lesson.module_id,
    row_number() OVER (
      PARTITION BY lesson.module_id
      ORDER BY lesson.sort_order, lesson.created_at, lesson.id
    ) AS lesson_number
  FROM public.course_lessons AS lesson
  WHERE lesson.parent_lesson_id IS NULL
),
ranked_submodules AS (
  SELECT
    submodule.id,
    submodule.module_id,
    submodule.parent_lesson_id,
    row_number() OVER (
      PARTITION BY submodule.parent_lesson_id
      ORDER BY submodule.sort_order, submodule.created_at, submodule.id
    ) AS submodule_number
  FROM public.course_lessons AS submodule
  WHERE submodule.parent_lesson_id IS NOT NULL
)
UPDATE public.lms_assessments AS assessment
SET title =
  'Lesson ' || modules.module_number || '.' || lessons.lesson_number || '.' ||
  submodules.submodule_number || ' - Submodule Assessment'
FROM ranked_submodules AS submodules
JOIN ranked_lessons AS lessons ON lessons.id = submodules.parent_lesson_id
JOIN ranked_modules AS modules ON modules.id = submodules.module_id
WHERE assessment.scope = 'submodule'
  AND assessment.lesson_id = submodules.id;

import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';
import {signedVideoUrl} from '@/lib/lms/media';
import type {
  CourseProgressSummary,
  LmsAssessment,
  LmsCoursePayload,
  LmsLesson,
  LmsModule,
} from '@/types/lms';

type AttemptRow = {
  assessment_id: string;
  attempt_number: number;
  status: 'in_progress' | 'passed' | 'failed';
  score_percent: number | string | null;
  submitted_at: string | null;
};

type AssessmentStats = {
  attemptsUsed: number;
  passed: boolean;
  bestScore: number | null;
  latestScore: number | null;
};

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAssessmentStats(attempts: AttemptRow[]): AssessmentStats {
  const submitted = attempts
    .filter(attempt => attempt.status !== 'in_progress')
    .sort((a, b) => String(b.submitted_at ?? '').localeCompare(String(a.submitted_at ?? '')));
  const scores = submitted
    .map(attempt => numberOrNull(attempt.score_percent))
    .filter((score): score is number => score !== null);
  return {
    attemptsUsed: attempts.length,
    passed: attempts.some(attempt => attempt.status === 'passed'),
    bestScore: scores.length ? Math.max(...scores) : null,
    latestScore: scores[0] ?? null,
  };
}

function assessmentForMember(
  row: Record<string, unknown>,
  questionCount: number,
  stats: AssessmentStats,
): LmsAssessment {
  return {
    id: String(row.id),
    course_id: String(row.course_id),
    module_id: row.module_id ? String(row.module_id) : null,
    lesson_id: row.lesson_id ? String(row.lesson_id) : null,
    scope: row.scope as LmsAssessment['scope'],
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    passing_score: Number(row.passing_score),
    max_attempts: numberOrNull(row.max_attempts as number | string | null),
    time_limit_minutes: numberOrNull(row.time_limit_minutes as number | string | null),
    is_required: Boolean(row.is_required),
    is_published: Boolean(row.is_published),
    randomize_questions: Boolean(row.randomize_questions),
    question_count: questionCount,
    best_score: stats.bestScore,
    latest_score: stats.latestScore,
    attempts_used: stats.attemptsUsed,
    passed: stats.passed,
    locked: false,
    lock_reason: null,
  };
}

function flattenLessons(modules: LmsModule[]) {
  return modules.flatMap(courseModule =>
    courseModule.lessons.flatMap(lesson => [lesson, ...(lesson.submodules ?? [])]),
  );
}

export function findAssessment(payload: LmsCoursePayload, assessmentId: string) {
  if (payload.final_assessment?.id === assessmentId) return payload.final_assessment;
  for (const courseModule of payload.modules) {
    if (courseModule.assessment?.id === assessmentId) return courseModule.assessment;
    for (const lesson of courseModule.lessons) {
      if (lesson.assessment?.id === assessmentId) return lesson.assessment;
      for (const submodule of lesson.submodules ?? []) {
        if (submodule.assessment?.id === assessmentId) return submodule.assessment;
      }
    }
  }
  return null;
}

export async function getMemberLmsState(
  userId: string,
  courseId: string,
  includePlayback = true,
): Promise<LmsCoursePayload> {
  const [courseResult, moduleResult] = await Promise.all([
    supabaseAdmin
      .from('courses')
      .select('id,title,description,cover_image_url,level,market,is_published,lms_sequential,certificate_template_path')
      .eq('id', courseId)
      .eq('is_published', true)
      .single(),
    supabaseAdmin.from('course_modules').select('*').eq('course_id', courseId).order('sort_order'),
  ]);

  if (courseResult.error || !courseResult.data) throw new Error('Course not found or unavailable');
  if (moduleResult.error) throw new Error(moduleResult.error.message);

  const modules = moduleResult.data ?? [];
  const moduleIds = modules.map(module => module.id);
  const lessonResult = moduleIds.length
    ? await supabaseAdmin
        .from('course_lessons')
        .select('id,module_id,parent_lesson_id,title,content,video_url,video_storage_path,duration_seconds,sort_order,is_preview,is_published')
        .in('module_id', moduleIds)
        .eq('is_published', true)
        .order('sort_order')
    : {data: [], error: null};
  if (lessonResult.error) throw new Error(lessonResult.error.message);

  const lessons = lessonResult.data ?? [];
  const lessonIds = lessons.map(lesson => lesson.id);
  const [progressResult, assessmentResult, certificateResult] = await Promise.all([
    lessonIds.length
      ? supabaseAdmin
          .from('lesson_progress')
          .select('lesson_id,status,progress_seconds,completed_at,last_viewed_at')
          .eq('user_id', userId)
          .in('lesson_id', lessonIds)
      : Promise.resolve({data: [], error: null}),
    supabaseAdmin
      .from('lms_assessments')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_published', true),
    supabaseAdmin
      .from('course_certificates')
      .select('certificate_number,issued_at')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (progressResult.error) throw new Error(progressResult.error.message);
  if (assessmentResult.error) throw new Error(assessmentResult.error.message);

  const assessmentRows = assessmentResult.data ?? [];
  const assessmentIds = assessmentRows.map(assessment => assessment.id);
  const [questionResult, attemptResult] = await Promise.all([
    assessmentIds.length
      ? supabaseAdmin.from('lms_questions').select('id,assessment_id').in('assessment_id', assessmentIds)
      : Promise.resolve({data: [], error: null}),
    assessmentIds.length
      ? supabaseAdmin
          .from('lms_assessment_attempts')
          .select('assessment_id,attempt_number,status,score_percent,submitted_at')
          .eq('user_id', userId)
          .in('assessment_id', assessmentIds)
      : Promise.resolve({data: [], error: null}),
  ]);
  if (questionResult.error) throw new Error(questionResult.error.message);
  if (attemptResult.error) throw new Error(attemptResult.error.message);

  const progressByLesson = new Map(
    (progressResult.data ?? []).map(progress => [progress.lesson_id, progress]),
  );
  const questionCountByAssessment = new Map<string, number>();
  for (const question of questionResult.data ?? []) {
    questionCountByAssessment.set(
      question.assessment_id,
      (questionCountByAssessment.get(question.assessment_id) ?? 0) + 1,
    );
  }
  const attemptsByAssessment = new Map<string, AttemptRow[]>();
  for (const attempt of (attemptResult.data ?? []) as AttemptRow[]) {
    const current = attemptsByAssessment.get(attempt.assessment_id) ?? [];
    current.push(attempt);
    attemptsByAssessment.set(attempt.assessment_id, current);
  }
  const assessments = assessmentRows.map(row =>
    assessmentForMember(
      row,
      questionCountByAssessment.get(row.id) ?? 0,
      getAssessmentStats(attemptsByAssessment.get(row.id) ?? []),
    ),
  );
  const assessmentByLesson = new Map(
    assessments.filter(assessment => assessment.lesson_id).map(assessment => [assessment.lesson_id!, assessment]),
  );
  const assessmentByModule = new Map(
    assessments.filter(assessment => assessment.module_id).map(assessment => [assessment.module_id!, assessment]),
  );
  const finalAssessment = assessments.find(assessment => assessment.scope === 'final') ?? null;

  const memberLessonRows = await Promise.all(
    lessons.map(async lesson => ({
      ...lesson,
      video_storage_path: undefined,
      playback_url:
        includePlayback && lesson.video_storage_path
          ? await signedVideoUrl(lesson.video_storage_path)
          : includePlayback
            ? lesson.video_url
            : null,
      progress: progressByLesson.get(lesson.id) ?? null,
      assessment: assessmentByLesson.get(lesson.id) ?? null,
      submodules: [] as LmsLesson[],
      locked: false,
      lock_reason: null,
    })),
  );
  const modulePayload: LmsModule[] = modules.map(module => {
    const moduleLessons = memberLessonRows
      .filter(lesson => lesson.module_id === module.id && !lesson.parent_lesson_id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(lesson => ({
        ...lesson,
        submodules: memberLessonRows
          .filter(submodule => submodule.parent_lesson_id === lesson.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    return {
      ...module,
      lessons: moduleLessons,
      assessment: assessmentByModule.get(module.id) ?? null,
      locked: false,
      lock_reason: null,
    } as LmsModule;
  });

  // Enforce a deterministic learning path. A module opens only after every
  // required step in the preceding module has been completed and passed.
  let precedingModuleComplete: boolean = true;
  const sequential = Boolean(courseResult.data.lms_sequential);
  for (const courseModule of modulePayload) {
    const moduleUnlocked: boolean = !sequential || precedingModuleComplete;
    courseModule.locked = !moduleUnlocked;
    courseModule.lock_reason = moduleUnlocked ? null : 'Complete and pass the previous module first.';

    let precedingUnitComplete: boolean = moduleUnlocked;
    const units = courseModule.lessons.flatMap(lesson => [lesson, ...(lesson.submodules ?? [])]);
    for (const unit of units) {
      const unlocked = moduleUnlocked && (!sequential || precedingUnitComplete);
      unit.locked = !unlocked;
      unit.lock_reason = unlocked ? null : 'Complete and pass the previous lesson or submodule first.';
      if (unit.assessment) {
        unit.assessment.locked = !unlocked;
        unit.assessment.lock_reason = unit.lock_reason;
      }
      const progressComplete = unit.progress?.status === 'completed';
      const assessmentComplete =
        !unit.assessment?.is_required || Boolean(unit.assessment?.passed);
      precedingUnitComplete = precedingUnitComplete && progressComplete && assessmentComplete;
    }

    const moduleAssessment = courseModule.assessment;
    if (moduleAssessment) {
      moduleAssessment.locked = !precedingUnitComplete;
      moduleAssessment.lock_reason = precedingUnitComplete
        ? null
        : 'Complete every lesson and required assessment in this module first.';
    }
    const moduleAssessmentComplete =
      !moduleAssessment?.is_required || Boolean(moduleAssessment?.passed);
    precedingModuleComplete =
      moduleUnlocked && precedingUnitComplete && moduleAssessmentComplete;
  }

  if (finalAssessment) {
    finalAssessment.locked = !precedingModuleComplete;
    finalAssessment.lock_reason = precedingModuleComplete
      ? null
      : 'Complete every module and required assessment before the final assessment.';
  }

  const allLessons = flattenLessons(modulePayload);
  const completedLessons = allLessons.filter(
    lesson =>
      lesson.progress?.status === 'completed' &&
      (!lesson.assessment?.is_required || Boolean(lesson.assessment.passed)),
  ).length;
  const milestoneAssessments = assessments.filter(
    assessment => assessment.is_required && (assessment.scope === 'module' || assessment.scope === 'final'),
  );
  const passedMilestones = milestoneAssessments.filter(assessment => assessment.passed).length;
  const totalSteps = allLessons.length + milestoneAssessments.length;
  const completedSteps = completedLessons + passedMilestones;
  const submittedAttempts = ((attemptResult.data ?? []) as AttemptRow[])
    .filter(attempt => attempt.status !== 'in_progress' && attempt.score_percent !== null)
    .sort((a, b) => String(b.submitted_at ?? '').localeCompare(String(a.submitted_at ?? '')));
  const assessmentBestScores = assessments
    .map(assessment => assessment.best_score)
    .filter((score): score is number => score !== null && score !== undefined);
  const latestProgress = [...(progressResult.data ?? [])].sort((a, b) =>
    String(b.last_viewed_at ?? '').localeCompare(String(a.last_viewed_at ?? '')),
  )[0];
  const nextLesson = allLessons.find(
    lesson =>
      !lesson.locked &&
      (lesson.progress?.status !== 'completed' ||
        (lesson.assessment?.is_required && !lesson.assessment.passed)),
  );
  const certificateEligible =
    precedingModuleComplete && Boolean(finalAssessment?.passed);

  const summary: CourseProgressSummary = {
    completed: completedLessons,
    total: allLessons.length,
    percent: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
    completed_assessments: assessments.filter(assessment => assessment.passed).length,
    total_assessments: assessments.length,
    average_score: assessmentBestScores.length
      ? Math.round(
          assessmentBestScores.reduce((total, score) => total + score, 0) /
            assessmentBestScores.length,
        )
      : null,
    latest_score: numberOrNull(submittedAttempts[0]?.score_percent),
    last_viewed_at: latestProgress?.last_viewed_at ?? null,
    last_lesson_id: latestProgress?.lesson_id ?? null,
    next_lesson_title: nextLesson?.title ?? null,
    certificate_issued: Boolean(certificateResult.data),
  };

  return {
    course: {
      id: courseResult.data.id,
      title: courseResult.data.title,
      description: courseResult.data.description,
      cover_image_url: courseResult.data.cover_image_url,
      level: courseResult.data.level,
      market: courseResult.data.market,
      lms_sequential: sequential,
    },
    modules: modulePayload,
    final_assessment: finalAssessment,
    certificate: {
      eligible: certificateEligible,
      issued: Boolean(certificateResult.data),
      certificate_number: certificateResult.data?.certificate_number ?? null,
      issued_at: certificateResult.data?.issued_at ?? null,
      has_template: Boolean(courseResult.data.certificate_template_path),
    },
    summary,
  };
}

export async function getCourseProgressSummaries(userId: string, courseIds: string[]) {
  const uniqueIds = [...new Set(courseIds.filter(Boolean))];
  const summaries = new Map<string, CourseProgressSummary>();
  const empty = (): CourseProgressSummary => ({
    completed: 0,
    total: 0,
    percent: 0,
    completed_assessments: 0,
    total_assessments: 0,
    average_score: null,
    latest_score: null,
    last_viewed_at: null,
    last_lesson_id: null,
    next_lesson_title: null,
    certificate_issued: false,
  });
  for (const courseId of uniqueIds) summaries.set(courseId, empty());
  if (!uniqueIds.length) return summaries;

  try {
    const [moduleResult, assessmentResult, certificateResult] = await Promise.all([
      supabaseAdmin
        .from('course_modules')
        .select('id,course_id,sort_order')
        .in('course_id', uniqueIds)
        .order('sort_order'),
      supabaseAdmin
        .from('lms_assessments')
        .select('id,course_id,module_id,lesson_id,scope,is_required')
        .in('course_id', uniqueIds)
        .eq('is_published', true),
      supabaseAdmin
        .from('course_certificates')
        .select('course_id')
        .eq('user_id', userId)
        .in('course_id', uniqueIds),
    ]);
    if (moduleResult.error || assessmentResult.error || certificateResult.error) return summaries;

    const modules = moduleResult.data ?? [];
    const assessments = assessmentResult.data ?? [];
    const moduleIds = modules.map(courseModule => courseModule.id);
    const lessonResult = moduleIds.length
      ? await supabaseAdmin
          .from('course_lessons')
          .select('id,module_id,parent_lesson_id,title,sort_order')
          .in('module_id', moduleIds)
          .eq('is_published', true)
      : {data: [], error: null};
    if (lessonResult.error) return summaries;

    const lessons = lessonResult.data ?? [];
    const lessonIds = lessons.map(lesson => lesson.id);
    const assessmentIds = assessments.map(assessment => assessment.id);
    const [progressResult, attemptResult] = await Promise.all([
      lessonIds.length
        ? supabaseAdmin
            .from('lesson_progress')
            .select('lesson_id,status,last_viewed_at')
            .eq('user_id', userId)
            .in('lesson_id', lessonIds)
        : Promise.resolve({data: [], error: null}),
      assessmentIds.length
        ? supabaseAdmin
            .from('lms_assessment_attempts')
            .select('assessment_id,status,score_percent,submitted_at,attempt_number')
            .eq('user_id', userId)
            .in('assessment_id', assessmentIds)
        : Promise.resolve({data: [], error: null}),
    ]);
    if (progressResult.error || attemptResult.error) return summaries;

    const progressByLesson = new Map(
      (progressResult.data ?? []).map(progress => [progress.lesson_id, progress]),
    );
    const attemptsByAssessment = new Map<string, AttemptRow[]>();
    for (const attempt of (attemptResult.data ?? []) as AttemptRow[]) {
      const current = attemptsByAssessment.get(attempt.assessment_id) ?? [];
      current.push(attempt);
      attemptsByAssessment.set(attempt.assessment_id, current);
    }
    const certificateCourses = new Set(
      (certificateResult.data ?? []).map(certificate => certificate.course_id),
    );

    for (const courseId of uniqueIds) {
      const courseModules = modules
        .filter(courseModule => courseModule.course_id === courseId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const orderedLessons = courseModules.flatMap(courseModule => {
        const moduleLessons = lessons.filter(lesson => lesson.module_id === courseModule.id);
        const roots = moduleLessons
          .filter(lesson => !lesson.parent_lesson_id)
          .sort((a, b) => a.sort_order - b.sort_order);
        return roots.flatMap(root => [
          root,
          ...moduleLessons
            .filter(lesson => lesson.parent_lesson_id === root.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        ]);
      });
      const courseAssessments = assessments.filter(assessment => assessment.course_id === courseId);
      const assessmentStats = new Map(
        courseAssessments.map(assessment => [
          assessment.id,
          getAssessmentStats(attemptsByAssessment.get(assessment.id) ?? []),
        ]),
      );
      const requiredUnitAssessmentByLesson = new Map(
        courseAssessments
          .filter(
            assessment =>
              assessment.lesson_id &&
              assessment.is_required &&
              (assessment.scope === 'lesson' || assessment.scope === 'submodule'),
          )
          .map(assessment => [assessment.lesson_id, assessment]),
      );
      const completed = orderedLessons.filter(lesson => {
        const progressComplete = progressByLesson.get(lesson.id)?.status === 'completed';
        const requiredAssessment = requiredUnitAssessmentByLesson.get(lesson.id);
        return (
          progressComplete &&
          (!requiredAssessment || Boolean(assessmentStats.get(requiredAssessment.id)?.passed))
        );
      }).length;
      const milestones = courseAssessments.filter(
        assessment =>
          assessment.is_required &&
          (assessment.scope === 'module' || assessment.scope === 'final'),
      );
      const passedMilestones = milestones.filter(
        assessment => assessmentStats.get(assessment.id)?.passed,
      ).length;
      const totalSteps = orderedLessons.length + milestones.length;
      const latestProgress = orderedLessons
        .map(lesson => ({lesson, progress: progressByLesson.get(lesson.id)}))
        .filter(item => item.progress?.last_viewed_at)
        .sort((a, b) =>
          String(b.progress?.last_viewed_at).localeCompare(String(a.progress?.last_viewed_at)),
        )[0];
      const nextLesson = orderedLessons.find(lesson => {
        const progressComplete = progressByLesson.get(lesson.id)?.status === 'completed';
        const requiredAssessment = requiredUnitAssessmentByLesson.get(lesson.id);
        return (
          !progressComplete ||
          Boolean(
            requiredAssessment &&
              !assessmentStats.get(requiredAssessment.id)?.passed,
          )
        );
      });
      const bestScores = courseAssessments
        .map(assessment => assessmentStats.get(assessment.id)?.bestScore ?? null)
        .filter((score): score is number => score !== null);
      const submittedAttempts = courseAssessments
        .flatMap(assessment => attemptsByAssessment.get(assessment.id) ?? [])
        .filter(attempt => attempt.status !== 'in_progress' && attempt.score_percent !== null)
        .sort((a, b) => String(b.submitted_at ?? '').localeCompare(String(a.submitted_at ?? '')));

      summaries.set(courseId, {
        completed,
        total: orderedLessons.length,
        percent: totalSteps
          ? Math.round(((completed + passedMilestones) / totalSteps) * 100)
          : 0,
        completed_assessments: courseAssessments.filter(
          assessment => assessmentStats.get(assessment.id)?.passed,
        ).length,
        total_assessments: courseAssessments.length,
        average_score: bestScores.length
          ? Math.round(bestScores.reduce((total, score) => total + score, 0) / bestScores.length)
          : null,
        latest_score: numberOrNull(submittedAttempts[0]?.score_percent),
        last_viewed_at: latestProgress?.progress?.last_viewed_at ?? null,
        last_lesson_id: latestProgress?.lesson.id ?? null,
        next_lesson_title: nextLesson?.title ?? null,
        certificate_issued: certificateCourses.has(courseId),
      });
    }

    return summaries;
  } catch {
    return summaries;
  }
}

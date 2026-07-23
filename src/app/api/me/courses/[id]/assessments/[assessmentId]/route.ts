import {NextRequest, NextResponse} from 'next/server';

import {hasCourseAccess} from '@/lib/lms/access';
import {normalizeAssessmentAnswers, scoreAssessment} from '@/lib/lms/assessmentScoring';
import {ensureCourseCertificate} from '@/lib/lms/certificate';
import {findAssessment, getMemberLmsState} from '@/lib/lms/memberState';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';
import type {LmsQuestionOption} from '@/types/lms';

export const dynamic = 'force-dynamic';

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string; assessmentId: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id: courseId, assessmentId} = await params;
  if (!(await hasCourseAccess(session.userId, courseId))) {
    return NextResponse.json({error: 'An active course enrollment is required'}, {status: 403});
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const state = await getMemberLmsState(session.userId, courseId, false);
    const assessment = findAssessment(state, assessmentId);
    if (!assessment || !assessment.is_published) {
      return NextResponse.json({error: 'Assessment not found'}, {status: 404});
    }
    if (assessment.locked) {
      return NextResponse.json(
        {error: assessment.lock_reason ?? 'Complete the preceding learning steps first'},
        {status: 423},
      );
    }

    const questionResult = await supabaseAdmin
      .from('lms_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('sort_order');
    if (questionResult.error) throw new Error(questionResult.error.message);
    const questions = questionResult.data ?? [];
    if (!questions.length) {
      return NextResponse.json({error: 'This assessment has no questions yet'}, {status: 409});
    }

    const action = String(body.action ?? 'start');
    if (action === 'start') {
      if (assessment.passed) {
        return NextResponse.json(
          {error: 'You have already passed this assessment', passed: true, best_score: assessment.best_score},
          {status: 409},
        );
      }
      const attempts = await supabaseAdmin
        .from('lms_assessment_attempts')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('user_id', session.userId)
        .order('attempt_number', {ascending: false});
      if (attempts.error) throw new Error(attempts.error.message);
      let attempt = (attempts.data ?? []).find(item => item.status === 'in_progress');
      if (!attempt) {
        const used = attempts.data?.length ?? 0;
        if (assessment.max_attempts && used >= assessment.max_attempts) {
          return NextResponse.json(
            {error: 'Maximum assessment attempts reached. Contact support for assistance.'},
            {status: 409},
          );
        }
        const inserted = await supabaseAdmin
          .from('lms_assessment_attempts')
          .insert({
            assessment_id: assessmentId,
            user_id: session.userId,
            attempt_number: used + 1,
            status: 'in_progress',
          })
          .select('*')
          .single();
        if (inserted.error) throw new Error(inserted.error.message);
        attempt = inserted.data;
      }

      const safeQuestions = questions.map(question => ({
        id: question.id,
        prompt: question.prompt,
        question_type: question.question_type,
        options: question.options as LmsQuestionOption[],
        points: question.points,
        sort_order: question.sort_order,
      }));
      return NextResponse.json({
        attempt: {
          id: attempt.id,
          attempt_number: attempt.attempt_number,
          started_at: attempt.started_at,
        },
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          passing_score: assessment.passing_score,
          time_limit_minutes: assessment.time_limit_minutes,
          max_attempts: assessment.max_attempts,
        },
        questions: assessment.randomize_questions ? shuffled(safeQuestions) : safeQuestions,
      });
    }

    if (action !== 'submit') {
      return NextResponse.json({error: 'Invalid assessment action'}, {status: 400});
    }

    const attemptId = String(body.attempt_id ?? '');
    if (!attemptId) return NextResponse.json({error: 'attempt_id is required'}, {status: 400});
    const attemptResult = await supabaseAdmin
      .from('lms_assessment_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('assessment_id', assessmentId)
      .eq('user_id', session.userId)
      .maybeSingle();
    const attempt = attemptResult.data;
    if (!attempt) return NextResponse.json({error: 'Assessment attempt not found'}, {status: 404});
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({error: 'This assessment attempt has already been submitted'}, {status: 409});
    }

    const answers = normalizeAssessmentAnswers(body.answers);
    const startedAt = new Date(attempt.started_at).getTime();
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const timedOut =
      Boolean(assessment.time_limit_minutes) &&
      durationSeconds > Number(assessment.time_limit_minutes) * 60 + 30;
    const {correctness,totalPoints,earnedPoints,scorePercent}=scoreAssessment(questions,answers,timedOut);
    const passed = !timedOut && scorePercent >= assessment.passing_score;
    const submittedAt = new Date().toISOString();

    const updated = await supabaseAdmin
      .from('lms_assessment_attempts')
      .update({
        status: passed ? 'passed' : 'failed',
        answers,
        earned_points: earnedPoints,
        total_points: totalPoints,
        score_percent: scorePercent,
        submitted_at: submittedAt,
        duration_seconds: durationSeconds,
      })
      .eq('id', attemptId);
    if (updated.error) throw new Error(updated.error.message);

    let lessonCompleted = false;
    if (passed && assessment.lesson_id) {
      const completed = await supabaseAdmin.from('lesson_progress').upsert(
        {
          user_id: session.userId,
          lesson_id: assessment.lesson_id,
          status: 'completed',
          last_viewed_at: submittedAt,
          completed_at: submittedAt,
        },
        {onConflict: 'user_id,lesson_id'},
      );
      if (completed.error) throw new Error(completed.error.message);
      lessonCompleted = true;
    }

    let certificateIssued = false;
    if (passed && assessment.scope === 'final') {
      await ensureCourseCertificate(session.userId, courseId);
      certificateIssued = true;
    }

    return NextResponse.json({
      attempt_id: attemptId,
      status: passed ? 'passed' : 'failed',
      score_percent: scorePercent,
      earned_points: earnedPoints,
      total_points: totalPoints,
      passing_score: assessment.passing_score,
      timed_out: timedOut,
      lesson_completed: lessonCompleted,
      certificate_issued: certificateIssued,
      explanations: correctness.map(({question, correct}) => ({
        question_id: question.id,
        correct,
        explanation: passed ? question.explanation ?? null : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Assessment could not be processed'},
      {status: 400},
    );
  }
}

import {NextRequest, NextResponse} from 'next/server';

import {hasCourseAccess, lessonBelongsToCourse} from '@/lib/lms/access';
import {getMemberLmsState} from '@/lib/lms/memberState';
import {requireAuthSession, supabaseAdmin} from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAuthSession(req);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  const {id} = await params;
  if (!(await hasCourseAccess(session.userId, id))) {
    return NextResponse.json({error: 'An active course enrollment is required'}, {status: 403});
  }

  const body = await req.json();
  const lessonId = String(body.lesson_id ?? '');
  const status = body.status === 'completed' ? 'completed' : 'in_progress';
  if (!lessonId || !(await lessonBelongsToCourse(lessonId, id))) {
    return NextResponse.json({error: 'Lesson not found in this course'}, {status: 404});
  }

  if (status === 'completed') {
    try {
      const state = await getMemberLmsState(session.userId, id, false);
      const lessons = state.modules.flatMap(courseModule =>
        courseModule.lessons.flatMap(lesson => [lesson, ...(lesson.submodules ?? [])]),
      );
      const lesson = lessons.find(item => item.id === lessonId);
      if (!lesson) return NextResponse.json({error: 'Published lesson not found'}, {status: 404});
      if (lesson.locked) {
        return NextResponse.json(
          {error: lesson.lock_reason ?? 'Complete the preceding lesson first'},
          {status: 423},
        );
      }
      if (lesson.assessment?.is_required && !lesson.assessment.passed) {
        return NextResponse.json(
          {
            error: 'Pass this lesson assessment before continuing',
            code: 'ASSESSMENT_REQUIRED',
            assessment_id: lesson.assessment.id,
          },
          {status: 409},
        );
      }
    } catch (error) {
      return NextResponse.json(
        {error: error instanceof Error ? error.message : 'Progress validation failed'},
        {status: 400},
      );
    }
  }

  const seconds = Math.min(
    7 * 24 * 60 * 60,
    Math.max(0, Math.floor(Number(body.progress_seconds ?? 0) || 0)),
  );
  const now = new Date().toISOString();
  const result = await supabaseAdmin
    .from('lesson_progress')
    .upsert(
      {
        user_id: session.userId,
        lesson_id: lessonId,
        status,
        progress_seconds: seconds,
        last_viewed_at: now,
        completed_at: status === 'completed' ? now : null,
      },
      {onConflict: 'user_id,lesson_id'},
    )
    .select('*')
    .single();
  if (result.error) return NextResponse.json({error: result.error.message}, {status: 500});
  return NextResponse.json(result.data);
}

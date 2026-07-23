import {NextRequest, NextResponse} from 'next/server';

import {validateAssessmentInput} from '@/lib/lms/assessmentValidation';
import {requireAdminSession, supabaseAdmin} from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});

  let assessmentId: string | null = null;
  try {
    const validated = validateAssessmentInput(await req.json());
    const course = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', validated.course_id)
      .maybeSingle();
    if (!course.data) return NextResponse.json({error: 'Course not found'}, {status: 404});

    const {questions, ...assessment} = validated;
    const inserted = await supabaseAdmin
      .from('lms_assessments')
      .insert(assessment)
      .select('*')
      .single();
    if (inserted.error) {
      const conflict = inserted.error.code === '23505';
      return NextResponse.json(
        {
          error: conflict
            ? 'This lesson, module, or course already has an assessment. Edit the existing assessment instead.'
            : inserted.error.message,
        },
        {status: conflict ? 409 : 500},
      );
    }
    assessmentId = inserted.data.id;

    if (questions.length) {
      const questionInsert = await supabaseAdmin.from('lms_questions').insert(
        questions.map(question => ({...question, assessment_id: assessmentId})),
      );
      if (questionInsert.error) throw new Error(questionInsert.error.message);
    }

    const result = await supabaseAdmin
      .from('lms_assessments')
      .select('*,questions:lms_questions(*)')
      .eq('id', assessmentId)
      .single();
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json(result.data, {status: 201});
  } catch (error) {
    if (assessmentId) await supabaseAdmin.from('lms_assessments').delete().eq('id', assessmentId);
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Invalid assessment'},
      {status: 400},
    );
  }
}

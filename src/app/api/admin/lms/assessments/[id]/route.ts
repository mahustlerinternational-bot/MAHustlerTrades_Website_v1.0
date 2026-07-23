import {NextRequest, NextResponse} from 'next/server';

import {validateAssessmentInput} from '@/lib/lms/assessmentValidation';
import {requireAdminSession, supabaseAdmin} from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {id} = await params;

  try {
    const validated = validateAssessmentInput(await req.json());
    const current = await supabaseAdmin
      .from('lms_assessments')
      .select('id,course_id')
      .eq('id', id)
      .maybeSingle();
    if (!current.data) return NextResponse.json({error: 'Assessment not found'}, {status: 404});
    if (current.data.course_id !== validated.course_id) {
      return NextResponse.json({error: 'Assessment course cannot be changed'}, {status: 400});
    }

    const {questions, ...assessment} = validated;
    const updated = await supabaseAdmin
      .from('lms_assessments')
      .update(assessment)
      .eq('id', id)
      .select('*')
      .single();
    if (updated.error) return NextResponse.json({error: updated.error.message}, {status: 500});

    const previousQuestions = await supabaseAdmin
      .from('lms_questions')
      .select('*')
      .eq('assessment_id', id);
    const removed = await supabaseAdmin.from('lms_questions').delete().eq('assessment_id', id);
    if (removed.error) return NextResponse.json({error: removed.error.message}, {status: 500});

    if (questions.length) {
      const inserted = await supabaseAdmin.from('lms_questions').insert(
        questions.map(question => ({...question, assessment_id: id})),
      );
      if (inserted.error) {
        if (previousQuestions.data?.length) {
          const restore = previousQuestions.data.map(({id: _questionId, ...question}) => question);
          await supabaseAdmin.from('lms_questions').insert(restore);
        }
        return NextResponse.json({error: inserted.error.message}, {status: 500});
      }
    }

    const result = await supabaseAdmin
      .from('lms_assessments')
      .select('*,questions:lms_questions(*)')
      .eq('id', id)
      .single();
    return result.error
      ? NextResponse.json({error: result.error.message}, {status: 500})
      : NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Invalid assessment'},
      {status: 400},
    );
  }
}

export async function DELETE(
  req: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const {id} = await params;
  const result = await supabaseAdmin.from('lms_assessments').delete().eq('id', id);
  if (result.error) return NextResponse.json({error: result.error.message}, {status: 500});
  return NextResponse.json({success: true});
}

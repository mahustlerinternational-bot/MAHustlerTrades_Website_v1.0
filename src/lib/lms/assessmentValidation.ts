import type {AssessmentScope, LmsQuestionOption, QuestionType} from '@/types/lms';

export interface ValidatedQuestion {
  prompt: string;
  question_type: QuestionType;
  options: LmsQuestionOption[];
  correct_answer: string[];
  explanation: string | null;
  points: number;
  sort_order: number;
}

export interface ValidatedAssessment {
  course_id: string;
  module_id: string | null;
  lesson_id: string | null;
  scope: AssessmentScope;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  is_required: boolean;
  is_published: boolean;
  randomize_questions: boolean;
  questions: ValidatedQuestion[];
}

function boundedInteger(value: unknown, minimum: number, maximum: number, label: string) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function optionalPositiveInteger(value: unknown, maximum: number, label: string) {
  if (value === null || value === undefined || value === '') return null;
  return boundedInteger(value, 1, maximum, label);
}

export function validateAssessmentInput(body: Record<string, unknown>): ValidatedAssessment {
  const courseId = String(body.course_id ?? '').trim();
  const moduleId = String(body.module_id ?? '').trim() || null;
  const lessonId = String(body.lesson_id ?? '').trim() || null;
  const scope = String(body.scope ?? '') as AssessmentScope;
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim() || null;

  if (!courseId) throw new Error('course_id is required');
  if (!['module', 'lesson', 'submodule', 'final'].includes(scope)) {
    throw new Error('Invalid assessment scope');
  }
  if (title.length < 2 || title.length > 180) {
    throw new Error('Assessment title must be between 2 and 180 characters');
  }
  if (description && description.length > 2000) {
    throw new Error('Assessment description cannot exceed 2,000 characters');
  }
  if (scope === 'module' && !moduleId) throw new Error('A module assessment requires module_id');
  if ((scope === 'lesson' || scope === 'submodule') && !lessonId) {
    throw new Error('A lesson assessment requires lesson_id');
  }

  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  if (rawQuestions.length > 100) throw new Error('An assessment can contain up to 100 questions');
  const questions = rawQuestions.map((raw, index): ValidatedQuestion => {
    const question = (raw ?? {}) as Record<string, unknown>;
    const prompt = String(question.prompt ?? '').trim();
    const type = String(question.question_type ?? 'single_choice') as QuestionType;
    const explanation = String(question.explanation ?? '').trim() || null;
    if (prompt.length < 2 || prompt.length > 2000) {
      throw new Error(`Question ${index + 1} must be between 2 and 2,000 characters`);
    }
    if (!['single_choice', 'multiple_choice', 'true_false'].includes(type)) {
      throw new Error(`Question ${index + 1} has an invalid type`);
    }
    if (explanation && explanation.length > 2000) {
      throw new Error(`Question ${index + 1} explanation is too long`);
    }

    const rawOptions = Array.isArray(question.options) ? question.options : [];
    const options = rawOptions.map((rawOption, optionIndex): LmsQuestionOption => {
      const option = (rawOption ?? {}) as Record<string, unknown>;
      const id = String(option.id ?? `option_${optionIndex + 1}`).trim();
      const text = String(option.text ?? '').trim();
      if (!id || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) {
        throw new Error(`Question ${index + 1} has an invalid option identifier`);
      }
      if (!text || text.length > 500) {
        throw new Error(`Question ${index + 1}, option ${optionIndex + 1} is required`);
      }
      return {id, text};
    });
    if (options.length < 2 || options.length > 10) {
      throw new Error(`Question ${index + 1} must have between 2 and 10 options`);
    }
    if (new Set(options.map(option => option.id)).size !== options.length) {
      throw new Error(`Question ${index + 1} option identifiers must be unique`);
    }

    const rawCorrect = Array.isArray(question.correct_answer) ? question.correct_answer : [];
    const correctAnswer = [...new Set(rawCorrect.map(value => String(value)))];
    const optionIds = new Set(options.map(option => option.id));
    if (!correctAnswer.length || correctAnswer.some(answer => !optionIds.has(answer))) {
      throw new Error(`Question ${index + 1} must identify a valid correct answer`);
    }
    if ((type === 'single_choice' || type === 'true_false') && correctAnswer.length !== 1) {
      throw new Error(`Question ${index + 1} must have exactly one correct answer`);
    }

    return {
      prompt,
      question_type: type,
      options,
      correct_answer: correctAnswer,
      explanation,
      points: boundedInteger(question.points ?? 1, 1, 100, `Question ${index + 1} points`),
      sort_order: index,
    };
  });
  if (Boolean(body.is_published) && !questions.length) {
    throw new Error('Add at least one question before publishing an assessment');
  }

  return {
    course_id: courseId,
    module_id: scope === 'module' ? moduleId : null,
    lesson_id: scope === 'lesson' || scope === 'submodule' ? lessonId : null,
    scope,
    title,
    description,
    passing_score: boundedInteger(body.passing_score ?? 70, 1, 100, 'Passing score'),
    max_attempts: optionalPositiveInteger(body.max_attempts, 100, 'Maximum attempts'),
    time_limit_minutes: optionalPositiveInteger(body.time_limit_minutes, 1440, 'Time limit'),
    is_required: body.is_required === undefined ? true : Boolean(body.is_required),
    is_published: Boolean(body.is_published),
    randomize_questions: Boolean(body.randomize_questions),
    questions,
  };
}

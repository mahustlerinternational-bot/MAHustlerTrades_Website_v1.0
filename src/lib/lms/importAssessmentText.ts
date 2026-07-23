import type {LmsQuestionOption, QuestionType} from '@/types/lms';

export interface ImportedAssessmentQuestion {
  prompt: string;
  question_type: QuestionType;
  options: LmsQuestionOption[];
  correct_answer: string[];
  explanation: string;
  points: number;
}

export interface ImportedAssessment {
  title: string;
  description: string;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  is_required: boolean;
  is_published: boolean;
  randomize_questions: boolean;
  questions: ImportedAssessmentQuestion[];
}

const QUESTION_HEADING = /^(?:##\s*QUESTION(?:\s+\d+)?|QUESTION\s+\d+)\s*(?::\s*(.*))?$/i;

function headerValue(lines: string[], aliases: string[]) {
  const keys = new Set(aliases.map(alias => alias.toUpperCase()));
  for (const rawLine of lines) {
    const match = rawLine.match(/^([A-Z][A-Z _-]*):\s*(.*)$/i);
    if (match && keys.has(match[1].trim().replace(/[-_]+/g, ' ').toUpperCase())) {
      return match[2].trim();
    }
  }
  return null;
}

function integerSetting(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
  label: string,
) {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be a whole number between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function optionalIntegerSetting(
  value: string | null,
  maximum: number,
  label: string,
) {
  if (value === null || value === '' || /^unlimited$/i.test(value)) return null;
  return integerSetting(value, 1, 1, maximum, label);
}

function booleanSetting(value: string | null, fallback: boolean, label: string) {
  if (value === null || value === '') return fallback;
  if (/^(?:true|yes|on|1)$/i.test(value)) return true;
  if (/^(?:false|no|off|0)$/i.test(value)) return false;
  throw new Error(`${label} must be true or false`);
}

function questionType(value: string | null, questionNumber: number): QuestionType {
  const normalized = String(value ?? 'single_choice')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'single' || normalized === 'single_choice') return 'single_choice';
  if (normalized === 'multiple' || normalized === 'multiple_choice') return 'multiple_choice';
  if (normalized === 'true_false' || normalized === 'truefalse') return 'true_false';
  throw new Error(
    `Question ${questionNumber} TYPE must be single_choice, multiple_choice, or true_false`,
  );
}

function parseQuestion(
  lines: string[],
  index: number,
  headingPrompt: string,
): ImportedAssessmentQuestion {
  let prompt = headingPrompt;
  let explanation = '';
  let type: QuestionType = 'single_choice';
  let points = 1;
  let mode: 'prompt' | 'explanation' | null = headingPrompt ? 'prompt' : null;
  const rawOptions: Array<{text: string; correct: boolean}> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^<!--.*-->$/.test(line) || (/^#/.test(line) && !/^##\s*QUESTION/i.test(line))) {
      continue;
    }

    const typeMatch = line.match(/^TYPE\s*:\s*(.*)$/i);
    if (typeMatch) {
      type = questionType(typeMatch[1], index + 1);
      mode = null;
      continue;
    }
    const pointsMatch = line.match(/^POINTS?\s*:\s*(.*)$/i);
    if (pointsMatch) {
      points = integerSetting(pointsMatch[1], 1, 1, 100, `Question ${index + 1} points`);
      mode = null;
      continue;
    }
    const promptMatch = line.match(/^(?:PROMPT|QUESTION)\s*:\s*(.*)$/i);
    if (promptMatch) {
      prompt = promptMatch[1].trim();
      mode = 'prompt';
      continue;
    }
    const explanationMatch = line.match(/^EXPLANATION\s*:\s*(.*)$/i);
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
      mode = 'explanation';
      continue;
    }
    const optionMatch = line.match(/^[-*]\s*\[([xX ])\]\s*(.+)$/);
    if (optionMatch) {
      rawOptions.push({text: optionMatch[2].trim(), correct: /x/i.test(optionMatch[1])});
      mode = null;
      continue;
    }

    if (mode === 'prompt') prompt = `${prompt}\n${rawLine.trim()}`.trim();
    else if (mode === 'explanation') {
      explanation = `${explanation}\n${rawLine.trim()}`.trim();
    }
  }

  if (prompt.length < 2) throw new Error(`Question ${index + 1} is missing PROMPT`);
  if (prompt.length > 2000) throw new Error(`Question ${index + 1} prompt is too long`);
  if (rawOptions.length < 2 || rawOptions.length > 10) {
    throw new Error(`Question ${index + 1} must contain between 2 and 10 checkbox options`);
  }
  if (rawOptions.some(option => !option.text || option.text.length > 500)) {
    throw new Error(`Question ${index + 1} contains an empty or oversized option`);
  }

  let options: LmsQuestionOption[];
  if (type === 'true_false') {
    const normalized = rawOptions.map(option => option.text.toLowerCase());
    if (
      rawOptions.length !== 2 ||
      !normalized.includes('true') ||
      !normalized.includes('false')
    ) {
      throw new Error(`Question ${index + 1} true_false options must be True and False`);
    }
    options = rawOptions.map(option => ({
      id: option.text.toLowerCase() === 'true' ? 'true' : 'false',
      text: option.text.toLowerCase() === 'true' ? 'True' : 'False',
    }));
  } else {
    options = rawOptions.map((option, optionIndex) => ({
      id: `q${index + 1}_option_${optionIndex + 1}`,
      text: option.text,
    }));
  }

  const correctAnswer = rawOptions
    .map((option, optionIndex) => (option.correct ? options[optionIndex].id : null))
    .filter((value): value is string => Boolean(value));
  if (!correctAnswer.length) {
    throw new Error(`Question ${index + 1} must mark at least one option with [x]`);
  }
  if (type !== 'multiple_choice' && correctAnswer.length !== 1) {
    throw new Error(`Question ${index + 1} must mark exactly one correct option`);
  }

  return {
    prompt,
    question_type: type,
    options,
    correct_answer: correctAnswer,
    explanation,
    points,
  };
}

export function parseAssessmentText(
  source: string,
  fallbackTitle = 'Imported Assessment',
): ImportedAssessment {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) throw new Error('The assessment text file is empty');
  if (text.length > 1024 * 1024) throw new Error('Assessment text files must be 1 MB or smaller');

  const lines = text.split('\n');
  const questionStarts = lines
    .map((line, index) => (QUESTION_HEADING.test(line.trim()) ? index : -1))
    .filter(index => index >= 0);
  if (!questionStarts.length) {
    throw new Error('No questions found. Start each question with “## Question 1”');
  }
  if (questionStarts.length > 100) throw new Error('An assessment can contain up to 100 questions');

  const header = lines.slice(0, questionStarts[0]);
  const title = headerValue(header, ['TITLE', 'ASSESSMENT TITLE']) || fallbackTitle;
  const description =
    headerValue(header, ['DESCRIPTION', 'INSTRUCTIONS']) || '';
  if (title.length < 2 || title.length > 180) {
    throw new Error('Assessment title must be between 2 and 180 characters');
  }
  if (description.length > 2000) {
    throw new Error('Assessment description cannot exceed 2,000 characters');
  }

  const questions = questionStarts.map((start, index) => {
    const heading = lines[start].trim().match(QUESTION_HEADING);
    const end = questionStarts[index + 1] ?? lines.length;
    return parseQuestion(lines.slice(start + 1, end), index, heading?.[1]?.trim() ?? '');
  });

  return {
    title,
    description,
    passing_score: integerSetting(
      headerValue(header, ['PASSING SCORE', 'PASSING SCORE %']),
      70,
      1,
      100,
      'Passing score',
    ),
    max_attempts: optionalIntegerSetting(
      headerValue(header, ['MAX ATTEMPTS', 'MAXIMUM ATTEMPTS']),
      100,
      'Maximum attempts',
    ),
    time_limit_minutes: optionalIntegerSetting(
      headerValue(header, ['TIME LIMIT', 'TIME LIMIT MINUTES']),
      1440,
      'Time limit',
    ),
    is_required: booleanSetting(
      headerValue(header, ['REQUIRED']),
      true,
      'Required',
    ),
    is_published: booleanSetting(
      headerValue(header, ['PUBLISHED']),
      false,
      'Published',
    ),
    randomize_questions: booleanSetting(
      headerValue(header, ['RANDOMIZE', 'RANDOMIZE QUESTIONS']),
      false,
      'Randomize questions',
    ),
    questions,
  };
}

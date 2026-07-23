import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {scoreAssessment, normalizeAssessmentAnswers} from '../src/lib/lms/assessmentScoring';
import {validateAssessmentInput} from '../src/lib/lms/assessmentValidation';
import {parseAssessmentText} from '../src/lib/lms/importAssessmentText';

const valid = validateAssessmentInput({
  course_id: 'course-1',
  lesson_id: 'lesson-1',
  scope: 'lesson',
  title: 'Risk Management Check',
  passing_score: 75,
  is_required: true,
  is_published: true,
  questions: [
    {
      prompt: 'Select the protected risk level.',
      question_type: 'single_choice',
      options: [
        {id: 'one', text: 'One percent'},
        {id: 'five', text: 'Five percent'},
      ],
      correct_answer: ['one'],
      points: 2,
    },
    {
      prompt: 'Select both valid controls.',
      question_type: 'multiple_choice',
      options: [
        {id: 'sl', text: 'Stop loss'},
        {id: 'size', text: 'Position size'},
        {id: 'hope', text: 'Hope'},
      ],
      correct_answer: ['sl', 'size'],
      points: 2,
    },
  ],
});

assert.equal(valid.questions.length, 2);
assert.equal(valid.passing_score, 75);

const answers = normalizeAssessmentAnswers({
  [valid.questions[0].prompt]: 'one',
  q1: ['one'],
  q2: ['size', 'sl', 'sl'],
});
assert.deepEqual(answers.q2, ['size', 'sl']);

const scored = scoreAssessment(
  [
    {id: 'q1', points: 2, correct_answer: ['one']},
    {id: 'q2', points: 2, correct_answer: ['sl', 'size']},
  ],
  answers,
);
assert.equal(scored.earnedPoints, 4);
assert.equal(scored.totalPoints, 4);
assert.equal(scored.scorePercent, 100);

const timedOut = scoreAssessment(
  [{id: 'q1', points: 2, correct_answer: ['one']}],
  {q1: ['one']},
  true,
);
assert.equal(timedOut.scorePercent, 0);

assert.throws(
  () =>
    validateAssessmentInput({
      course_id: 'course-1',
      scope: 'final',
      title: 'Final',
      is_published: true,
      questions: [],
    }),
  /at least one question/i,
);

const template = readFileSync('public/templates/lms-assessment-template.txt', 'utf8');
const imported = parseAssessmentText(template, 'Fallback Assessment');
assert.equal(imported.title, 'Risk Management Assessment');
assert.equal(imported.passing_score, 75);
assert.equal(imported.max_attempts, 3);
assert.equal(imported.time_limit_minutes, 20);
assert.equal(imported.is_required, true);
assert.equal(imported.is_published, false);
assert.equal(imported.randomize_questions, true);
assert.equal(imported.questions.length, 3);
assert.equal(imported.questions[0].question_type, 'single_choice');
assert.equal(imported.questions[0].correct_answer.length, 1);
assert.equal(imported.questions[1].question_type, 'multiple_choice');
assert.equal(imported.questions[1].correct_answer.length, 2);
assert.equal(imported.questions[2].question_type, 'true_false');
assert.deepEqual(imported.questions[2].correct_answer, ['false']);

const validatedImport = validateAssessmentInput({
  course_id: 'course-1',
  scope: 'final',
  ...imported,
  is_published: true,
});
assert.equal(validatedImport.questions.length, 3);
assert.equal(validatedImport.questions[2].correct_answer[0], 'false');

assert.throws(
  () =>
    parseAssessmentText(`
TITLE: Broken Assessment
## Question 1
TYPE: single_choice
PROMPT: Which option is correct?
- [ ] First
- [ ] Second
`),
  /mark at least one option/i,
);
assert.throws(() => parseAssessmentText('TITLE: No Questions'), /no questions found/i);

console.log('LMS assessment importer, validation, and scoring tests passed');

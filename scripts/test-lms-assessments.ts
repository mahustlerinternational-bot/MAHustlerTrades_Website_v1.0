import assert from 'node:assert/strict';

import {scoreAssessment, normalizeAssessmentAnswers} from '../src/lib/lms/assessmentScoring';
import {validateAssessmentInput} from '../src/lib/lms/assessmentValidation';

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

console.log('LMS assessment validation and scoring tests passed');

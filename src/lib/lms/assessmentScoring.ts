export interface ScorableQuestion {
  id: string;
  points: number | string | null;
  correct_answer: unknown;
  explanation?: string | null;
}

export function normalizeAssessmentAnswers(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, string[]>;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([questionId, answer]) => [
      questionId,
      [...new Set((Array.isArray(answer) ? answer : [answer]).map(item => String(item)))],
    ]),
  );
}

export function answersMatch(actual: string[], expected: string[]) {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  return left.length === right.length && left.every((answer, index) => answer === right[index]);
}

export function scoreAssessment(
  questions: ScorableQuestion[],
  answers: Record<string, string[]>,
  timedOut = false,
) {
  const correctness = questions.map(question => {
    const expected = Array.isArray(question.correct_answer)
      ? question.correct_answer.map(answer => String(answer))
      : [];
    return {
      question,
      correct: !timedOut && answersMatch(answers[question.id] ?? [], expected),
    };
  });
  const totalPoints = questions.reduce(
    (total, question) => total + Math.max(1, Number(question.points) || 1),
    0,
  );
  const earnedPoints = correctness.reduce(
    (total, result) =>
      total + (result.correct ? Math.max(1, Number(result.question.points) || 1) : 0),
    0,
  );
  return {
    correctness,
    totalPoints,
    earnedPoints,
    scorePercent: totalPoints ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0,
  };
}

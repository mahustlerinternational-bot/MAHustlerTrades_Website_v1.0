'use client';

import {useCallback, useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {
  Award,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {toast} from 'sonner';

import {authFetch} from '@/lib/utils/authFetch';
import type {AssessmentAttemptResult, LmsAssessment, LmsQuestion} from '@/types/lms';

type StartPayload = {
  attempt: {id: string; attempt_number: number; started_at: string};
  assessment: {
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    time_limit_minutes: number | null;
    max_attempts: number | null;
  };
  questions: Array<Omit<LmsQuestion, 'assessment_id'>>;
};

export default function AssessmentModal({
  courseId,
  assessment,
  onClose,
  onComplete,
}: {
  courseId: string;
  assessment: LmsAssessment;
  onClose: () => void;
  onComplete: (result: AssessmentAttemptResult) => Promise<void> | void;
}) {
  const [payload, setPayload] = useState<StartPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<(AssessmentAttemptResult & {timed_out?: boolean}) | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const autoSubmitted = useRef(false);

  const start = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setAnswers({});
    autoSubmitted.current = false;
    try {
      const response = await authFetch(
        `/api/me/courses/${courseId}/assessments/${assessment.id}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({action: 'start'}),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Assessment could not be started');
      setPayload(data);
      if (data.assessment.time_limit_minutes) {
        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(data.attempt.started_at).getTime()) / 1000),
        );
        setSecondsLeft(Math.max(0, data.assessment.time_limit_minutes * 60 - elapsed));
      } else {
        setSecondsLeft(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Assessment could not be started');
    } finally {
      setLoading(false);
    }
  }, [assessment.id, courseId]);

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || result) return;
    const timer = window.setInterval(
      () => setSecondsLeft(current => (current === null ? null : Math.max(0, current - 1))),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsLeft, result]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter(answer => answer.length > 0).length,
    [answers],
  );

  function toggleAnswer(question: StartPayload['questions'][number], optionId: string) {
    if (submitting || result) return;
    setAnswers(current => {
      const existing = current[question.id] ?? [];
      return {
        ...current,
        [question.id]:
          question.question_type === 'multiple_choice'
            ? existing.includes(optionId)
              ? existing.filter(id => id !== optionId)
              : [...existing, optionId]
            : [optionId],
      };
    });
  }

  const submit = useCallback(async () => {
    if (!payload || submitting || result) return;
    setSubmitting(true);
    try {
      const response = await authFetch(
        `/api/me/courses/${courseId}/assessments/${assessment.id}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            action: 'submit',
            attempt_id: payload.attempt.id,
            answers,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Assessment submission failed');
      setResult(data);
      await onComplete(data);
      if (data.status === 'passed') {
        toast.success(
          data.certificate_issued
            ? 'Final assessment passed — your certificate is ready'
            : 'Assessment passed — the next learning step is now unlocked',
        );
      } else {
        toast.error(data.timed_out ? 'Time expired — assessment not passed' : 'Passing score not reached');
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Assessment submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [answers, assessment.id, courseId, onComplete, payload, result, submitting]);

  useEffect(() => {
    if (secondsLeft !== 0 || !payload || result || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void submit();
  }, [payload, result, secondsLeft, submit]);

  function formattedTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <header style={header}>
          <div style={{minWidth: 0}}>
            <p style={eyebrow}>
              {assessment.scope === 'final'
                ? 'FINAL COURSE ASSESSMENT'
                : assessment.scope === 'module'
                  ? 'MODULE ASSESSMENT'
                  : assessment.scope === 'submodule'
                    ? 'SUBMODULE ASSESSMENT'
                    : 'LESSON ASSESSMENT'}
            </p>
            <h2 style={title}>{assessment.title}</h2>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '9px'}}>
            {secondsLeft !== null && (
              <span style={{...timerBadge, color: secondsLeft <= 60 ? '#FF6B78' : '#D4AF37'}}>
                <Clock3 size={12} /> {formattedTime(secondsLeft)}
              </span>
            )}
            <button onClick={onClose} style={iconButton} aria-label="Close assessment">
              <X size={16} />
            </button>
          </div>
        </header>

        {loading ? (
          <div style={center}>
            <Loader2 size={28} color="#D4AF37" className="animate-spin" />
            <p style={{fontSize: '.7rem', color: '#666'}}>Preparing secure assessment…</p>
          </div>
        ) : error ? (
          <div style={center}>
            <LockKeyhole size={30} color="#D4AF37" />
            <h3 style={{fontFamily: 'Cinzel,serif', fontSize: '.95rem'}}>Assessment Unavailable</h3>
            <p style={{fontSize: '.68rem', color: '#777', maxWidth: '460px', textAlign: 'center', lineHeight: 1.65}}>
              {error}
            </p>
            <button onClick={onClose} style={outlineButton}>Close</button>
          </div>
        ) : result ? (
          <ResultPanel result={result} assessment={assessment} onClose={onClose} onRetry={() => void start()} />
        ) : payload ? (
          <>
            <div style={body}>
              <section style={instructions}>
                <ShieldCheck size={22} color="#D4AF37" />
                <div>
                  <p style={{fontSize: '.68rem', color: '#C7C7C7', lineHeight: 1.65}}>
                    {payload.assessment.description ||
                      'Answer every question, then submit your assessment for secure server-side scoring.'}
                  </p>
                  <div style={metaRow}>
                    <span>PASS {payload.assessment.passing_score}%</span>
                    <span>ATTEMPT {payload.attempt.attempt_number}</span>
                    <span>{payload.questions.length} QUESTIONS</span>
                    <span>{payload.assessment.max_attempts ? `${payload.assessment.max_attempts} MAX ATTEMPTS` : 'UNLIMITED ATTEMPTS'}</span>
                  </div>
                </div>
              </section>

              <div style={{display: 'grid', gap: '13px'}}>
                {payload.questions.map((question, questionIndex) => (
                  <section key={question.id} style={questionCard}>
                    <header style={questionHeader}>
                      <span style={numberBadge}>{String(questionIndex + 1).padStart(2, '0')}</span>
                      <div style={{flex: 1}}>
                        <p style={{fontSize: '.72rem', lineHeight: 1.6, color: '#F1F1F1'}}>
                          {question.prompt}
                        </p>
                        {question.question_type === 'multiple_choice' && (
                          <p style={{fontSize: '.54rem', color: '#60A5FA', marginTop: '4px', letterSpacing: '1px'}}>
                            SELECT ALL CORRECT ANSWERS
                          </p>
                        )}
                      </div>
                      <span style={{fontSize: '.53rem', color: '#555'}}>{question.points} PT</span>
                    </header>
                    <div style={{display: 'grid', gap: '7px', padding: '12px'}}>
                      {question.options.map((option, optionIndex) => {
                        const selected = (answers[question.id] ?? []).includes(option.id);
                        return (
                          <label
                            key={option.id}
                            style={{
                              ...optionRow,
                              borderColor: selected ? 'rgba(212,175,55,.48)' : 'rgba(255,255,255,.07)',
                              background: selected ? 'rgba(212,175,55,.07)' : '#0A0A0A',
                            }}
                          >
                            <input
                              type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                              name={`question-${question.id}`}
                              checked={selected}
                              onChange={() => toggleAnswer(question, option.id)}
                              style={{accentColor: '#D4AF37'}}
                            />
                            <span style={optionLetter}>{String.fromCharCode(65 + optionIndex)}</span>
                            <span style={{fontSize: '.68rem', color: selected ? '#FFF' : '#AAA', lineHeight: 1.45}}>
                              {option.text}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <footer style={footer}>
              <div style={{minWidth: '180px'}}>
                <div style={progressTrack}>
                  <div
                    style={{
                      ...progressFill,
                      width: `${payload.questions.length ? (answeredCount / payload.questions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p style={{fontSize: '.54rem', color: '#666', marginTop: '5px'}}>
                  {answeredCount} OF {payload.questions.length} ANSWERED
                </p>
              </div>
              <button
                onClick={() => void submit()}
                disabled={submitting || answeredCount < payload.questions.length}
                style={{
                  ...goldButton,
                  opacity: submitting || answeredCount < payload.questions.length ? 0.45 : 1,
                }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {submitting ? 'Scoring…' : 'Submit Assessment'}
              </button>
            </footer>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  assessment,
  onClose,
  onRetry,
}: {
  result: AssessmentAttemptResult & {timed_out?: boolean};
  assessment: LmsAssessment;
  onClose: () => void;
  onRetry: () => void;
}) {
  const passed = result.status === 'passed';
  return (
    <div style={resultPanel}>
      <div style={{...resultRing, borderColor: passed ? '#34D399' : '#FF6B78'}}>
        {passed ? <CheckCircle2 size={35} color="#34D399" /> : <XCircle size={35} color="#FF6B78" />}
      </div>
      <p style={{...eyebrow, color: passed ? '#34D399' : '#FF6B78'}}>
        {passed ? 'ASSESSMENT PASSED' : result.timed_out ? 'TIME EXPIRED' : 'REVIEW AND TRY AGAIN'}
      </p>
      <p style={{fontFamily: 'Cinzel,serif', fontSize: '2.4rem', fontWeight: 700, color: passed ? '#34D399' : '#FF6B78'}}>
        {Math.round(result.score_percent)}%
      </p>
      <p style={{fontSize: '.7rem', color: '#777', textAlign: 'center', lineHeight: 1.65, maxWidth: '470px'}}>
        {passed
          ? result.certificate_issued
            ? 'You completed the entire course and passed the final assessment. Your electronic certificate is ready to download.'
            : 'Your result has been recorded and the next learning step is now available.'
          : `A score of ${result.passing_score}% is required. Review the lesson material before your next attempt.`}
      </p>
      <div style={scoreGrid}>
        <div style={scoreCell}><strong style={scoreValue}>{result.earned_points}</strong><span style={scoreLabel}>POINTS EARNED</span></div>
        <div style={scoreCell}><strong style={scoreValue}>{result.total_points}</strong><span style={scoreLabel}>POINTS AVAILABLE</span></div>
        <div style={scoreCell}><strong style={scoreValue}>{result.passing_score}%</strong><span style={scoreLabel}>PASSING SCORE</span></div>
      </div>
      <div style={{display: 'flex', gap: '9px', flexWrap: 'wrap', justifyContent: 'center'}}>
        {!passed && (
          <button onClick={onRetry} style={outlineButton}>
            <RotateCcw size={13} /> Start Another Attempt
          </button>
        )}
        <button onClick={onClose} style={passed ? goldButton : outlineButton}>
          {passed && assessment.scope === 'final' ? <Award size={14} /> : null}
          {passed ? 'Continue Course' : 'Return to Lesson'}
        </button>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'};
const modal: CSSProperties = {width: 'min(900px,100%)', maxHeight: '94vh', display: 'flex', flexDirection: 'column', background: '#0C0C0C', border: '1px solid rgba(212,175,55,.25)', boxShadow: '0 30px 100px rgba(0,0,0,.9)', color: '#FFF'};
const header: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0};
const eyebrow: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.54rem', letterSpacing: '3px', color: '#D4AF37'};
const title: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1rem', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis'};
const iconButton: CSSProperties = {width: '32px', height: '32px', display: 'grid', placeItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,.09)', color: '#888', cursor: 'pointer'};
const timerBadge: CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 8px', border: '1px solid rgba(212,175,55,.18)', background: 'rgba(212,175,55,.05)', fontFamily: 'JetBrains Mono,monospace', fontSize: '.64rem'};
const center: CSSProperties = {minHeight: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '30px'};
const body: CSSProperties = {padding: '17px', overflowY: 'auto', display: 'grid', gap: '14px'};
const instructions: CSSProperties = {display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: '10px', padding: '13px', background: 'rgba(212,175,55,.035)', border: '1px solid rgba(212,175,55,.14)'};
const metaRow: CSSProperties = {display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '8px', fontSize: '.52rem', letterSpacing: '1px', color: '#666'};
const questionCard: CSSProperties = {border: '1px solid rgba(255,255,255,.075)', background: '#0F0F0F'};
const questionHeader: CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 13px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const numberBadge: CSSProperties = {fontFamily: 'JetBrains Mono,monospace', color: '#D4AF37', fontSize: '.63rem', paddingTop: '2px'};
const optionRow: CSSProperties = {display: 'grid', gridTemplateColumns: '17px 24px minmax(0,1fr)', gap: '8px', alignItems: 'center', padding: '10px', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', transition: 'all .15s'};
const optionLetter: CSSProperties = {width: '22px', height: '22px', display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,.08)', fontFamily: 'JetBrains Mono,monospace', fontSize: '.57rem', color: '#777'};
const footer: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '13px 18px', borderTop: '1px solid rgba(255,255,255,.07)', flexWrap: 'wrap', flexShrink: 0};
const progressTrack: CSSProperties = {height: '4px', background: '#1B1B1B', overflow: 'hidden'};
const progressFill: CSSProperties = {height: '100%', background: 'linear-gradient(90deg,#B8860B,#D4AF37)', transition: 'width .25s'};
const goldButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 0, padding: '11px 16px', fontFamily: 'Cinzel,serif', fontSize: '.64rem', fontWeight: 700, cursor: 'pointer'};
const outlineButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#111', color: '#999', border: '1px solid rgba(255,255,255,.1)', padding: '10px 14px', fontSize: '.63rem', cursor: 'pointer'};
const resultPanel: CSSProperties = {minHeight: '490px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '13px', padding: '35px 20px'};
const resultRing: CSSProperties = {width: '78px', height: '78px', borderRadius: '50%', border: '2px solid', display: 'grid', placeItems: 'center', background: '#0A0A0A'};
const scoreGrid: CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(100px,1fr))', gap: '8px', width: 'min(520px,100%)', margin: '6px 0'};
const scoreCell: CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '12px 8px', border: '1px solid rgba(255,255,255,.07)', background: '#0A0A0A'};
const scoreValue: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1rem', color: '#D4AF37'};
const scoreLabel: CSSProperties = {fontSize: '.49rem', letterSpacing: '1px', color: '#666'};

'use client';

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileUp,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {toast} from 'sonner';

import {parseAssessmentText} from '@/lib/lms/importAssessmentText';
import {authFetch} from '@/lib/utils/authFetch';
import type {
  AssessmentScope,
  LmsAssessment,
  LmsQuestion,
  LmsQuestionOption,
  QuestionType,
} from '@/types/lms';

export interface AssessmentTarget {
  scope: AssessmentScope;
  module_id: string | null;
  lesson_id: string | null;
  label: string;
}

interface QuestionDraft {
  client_id: string;
  prompt: string;
  question_type: QuestionType;
  options: LmsQuestionOption[];
  correct_answer: string[];
  explanation: string;
  points: string;
}

interface Draft {
  title: string;
  description: string;
  passing_score: string;
  max_attempts: string;
  time_limit_minutes: string;
  is_required: boolean;
  is_published: boolean;
  randomize_questions: boolean;
  questions: QuestionDraft[];
}

let fallbackSequence = 0;

function identifier() {
  const browserCrypto = globalThis.crypto;
  if (typeof browserCrypto?.randomUUID === 'function') {
    return browserCrypto.randomUUID();
  }
  if (typeof browserCrypto?.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    browserCrypto.getRandomValues(values);
    return `option_${Array.from(values, value => value.toString(36)).join('_')}`;
  }
  // Local-network HTTP pages may expose neither Web Crypto method. These IDs
  // are temporary editor keys, so a timestamp plus counter is sufficient.
  fallbackSequence += 1;
  return `option_${Date.now().toString(36)}_${fallbackSequence.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultQuestion(): QuestionDraft {
  return {
    client_id: identifier(),
    prompt: '',
    question_type: 'single_choice',
    options: [
      {id: identifier(), text: ''},
      {id: identifier(), text: ''},
    ],
    correct_answer: [],
    explanation: '',
    points: '1',
  };
}

function fromQuestion(question: LmsQuestion): QuestionDraft {
  return {
    client_id: question.id || identifier(),
    prompt: question.prompt,
    question_type: question.question_type,
    options: Array.isArray(question.options) ? question.options : [],
    correct_answer: Array.isArray(question.correct_answer) ? question.correct_answer : [],
    explanation: question.explanation ?? '',
    points: String(question.points ?? 1),
  };
}

function initialDraft(existing: LmsAssessment | null, target: AssessmentTarget): Draft {
  return {
    title: existing?.title ?? target.label,
    description: existing?.description ?? '',
    passing_score: String(existing?.passing_score ?? 70),
    max_attempts: existing?.max_attempts ? String(existing.max_attempts) : '',
    time_limit_minutes: existing?.time_limit_minutes ? String(existing.time_limit_minutes) : '',
    is_required: existing?.is_required ?? true,
    is_published: existing?.is_published ?? false,
    randomize_questions: existing?.randomize_questions ?? false,
    questions: existing?.questions?.map(fromQuestion) ?? [defaultQuestion()],
  };
}

export default function AssessmentEditorModal({
  courseId,
  target,
  existing,
  onClose,
  onSaved,
}: {
  courseId: string;
  target: AssessmentTarget;
  existing: LmsAssessment | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(existing, target));
  const [saving, setSaving] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const totalPoints = useMemo(
    () => draft.questions.reduce((total, question) => total + (Number(question.points) || 0), 0),
    [draft.questions],
  );

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setDraft(current => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? {...question, ...patch} : question,
      ),
    }));
  }

  function setQuestionType(index: number, questionType: QuestionType) {
    if (questionType === 'true_false') {
      updateQuestion(index, {
        question_type: questionType,
        options: [
          {id: 'true', text: 'True'},
          {id: 'false', text: 'False'},
        ],
        correct_answer: [],
      });
      return;
    }
    const question = draft.questions[index];
    updateQuestion(index, {
      question_type: questionType,
      options:
        question.question_type === 'true_false'
          ? [
              {id: identifier(), text: ''},
              {id: identifier(), text: ''},
            ]
          : question.options,
      correct_answer: [],
    });
  }

  function updateOption(questionIndex: number, optionIndex: number, text: string) {
    const question = draft.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) =>
        index === optionIndex ? {...option, text} : option,
      ),
    });
  }

  function toggleCorrect(questionIndex: number, optionId: string) {
    const question = draft.questions[questionIndex];
    const multiple = question.question_type === 'multiple_choice';
    updateQuestion(questionIndex, {
      correct_answer: multiple
        ? question.correct_answer.includes(optionId)
          ? question.correct_answer.filter(id => id !== optionId)
          : [...question.correct_answer, optionId]
        : [optionId],
    });
  }

  function addOption(questionIndex: number) {
    const question = draft.questions[questionIndex];
    if (question.options.length >= 10) return;
    updateQuestion(questionIndex, {
      options: [...question.options, {id: identifier(), text: ''}],
    });
  }

  function removeOption(questionIndex: number, optionId: string) {
    const question = draft.questions[questionIndex];
    if (question.options.length <= 2) return;
    updateQuestion(questionIndex, {
      options: question.options.filter(option => option.id !== optionId),
      correct_answer: question.correct_answer.filter(id => id !== optionId),
    });
  }

  async function importAssessment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('Assessment text files must be 1 MB or smaller');
      return;
    }

    try {
      const imported = parseAssessmentText(
        await file.text(),
        target.label,
      );
      const containsWork = draft.questions.some(
        question =>
          question.prompt.trim() ||
          question.options.some(option => option.text.trim()) ||
          question.correct_answer.length,
      );
      if (
        containsWork &&
        !confirm(
          `Replace the current assessment settings and ${draft.questions.length} question${draft.questions.length === 1 ? '' : 's'} with “${file.name}”?`,
        )
      ) {
        return;
      }

      setDraft({
        title: imported.title,
        description: imported.description,
        passing_score: String(imported.passing_score),
        max_attempts:
          imported.max_attempts === null ? '' : String(imported.max_attempts),
        time_limit_minutes:
          imported.time_limit_minutes === null
            ? ''
            : String(imported.time_limit_minutes),
        is_required: imported.is_required,
        is_published: imported.is_published,
        randomize_questions: imported.randomize_questions,
        questions: imported.questions.map(question => ({
          client_id: identifier(),
          prompt: question.prompt,
          question_type: question.question_type,
          options: question.options,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          points: String(question.points),
        })),
      });
      toast.success(
        `Imported ${imported.questions.length} assessment question${imported.questions.length === 1 ? '' : 's'}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Assessment text import failed',
      );
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const response = await authFetch(
        existing ? `/api/admin/lms/assessments/${existing.id}` : '/api/admin/lms/assessments',
        {
          method: existing ? 'PATCH' : 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            course_id: courseId,
            module_id: target.module_id,
            lesson_id: target.lesson_id,
            scope: target.scope,
            ...draft,
            max_attempts: draft.max_attempts || null,
            time_limit_minutes: draft.time_limit_minutes || null,
            questions: draft.questions.map(question => ({
              prompt: question.prompt,
              question_type: question.question_type,
              options: question.options,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
              points: question.points,
            })),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Assessment save failed');
      toast.success(existing ? 'Assessment updated' : 'Assessment created');
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Assessment save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing || saving) return;
    if (!confirm(`Delete “${existing.title}” and its attempt history?`)) return;
    setSaving(true);
    try {
      const response = await authFetch(`/api/admin/lms/assessments/${existing.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Assessment delete failed');
      toast.success('Assessment deleted');
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Assessment delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={overlay}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div style={modal} onMouseDown={event => event.stopPropagation()}>
        <header style={header}>
          <div>
            <p style={eyebrow}>{existing ? 'EDIT ASSESSMENT' : 'NEW ASSESSMENT'}</p>
            <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem', marginTop: '4px'}}>
              {target.label}
            </h2>
          </div>
          <button onClick={onClose} style={iconButton} aria-label="Close assessment editor">
            <X size={16} />
          </button>
        </header>

        <div style={body}>
          <div style={introPanel}>
            <ClipboardCheck size={20} color="#D4AF37" />
            <div>
              <strong style={{fontSize: '.72rem'}}>Passing gate</strong>
              <p style={{fontSize: '.62rem', color: '#777', lineHeight: 1.6, marginTop: '3px'}}>
                When required and published, members must reach the passing score before the next
                learning step unlocks.
              </p>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px', gap: '12px'}}>
            <Field label="Assessment title">
              <input
                value={draft.title}
                onChange={event => setDraft({...draft, title: event.target.value})}
                style={input}
              />
            </Field>
            <Field label="Passing score (%)">
              <input
                type="number"
                min="1"
                max="100"
                value={draft.passing_score}
                onChange={event => setDraft({...draft, passing_score: event.target.value})}
                style={input}
              />
            </Field>
          </div>
          <Field label="Instructions">
            <textarea
              rows={3}
              value={draft.description}
              onChange={event => setDraft({...draft, description: event.target.value})}
              style={{...input, resize: 'vertical', lineHeight: 1.6}}
              placeholder="Explain what the member should review before beginning…"
            />
          </Field>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px'}}>
            <Field label="Maximum attempts (blank = unlimited)">
              <input
                type="number"
                min="1"
                value={draft.max_attempts}
                onChange={event => setDraft({...draft, max_attempts: event.target.value})}
                style={input}
              />
            </Field>
            <Field label="Time limit in minutes (optional)">
              <input
                type="number"
                min="1"
                value={draft.time_limit_minutes}
                onChange={event => setDraft({...draft, time_limit_minutes: event.target.value})}
                style={input}
              />
            </Field>
          </div>
          <div style={{display: 'flex', gap: '18px', flexWrap: 'wrap'}}>
            <CheckField
              checked={draft.is_required}
              onChange={checked => setDraft({...draft, is_required: checked})}
              label="Required passing gate"
            />
            <CheckField
              checked={draft.randomize_questions}
              onChange={checked => setDraft({...draft, randomize_questions: checked})}
              label="Randomize question order"
            />
            <CheckField
              checked={draft.is_published}
              onChange={checked => setDraft({...draft, is_published: checked})}
              label="Published to members"
            />
          </div>

          <div style={importPanel}>
            <FileUp size={20} color="#D4AF37" />
            <div style={{flex: 1, minWidth: '220px'}}>
              <p style={eyebrow}>ASSESSMENT TEXT IMPORT</p>
              <p style={{fontSize: '.6rem', color: '#666', lineHeight: 1.55, marginTop: '4px'}}>
                Import the template into this {target.scope === 'final' ? 'final assessment' : 'assessment'}.
                The target lesson/module stays unchanged; imported settings and questions remain
                editable before saving.
              </p>
            </div>
            <input
              ref={importInput}
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              hidden
              onChange={event => void importAssessment(event)}
            />
            <a
              href="/templates/lms-assessment-template.txt"
              download
              style={{...outlineButton, textDecoration: 'none'}}
            >
              <Download size={13} /> Download Template
            </a>
            <button
              type="button"
              onClick={() => importInput.current?.click()}
              style={goldOutlineButton}
            >
              <FileUp size={13} /> Import TXT
            </button>
          </div>

          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
            <div>
              <p style={eyebrow}>QUESTION BUILDER</p>
              <p style={{fontSize: '.58rem', color: '#555', marginTop: '4px'}}>
                {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'} · {totalPoints} points
              </p>
            </div>
            <button
              onClick={() => setDraft({...draft, questions: [...draft.questions, defaultQuestion()]})}
              style={outlineButton}
            >
              <Plus size={13} /> Add Question
            </button>
          </div>

          <div style={{display: 'grid', gap: '12px'}}>
            {draft.questions.map((question, questionIndex) => (
              <section key={question.client_id} style={questionCard}>
                <header style={questionHeader}>
                  <span style={questionNumber}>{String(questionIndex + 1).padStart(2, '0')}</span>
                  <select
                    value={question.question_type}
                    onChange={event => setQuestionType(questionIndex, event.target.value as QuestionType)}
                    style={{...input, width: '190px', padding: '7px 9px'}}
                  >
                    <option value="single_choice">Single choice</option>
                    <option value="multiple_choice">Multiple choice</option>
                    <option value="true_false">True / False</option>
                  </select>
                  <label style={{display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto'}}>
                    <span style={{fontSize: '.53rem', color: '#555'}}>POINTS</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={question.points}
                      onChange={event => updateQuestion(questionIndex, {points: event.target.value})}
                      style={{...input, width: '66px', padding: '7px'}}
                    />
                  </label>
                  <button
                    onClick={() =>
                      setDraft(current => ({
                        ...current,
                        questions: current.questions.filter((_, index) => index !== questionIndex),
                      }))
                    }
                    style={{...iconButton, color: '#FF6B78'}}
                    title="Remove question"
                  >
                    <Trash2 size={13} />
                  </button>
                </header>
                <div style={{padding: '13px', display: 'grid', gap: '11px'}}>
                  <Field label="Question">
                    <textarea
                      rows={2}
                      value={question.prompt}
                      onChange={event => updateQuestion(questionIndex, {prompt: event.target.value})}
                      style={{...input, resize: 'vertical', lineHeight: 1.55}}
                    />
                  </Field>
                  <div style={{display: 'grid', gap: '7px'}}>
                    <span style={label}>Answer options · select the correct answer</span>
                    {question.options.map((option, optionIndex) => (
                      <div key={option.id} style={optionRow}>
                        <input
                          type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                          name={`correct-${question.client_id}`}
                          checked={question.correct_answer.includes(option.id)}
                          onChange={() => toggleCorrect(questionIndex, option.id)}
                          style={{accentColor: '#D4AF37'}}
                        />
                        <input
                          value={option.text}
                          disabled={question.question_type === 'true_false'}
                          onChange={event => updateOption(questionIndex, optionIndex, event.target.value)}
                          style={{...input, padding: '8px 9px'}}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        {question.question_type !== 'true_false' && (
                          <button
                            onClick={() => removeOption(questionIndex, option.id)}
                            style={smallIcon}
                            title="Remove option"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    {question.question_type !== 'true_false' && question.options.length < 10 && (
                      <button onClick={() => addOption(questionIndex)} style={smallTextButton}>
                        + Add answer option
                      </button>
                    )}
                  </div>
                  <Field label="Answer explanation (shown after passing)">
                    <textarea
                      rows={2}
                      value={question.explanation}
                      onChange={event => updateQuestion(questionIndex, {explanation: event.target.value})}
                      style={{...input, resize: 'vertical', lineHeight: 1.55}}
                    />
                  </Field>
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer style={footer}>
          <div>
            {existing && (
              <button onClick={() => void remove()} disabled={saving} style={dangerButton}>
                <Trash2 size={13} /> Delete Assessment
              </button>
            )}
          </div>
          <div style={{display: 'flex', gap: '8px'}}>
            <button onClick={onClose} style={outlineButton}>Cancel</button>
            <button onClick={() => void save()} disabled={saving} style={{...goldButton, opacity: saving ? 0.55 : 1}}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : existing ? <Save size={14} /> : <CheckCircle2 size={14} />}
              {saving ? 'Saving…' : existing ? 'Save Assessment' : 'Create Assessment'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({label: fieldLabel, children}: {label: string; children: React.ReactNode}) {
  return <label><span style={label}>{fieldLabel}</span>{children}</label>;
}

function CheckField({
  checked,
  onChange,
  label: fieldLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.65rem', color: '#999', cursor: 'pointer'}}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} style={{accentColor: '#D4AF37'}} />
      {fieldLabel}
    </label>
  );
}

const overlay: CSSProperties = {position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px'};
const modal: CSSProperties = {width: 'min(1040px,100%)', maxHeight: '94vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid rgba(212,175,55,.25)', boxShadow: '0 28px 90px rgba(0,0,0,.85)'};
const header: CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,.07)'};
const body: CSSProperties = {padding: '18px', overflowY: 'auto', display: 'grid', gap: '14px'};
const footer: CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '13px 18px', borderTop: '1px solid rgba(255,255,255,.07)', background: '#0A0A0A'};
const eyebrow: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.54rem', letterSpacing: '3px', color: '#D4AF37'};
const label: CSSProperties = {display: 'block', fontSize: '.53rem', letterSpacing: '1.6px', textTransform: 'uppercase', color: '#666', marginBottom: '6px'};
const input: CSSProperties = {width: '100%', boxSizing: 'border-box', background: '#080808', border: '1px solid rgba(255,255,255,.1)', color: '#fff', padding: '10px 11px', fontSize: '.7rem', outline: 'none'};
const introPanel: CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '12px 14px', border: '1px solid rgba(212,175,55,.15)', background: 'rgba(212,175,55,.04)'};
const importPanel: CSSProperties = {display: 'flex', alignItems: 'center', gap: '11px', padding: '12px 14px', border: '1px dashed rgba(212,175,55,.22)', background: 'rgba(212,175,55,.025)', flexWrap: 'wrap'};
const questionCard: CSSProperties = {background: '#0A0A0A', border: '1px solid rgba(255,255,255,.075)'};
const questionHeader: CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 11px', borderBottom: '1px solid rgba(255,255,255,.055)', background: 'rgba(255,255,255,.018)'};
const questionNumber: CSSProperties = {fontFamily: 'JetBrains Mono,monospace', fontSize: '.62rem', color: '#D4AF37', minWidth: '25px'};
const optionRow: CSSProperties = {display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) 27px', alignItems: 'center', gap: '7px'};
const iconButton: CSSProperties = {width: '30px', height: '30px', display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,.08)', color: '#777', cursor: 'pointer'};
const smallIcon: CSSProperties = {...iconButton, width: '27px', height: '27px'};
const outlineButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#111', color: '#999', border: '1px solid rgba(255,255,255,.1)', padding: '9px 13px', fontSize: '.63rem', cursor: 'pointer'};
const goldOutlineButton: CSSProperties = {...outlineButton, color: '#D4AF37', borderColor: 'rgba(212,175,55,.3)', background: 'rgba(212,175,55,.045)'};
const goldButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 0, padding: '10px 15px', fontSize: '.65rem', fontWeight: 700, fontFamily: 'Cinzel,serif', cursor: 'pointer'};
const dangerButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'rgba(255,71,87,.06)', border: '1px solid rgba(255,71,87,.18)', color: '#FF6B78', fontSize: '.6rem', cursor: 'pointer'};
const smallTextButton: CSSProperties = {justifySelf: 'start', background: 'none', border: 0, color: '#D4AF37', fontSize: '.6rem', cursor: 'pointer', padding: '3px 0'};

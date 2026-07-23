'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Download,
  Film,
  Image as ImageIcon,
  Layers3,
  Loader2,
  LockKeyhole,
  Menu,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Trophy,
  X,
} from 'lucide-react';
import {toast} from 'sonner';

import AssessmentModal from '@/components/portal/lms/AssessmentModal';
import LessonContent from '@/components/portal/lms/LessonContent';
import {authFetch} from '@/lib/utils/authFetch';
import type {
  AssessmentAttemptResult,
  LmsAssessment,
  LmsCoursePayload,
  LmsLesson,
} from '@/types/lms';

export default function CoursePlayer({courseId}: {courseId: string}) {
  const [data, setData] = useState<LmsCoursePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState<LmsAssessment | null>(null);
  const lastSavedSecond = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/me/courses/${courseId}/lms`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setError('');
      const allLessons: LmsLesson[] = result.modules.flatMap(
        (courseModule: {lessons: LmsLesson[]}) =>
          courseModule.lessons.flatMap(lesson => [lesson, ...(lesson.submodules ?? [])]),
      );
      setSelectedId(current => {
        if (current && allLessons.some(lesson => lesson.id === current)) return current;
        const resume = allLessons.find(lesson => lesson.id === result.summary.last_lesson_id && !lesson.locked);
        const next = allLessons.find(
          lesson =>
            !lesson.locked &&
            (lesson.progress?.status !== 'completed' ||
              (lesson.assessment?.is_required && !lesson.assessment.passed)),
        );
        return resume?.id ?? next?.id ?? allLessons[0]?.id ?? null;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const lessons = useMemo(
    () =>
      data?.modules.flatMap(courseModule =>
        courseModule.lessons.flatMap(lesson => [lesson, ...(lesson.submodules ?? [])]),
      ) ?? [],
    [data],
  );
  const selected = lessons.find(lesson => lesson.id === selectedId) ?? lessons[0] ?? null;
  const index = selected ? lessons.findIndex(lesson => lesson.id === selected.id) : -1;
  const nextLesson = index >= 0 ? lessons[index + 1] ?? null : null;

  async function saveProgress(
    lesson: LmsLesson,
    status: 'in_progress' | 'completed',
    seconds = 0,
    refresh = false,
  ) {
    if (status === 'in_progress' && lesson.progress?.status === 'completed') return true;
    try {
      const response = await authFetch(`/api/me/courses/${courseId}/progress`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          lesson_id: lesson.id,
          status,
          progress_seconds: seconds,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (result.code === 'ASSESSMENT_REQUIRED' && lesson.assessment) {
          setAssessmentOpen(lesson.assessment);
          return false;
        }
        throw new Error(result.error || 'Progress update failed');
      }
      if (refresh) await load();
      return true;
    } catch (reason) {
      if (refresh) toast.error(reason instanceof Error ? reason.message : 'Progress update failed');
      return false;
    }
  }

  function selectLesson(lesson: LmsLesson) {
    if (lesson.locked) {
      toast.error(lesson.lock_reason ?? 'Complete the previous learning step first');
      return;
    }
    setSelectedId(lesson.id);
    setMobileNav(false);
    lastSavedSecond.current = lesson.progress?.progress_seconds ?? 0;
    void saveProgress(lesson, 'in_progress', lesson.progress?.progress_seconds ?? 0);
  }

  async function complete() {
    if (!selected || saving) return;
    if (selected.assessment?.is_required && !selected.assessment.passed) {
      setAssessmentOpen(selected.assessment);
      return;
    }
    setSaving(true);
    const saved = await saveProgress(
      selected,
      'completed',
      Math.max(lastSavedSecond.current, selected.progress?.progress_seconds ?? 0),
      true,
    );
    if (saved) toast.success('Lesson completed');
    setSaving(false);
  }

  function videoProgress(seconds: number) {
    if (
      !selected ||
      selected.progress?.status === 'completed' ||
      seconds - lastSavedSecond.current < 20
    ) {
      return;
    }
    lastSavedSecond.current = Math.floor(seconds);
    void saveProgress(selected, 'in_progress', Math.floor(seconds));
  }

  async function assessmentCompleted(result: AssessmentAttemptResult) {
    if (result.status === 'passed') await load();
  }

  function openAssessment(assessment: LmsAssessment | null | undefined) {
    if (!assessment) return;
    if (assessment.locked) {
      toast.error(assessment.lock_reason ?? 'Complete the preceding learning steps first');
      return;
    }
    if (assessment.passed) {
      toast.success(`Assessment already passed${assessment.best_score !== null ? ` · ${Math.round(assessment.best_score ?? 0)}%` : ''}`);
      return;
    }
    setAssessmentOpen(assessment);
  }

  if (loading && !data) {
    return (
      <div style={page}>
        <div style={center}>
          <Loader2 size={28} color="#D4AF37" className="animate-spin" />
          <p style={{fontSize: '.72rem', color: '#666'}}>Loading course…</p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={page}>
        <div style={center}>
          <LockKeyhole size={31} color="#D4AF37" />
          <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.1rem'}}>Course Access Required</h1>
          <p style={{fontSize: '.72rem', color: '#777', maxWidth: '420px', textAlign: 'center', lineHeight: 1.6}}>
            {error || 'This course is unavailable.'}
          </p>
          <Link href="/portal/courses" style={goldLink}>Return to My Courses</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        @media(max-width:900px){
          .lms-player-nav{display:none!important}
          .lms-player-nav.open{display:flex!important;position:fixed!important;inset:72px 0 0 0!important;width:auto!important;z-index:80!important;max-height:none!important}
          .lms-player-main{margin-left:0!important;padding:18px!important}
          .lms-mobile-toggle{display:grid!important}
          .lms-header-stats{display:none!important}
        }
      `}</style>

      <header style={topHeader}>
        <div style={{minWidth: 0}}>
          <Link href="/portal/courses" style={{fontSize: '.6rem', color: '#777', textDecoration: 'none'}}>
            ← My Courses
          </Link>
          <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px'}}>
            {data.course.title}
          </h1>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <div className="lms-header-stats" style={{display: 'flex', alignItems: 'center', gap: '18px'}}>
            <div style={{textAlign: 'right'}}>
              <p style={{fontSize: '.53rem', color: '#777'}}>LESSON PROGRESS</p>
              <p style={{fontSize: '.67rem', color: '#BBB', marginTop: '2px'}}>
                {data.summary.completed} / {data.summary.total}
              </p>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{fontSize: '.53rem', color: '#777'}}>ASSESSMENTS</p>
              <p style={{fontSize: '.67rem', color: '#BBB', marginTop: '2px'}}>
                {data.summary.completed_assessments} / {data.summary.total_assessments}
              </p>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{fontSize: '.53rem', color: '#777'}}>AVERAGE SCORE</p>
              <p style={{fontSize: '.67rem', color: '#D4AF37', marginTop: '2px'}}>
                {data.summary.average_score === null ? '—' : `${data.summary.average_score}%`}
              </p>
            </div>
          </div>
          <div style={{textAlign: 'right'}}>
            <p style={{fontSize: '.56rem', color: '#777'}}>TOTAL COURSE PROGRESS</p>
            <p style={{fontFamily: 'Cinzel,serif', fontSize: '.8rem', color: '#D4AF37', marginTop: '2px'}}>
              {data.summary.percent}% COMPLETE
            </p>
          </div>
          <button
            className="lms-mobile-toggle"
            onClick={() => setMobileNav(value => !value)}
            style={mobileButton}
          >
            {mobileNav ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </header>

      <div style={{display: 'flex', minHeight: 'calc(100vh - 154px)'}}>
        <aside className={`lms-player-nav ${mobileNav ? 'open' : ''}`} style={sidebar}>
          <div style={{padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.05)'}}>
            <div style={progressTrack}><div style={{...progressFill, width: `${data.summary.percent}%`}} /></div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '7px', fontSize: '.52rem', color: '#666'}}>
              <span>{data.summary.percent}% COMPLETE</span>
              <span>{data.summary.average_score === null ? 'NO SCORES YET' : `${data.summary.average_score}% AVG`}</span>
            </div>
          </div>

          <div style={{flex: 1, overflowY: 'auto', padding: '10px'}}>
            {data.modules.map((courseModule, moduleIndex) => (
              <section key={courseModule.id} style={{marginBottom: '16px', opacity: courseModule.locked ? 0.62 : 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 7px'}}>
                  {courseModule.locked ? <LockKeyhole size={11} color="#666" /> : <Layers3 size={11} color="#D4AF37" />}
                  <p style={{fontSize: '.53rem', letterSpacing: '2px', color: '#666'}}>
                    MODULE {moduleIndex + 1}
                  </p>
                </div>
                <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '.68rem', padding: '0 7px 7px', lineHeight: 1.4}}>
                  {courseModule.title}
                </h2>

                {courseModule.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.id}>
                    <LessonNavButton
                      lesson={lesson}
                      label={`${lessonIndex + 1}. ${lesson.title}`}
                      active={lesson.id === selected?.id}
                      onClick={() => selectLesson(lesson)}
                    />
                    {(lesson.submodules ?? []).map((submodule, submoduleIndex) => (
                      <div key={submodule.id} style={{paddingLeft: '17px'}}>
                        <LessonNavButton
                          lesson={submodule}
                          label={`${lessonIndex + 1}.${submoduleIndex + 1} ${submodule.title}`}
                          active={submodule.id === selected?.id}
                          nested
                          onClick={() => selectLesson(submodule)}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {courseModule.assessment && (
                  <button
                    onClick={() => openAssessment(courseModule.assessment)}
                    style={{
                      ...assessmentNavButton,
                      opacity: courseModule.assessment.locked ? 0.55 : 1,
                      borderColor: courseModule.assessment.passed
                        ? 'rgba(52,211,153,.2)'
                        : 'rgba(212,175,55,.16)',
                    }}
                  >
                    {courseModule.assessment.locked ? (
                      <LockKeyhole size={13} />
                    ) : courseModule.assessment.passed ? (
                      <CheckCircle2 size={14} color="#34D399" />
                    ) : (
                      <ClipboardCheck size={14} color="#D4AF37" />
                    )}
                    <span style={{minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      Module Assessment
                    </span>
                    {courseModule.assessment.best_score !== null && (
                      <span style={{fontSize: '.52rem', color: '#34D399'}}>
                        {Math.round(courseModule.assessment.best_score ?? 0)}%
                      </span>
                    )}
                  </button>
                )}
              </section>
            ))}

            {data.final_assessment && (
              <section style={finalNavSection}>
                <p style={{fontSize: '.52rem', letterSpacing: '2px', color: '#D4AF37', marginBottom: '7px'}}>
                  COURSE COMPLETION
                </p>
                <button
                  onClick={() => openAssessment(data.final_assessment)}
                  style={{
                    ...assessmentNavButton,
                    margin: 0,
                    opacity: data.final_assessment.locked ? 0.55 : 1,
                  }}
                >
                  {data.final_assessment.locked ? (
                    <LockKeyhole size={13} />
                  ) : data.final_assessment.passed ? (
                    <Trophy size={14} color="#34D399" />
                  ) : (
                    <Award size={14} color="#D4AF37" />
                  )}
                  <span style={{flex: 1, textAlign: 'left'}}>Final Course Assessment</span>
                  {data.final_assessment.best_score !== null && (
                    <span style={{fontSize: '.52rem', color: '#34D399'}}>
                      {Math.round(data.final_assessment.best_score ?? 0)}%
                    </span>
                  )}
                </button>
              </section>
            )}
          </div>
        </aside>

        <main className="lms-player-main" style={main}>
          {!selected ? (
            <div style={center}>
              <BookOpen size={35} color="#555" />
              <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem'}}>Curriculum Coming Soon</h2>
              <p style={{fontSize: '.7rem', color: '#666'}}>
                The administrator has not published any lessons yet.
              </p>
            </div>
          ) : (
            <article style={{maxWidth: '980px', margin: '0 auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '16px'}}>
                <div>
                  <p style={{fontSize: '.55rem', letterSpacing: '2.5px', color: '#D4AF37'}}>
                    {selected.parent_lesson_id ? 'SUBMODULE' : 'LESSON'} {index + 1} OF {lessons.length}
                  </p>
                  <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1.45rem', marginTop: '7px', lineHeight: 1.25}}>
                    {selected.title}
                  </h2>
                  <div style={{display: 'flex', gap: '13px', flexWrap: 'wrap', marginTop: '7px'}}>
                    {selected.duration_seconds && (
                      <p style={metaText}><Clock size={12} /> {Math.ceil(selected.duration_seconds / 60)} minutes</p>
                    )}
                    {selected.assessment && (
                      <p style={metaText}>
                        <ClipboardCheck size={12} />
                        Assessment · pass {selected.assessment.passing_score}%
                      </p>
                    )}
                  </div>
                </div>
                <LessonStatus lesson={selected} />
              </div>

              <LessonMediaStage
                lesson={selected}
                slot="introduction"
                mediaType={selected.intro_media?.type ?? (selected.playback_url ? 'video' : null)}
                playbackUrl={selected.intro_playback_url ?? selected.playback_url ?? null}
                onProgress={videoProgress}
              />

              <div style={contentPanel}>
                {selected.content ? (
                  <LessonContent content={selected.content} />
                ) : (
                  <div style={{textAlign: 'center', padding: '35px', color: '#555'}}>
                    <BookOpen size={24} />
                    <p style={{fontSize: '.68rem', marginTop: '9px'}}>Lesson notes will appear here.</p>
                  </div>
                )}
              </div>

              <LessonMediaStage
                lesson={selected}
                slot="outro"
                mediaType={selected.outro_media?.type ?? null}
                playbackUrl={selected.outro_playback_url ?? null}
                onProgress={videoProgress}
              />

              {selected.assessment && (
                <AssessmentGate
                  assessment={selected.assessment}
                  onOpen={() => openAssessment(selected.assessment)}
                />
              )}

              {data.final_assessment && (
                <FinalAssessmentPanel
                  assessment={data.final_assessment}
                  onOpen={() => openAssessment(data.final_assessment)}
                />
              )}

              {(data.certificate.issued || data.certificate.eligible) && (
                <CertificatePanel
                  courseId={courseId}
                  certificateNumber={data.certificate.certificate_number}
                  verificationCode={data.certificate.verification_code}
                  issued={data.certificate.issued}
                />
              )}

              <footer style={lessonFooter}>
                <button
                  disabled={index <= 0}
                  onClick={() => index > 0 && selectLesson(lessons[index - 1])}
                  style={{...navButton, opacity: index <= 0 ? 0.35 : 1}}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => void complete()}
                  disabled={saving || selected.progress?.status === 'completed'}
                  style={{
                    ...completeButton,
                    opacity: saving || selected.progress?.status === 'completed' ? 0.5 : 1,
                  }}
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : selected.assessment?.is_required && !selected.assessment.passed ? (
                    <ClipboardCheck size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                  {selected.progress?.status === 'completed'
                    ? 'Completed'
                    : selected.assessment?.is_required && !selected.assessment.passed
                      ? 'Take Quiz to Complete'
                      : 'Mark Complete'}
                </button>
                <button
                  disabled={!nextLesson || Boolean(nextLesson.locked)}
                  onClick={() => nextLesson && selectLesson(nextLesson)}
                  style={{
                    ...navButton,
                    opacity: !nextLesson || nextLesson.locked ? 0.35 : 1,
                  }}
                  title={nextLesson?.locked ? nextLesson.lock_reason ?? 'Complete this step first' : undefined}
                >
                  {nextLesson?.locked ? <LockKeyhole size={13} /> : null}
                  Next <ChevronRight size={14} />
                </button>
              </footer>
            </article>
          )}
        </main>
      </div>

      {assessmentOpen && (
        <AssessmentModal
          courseId={courseId}
          assessment={assessmentOpen}
          onComplete={assessmentCompleted}
          onClose={() => setAssessmentOpen(null)}
        />
      )}
    </div>
  );
}

function LessonNavButton({
  lesson,
  label,
  active,
  nested = false,
  onClick,
}: {
  lesson: LmsLesson;
  label: string;
  active: boolean;
  nested?: boolean;
  onClick: () => void;
}) {
  const done = lesson.progress?.status === 'completed';
  const assessmentPassed = !lesson.assessment?.is_required || lesson.assessment.passed;
  const fullyComplete = done && assessmentPassed;
  return (
    <button
      onClick={onClick}
      title={lesson.locked ? lesson.lock_reason ?? undefined : undefined}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '20px minmax(0,1fr) auto',
        gap: '7px',
        alignItems: 'center',
        textAlign: 'left',
        padding: nested ? '7px 8px' : '9px 8px',
        marginBottom: '3px',
        background: active ? 'rgba(212,175,55,.09)' : 'transparent',
        border: active ? '1px solid rgba(212,175,55,.2)' : '1px solid transparent',
        color: active ? '#fff' : lesson.locked ? '#4F4F4F' : '#888',
        cursor: lesson.locked ? 'not-allowed' : 'pointer',
      }}
    >
      {lesson.locked ? (
        <LockKeyhole size={13} color="#4F4F4F" />
      ) : fullyComplete ? (
        <CheckCircle2 size={14} color="#34D399" />
      ) : (
        <Circle size={13} color={active ? '#D4AF37' : '#555'} />
      )}
      <span style={{fontSize: nested ? '.61rem' : '.65rem', lineHeight: 1.35}}>{label}</span>
      {lesson.assessment?.best_score !== null && lesson.assessment?.best_score !== undefined ? (
        <span style={{fontSize: '.5rem', color: lesson.assessment.passed ? '#34D399' : '#F59E0B'}}>
          {Math.round(lesson.assessment.best_score)}%
        </span>
      ) : lesson.duration_seconds ? (
        <span style={{fontSize: '.5rem', color: '#555'}}>{Math.ceil(lesson.duration_seconds / 60)}m</span>
      ) : null}
    </button>
  );
}

function LessonStatus({lesson}: {lesson: LmsLesson}) {
  if (lesson.progress?.status === 'completed') {
    return <span style={completeBadge}><Check size={12} /> Completed</span>;
  }
  if (lesson.assessment?.passed) {
    return <span style={passedBadge}><ShieldCheck size={12} /> Quiz Passed</span>;
  }
  return <span style={inProgressBadge}><PlayCircle size={12} /> In Progress</span>;
}

function AssessmentGate({
  assessment,
  onOpen,
}: {
  assessment: LmsAssessment;
  onOpen: () => void;
}) {
  return (
    <section
      style={{
        ...assessmentPanel,
        borderColor: assessment.passed ? 'rgba(52,211,153,.24)' : 'rgba(212,175,55,.2)',
      }}
    >
      <div style={assessmentIcon}>
        {assessment.passed ? <CheckCircle2 size={25} color="#34D399" /> : <ClipboardCheck size={25} color="#D4AF37" />}
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <p style={{fontSize: '.54rem', letterSpacing: '2px', color: assessment.passed ? '#34D399' : '#D4AF37'}}>
          {assessment.passed ? 'ASSESSMENT PASSED' : 'KNOWLEDGE CHECK REQUIRED'}
        </p>
        <h3 style={{fontFamily: 'Cinzel,serif', fontSize: '.85rem', marginTop: '5px'}}>
          {assessment.title}
        </h3>
        <p style={{fontSize: '.62rem', color: '#777', lineHeight: 1.6, marginTop: '5px'}}>
          {assessment.passed
            ? `Best score ${Math.round(assessment.best_score ?? 0)}% · ${assessment.attempts_used ?? 0} attempt${assessment.attempts_used === 1 ? '' : 's'}`
            : `${assessment.question_count ?? 0} questions · ${assessment.passing_score}% passing score${assessment.max_attempts ? ` · ${assessment.max_attempts} maximum attempts` : ''}`}
        </p>
      </div>
      <button
        onClick={onOpen}
        disabled={assessment.passed}
        style={{
          ...(assessment.passed ? passedButton : completeButton),
          opacity: assessment.passed ? 0.65 : 1,
        }}
      >
        {assessment.passed ? <Check size={13} /> : <ClipboardCheck size={13} />}
        {assessment.passed ? 'Passed' : 'Take Assessment'}
      </button>
    </section>
  );
}

function FinalAssessmentPanel({
  assessment,
  onOpen,
}: {
  assessment: LmsAssessment;
  onOpen: () => void;
}) {
  const locked = Boolean(assessment.locked);
  const passed = Boolean(assessment.passed);

  return (
    <section
      style={{
        ...finalAssessmentPanel,
        borderColor: passed
          ? 'rgba(52,211,153,.34)'
          : locked
            ? 'rgba(255,255,255,.09)'
            : 'rgba(212,175,55,.48)',
        background: passed
          ? 'linear-gradient(135deg,rgba(52,211,153,.1),rgba(52,211,153,.025))'
          : locked
            ? 'linear-gradient(135deg,rgba(255,255,255,.025),rgba(255,255,255,.01))'
            : 'linear-gradient(135deg,rgba(212,175,55,.15),rgba(212,175,55,.035))',
      }}
    >
      <div
        style={{
          ...finalAssessmentSeal,
          borderColor: passed
            ? 'rgba(52,211,153,.3)'
            : locked
              ? 'rgba(255,255,255,.1)'
              : 'rgba(212,175,55,.4)',
        }}
      >
        {passed ? (
          <Trophy size={30} color="#34D399" />
        ) : locked ? (
          <LockKeyhole size={27} color="#555" />
        ) : (
          <Award size={30} color="#D4AF37" />
        )}
      </div>
      <div style={{flex: 1, minWidth: '220px'}}>
        <p
          style={{
            fontSize: '.54rem',
            letterSpacing: '2.5px',
            color: passed ? '#34D399' : locked ? '#666' : '#D4AF37',
          }}
        >
          {passed
            ? 'FINAL COURSE ASSESSMENT PASSED'
            : locked
              ? 'FINAL COURSE ASSESSMENT LOCKED'
              : 'COURSEWORK COMPLETE · FINAL COURSE ASSESSMENT UNLOCKED'}
        </p>
        <h3 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem', marginTop: '6px'}}>
          {assessment.title || 'Final Course Assessment'}
        </h3>
        <p style={{fontSize: '.64rem', color: '#777', lineHeight: 1.65, marginTop: '6px'}}>
          {passed
            ? `You passed with a best score of ${Math.round(assessment.best_score ?? 0)}%. Your electronic certificate is now available below.`
            : locked
              ? assessment.lock_reason ??
                'Complete every lesson, quiz, and module assessment to unlock the final assessment.'
              : `All required lessons and module assessments are complete. Pass this ${assessment.question_count ?? 0}-question final assessment with ${assessment.passing_score}% or higher to unlock your certificate.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        disabled={locked || passed}
        style={{
          ...(passed ? passedButton : completeButton),
          minWidth: '190px',
          opacity: locked ? 0.42 : passed ? 0.72 : 1,
          cursor: locked || passed ? 'not-allowed' : 'pointer',
        }}
      >
        {passed ? (
          <>
            <CheckCircle2 size={15} /> Final Course Assessment Passed
          </>
        ) : locked ? (
          <>
            <LockKeyhole size={14} /> Complete Course First
          </>
        ) : (
          <>
            <Award size={15} /> Take Final Course Assessment
          </>
        )}
      </button>
    </section>
  );
}

function CertificatePanel({
  courseId,
  certificateNumber,
  verificationCode,
  issued,
}: {
  courseId: string;
  certificateNumber: string | null;
  verificationCode: string | null;
  issued: boolean;
}) {
  return (
    <section style={certificatePanel}>
      <div style={certificateSeal}><Award size={29} color="#D4AF37" /></div>
      <div style={{flex: 1}}>
        <p style={{fontSize: '.54rem', letterSpacing: '2.3px', color: '#D4AF37'}}>ELECTRONIC CERTIFICATE</p>
        <h3 style={{fontFamily: 'Cinzel,serif', fontSize: '.9rem', marginTop: '5px'}}>
          {issued ? 'Course Completion Validated' : 'Certificate Ready to Issue'}
        </h3>
        <p style={{fontSize: '.6rem', color: '#777', marginTop: '5px'}}>
          {certificateNumber ?? 'Your verified certificate record will be created when downloaded.'}
        </p>
      </div>
      {issued && verificationCode && (
        <Link
          href={`/certificate/verify/${encodeURIComponent(verificationCode)}`}
          target="_blank"
          rel="noreferrer"
          style={{...navButton, textDecoration: 'none'}}
        >
          <QrCode size={13} /> Verify Online
        </Link>
      )}
      <a href={`/api/me/courses/${courseId}/certificate?download=1`} style={{...completeButton, textDecoration: 'none'}}>
        <Download size={13} /> Download PDF
      </a>
    </section>
  );
}

function LessonMediaStage({
  lesson,
  slot,
  mediaType,
  playbackUrl,
  onProgress,
}: {
  lesson: LmsLesson;
  slot: 'introduction' | 'outro';
  mediaType: 'video' | 'image' | null;
  playbackUrl: string | null;
  onProgress: (seconds: number) => void;
}) {
  const label=slot==='introduction'?'LESSON INTRODUCTION':'LESSON OUTRO';
  if (!playbackUrl || !mediaType) {
    if(slot==='outro')return null;
    return (
      <div style={videoPlaceholder}>
        <div style={mediaPlaceholderIcons}>
          <Film size={31} color="#555" />
          <span style={{color:'#333',fontSize:'.55rem'}}>OR</span>
          <ImageIcon size={31} color="#555" />
        </div>
        <p style={{fontFamily: 'Cinzel,serif', fontSize: '.72rem', letterSpacing: '2px', color: '#666'}}>
          {label} MEDIA PLACEHOLDER
        </p>
        <span style={{fontSize: '.58rem', color: '#444'}}>
          Your instructor can display a video or image here.
        </span>
      </div>
    );
  }
  if(mediaType==='image'){
    return (
      <figure style={lessonImageStage}>
        <span style={mediaStageLabel}>{label}</span>
        <img src={playbackUrl} alt={`${lesson.title} ${slot}`} style={lessonImage}/>
      </figure>
    );
  }
  const embed = embedVideoUrl(playbackUrl);
  if (embed) {
    return (
      <div style={videoWrap}>
        <span style={mediaStageLabel}>{label}</span>
        <iframe
          src={embed}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0}}
        />
      </div>
    );
  }
  return (
    <div style={directVideoStage}>
      <span style={mediaStageLabel}>{label}</span>
      <video
        key={`${lesson.id}-${slot}`}
        controls
        controlsList="nodownload"
        preload="metadata"
        src={playbackUrl}
        onTimeUpdate={event => onProgress(event.currentTarget.currentTime)}
        style={{width: '100%', maxHeight: '560px', background: '#000', display: 'block'}}
      />
    </div>
  );
}

function embedVideoUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

const page: CSSProperties = {minHeight: '100vh', background: '#090909', color: '#fff', fontFamily: 'Montserrat,sans-serif'};
const topHeader: CSSProperties = {height: '82px', padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: '#0D0D0D', borderBottom: '1px solid rgba(212,175,55,.12)', position: 'sticky', top: '72px', zIndex: 30};
const sidebar: CSSProperties = {width: '310px', flexShrink: 0, background: '#0D0D0D', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 154px)', position: 'sticky', top: '154px'};
const main: CSSProperties = {flex: 1, minWidth: 0, padding: '28px', background: '#090909'};
const center: CSSProperties = {minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px'};
const progressTrack: CSSProperties = {height: '5px', background: '#1C1C1C', overflow: 'hidden'};
const progressFill: CSSProperties = {height: '100%', background: 'linear-gradient(90deg,#B8860B,#D4AF37)', transition: 'width .4s'};
const videoWrap: CSSProperties = {position: 'relative', paddingTop: '56.25%', background: '#000', marginBottom: '18px'};
const videoPlaceholder: CSSProperties = {height: 'min(420px,42vw)', minHeight: '230px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'radial-gradient(circle at center,#171717,#050505)', border: '1px solid rgba(255,255,255,.06)', marginBottom: '18px'};
const mediaPlaceholderIcons: CSSProperties = {display:'flex',alignItems:'center',gap:'12px',padding:'12px 17px',border:'1px solid rgba(255,255,255,.055)',background:'rgba(255,255,255,.015)'};
const mediaStageLabel: CSSProperties = {position:'absolute',top:'10px',left:'10px',zIndex:2,padding:'5px 8px',background:'rgba(0,0,0,.78)',border:'1px solid rgba(212,175,55,.22)',color:'#D4AF37',fontSize:'.48rem',letterSpacing:'1.5px',fontFamily:'Cinzel,serif'};
const lessonImageStage: CSSProperties = {position:'relative',display:'grid',placeItems:'center',minHeight:'230px',maxHeight:'560px',overflow:'hidden',background:'#050505',border:'1px solid rgba(255,255,255,.07)',marginBottom:'18px'};
const lessonImage: CSSProperties = {display:'block',width:'100%',maxHeight:'560px',objectFit:'contain'};
const directVideoStage: CSSProperties = {position:'relative',background:'#000',marginBottom:'18px',border:'1px solid rgba(255,255,255,.06)'};
const contentPanel: CSSProperties = {background: '#101010', border: '1px solid rgba(255,255,255,.06)', padding: '24px', marginBottom: '18px'};
const lessonFooter: CSSProperties = {display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,.06)', flexWrap: 'wrap'};
const navButton: CSSProperties = {display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 13px', background: '#111', border: '1px solid rgba(255,255,255,.09)', color: '#999', fontSize: '.65rem', cursor: 'pointer'};
const completeButton: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 18px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', border: 0, color: '#000', fontFamily: 'Cinzel,serif', fontSize: '.65rem', fontWeight: 700, cursor: 'pointer'};
const passedButton: CSSProperties = {...completeButton, background: 'rgba(52,211,153,.1)', color: '#34D399', border: '1px solid rgba(52,211,153,.2)'};
const completeBadge: CSSProperties = {display: 'flex', alignItems: 'center', gap: '5px', fontSize: '.58rem', color: '#34D399', border: '1px solid rgba(52,211,153,.22)', background: 'rgba(52,211,153,.07)', padding: '5px 8px'};
const passedBadge: CSSProperties = {...completeBadge, color: '#60A5FA', borderColor: 'rgba(96,165,250,.22)', background: 'rgba(96,165,250,.07)'};
const inProgressBadge: CSSProperties = {...completeBadge, color: '#D4AF37', borderColor: 'rgba(212,175,55,.2)', background: 'rgba(212,175,55,.06)'};
const mobileButton: CSSProperties = {display: 'none', width: '34px', height: '34px', placeItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,.1)', color: '#D4AF37'};
const goldLink: CSSProperties = {padding: '10px 16px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', textDecoration: 'none', fontFamily: 'Cinzel,serif', fontSize: '.65rem', fontWeight: 700};
const metaText: CSSProperties = {display: 'flex', alignItems: 'center', gap: '5px', fontSize: '.62rem', color: '#666'};
const assessmentNavButton: CSSProperties = {width: 'calc(100% - 14px)', margin: '5px 7px 0', display: 'flex', alignItems: 'center', gap: '7px', padding: '9px', background: 'rgba(212,175,55,.035)', border: '1px solid rgba(212,175,55,.16)', color: '#999', fontSize: '.61rem', cursor: 'pointer'};
const finalNavSection: CSSProperties = {margin: '8px 7px', padding: '11px', border: '1px solid rgba(212,175,55,.2)', background: 'linear-gradient(135deg,rgba(212,175,55,.07),rgba(212,175,55,.02))'};
const assessmentPanel: CSSProperties = {display: 'flex', alignItems: 'center', gap: '13px', padding: '16px', background: '#101010', border: '1px solid rgba(212,175,55,.2)', marginBottom: '18px', flexWrap: 'wrap'};
const assessmentIcon: CSSProperties = {width: '48px', height: '48px', display: 'grid', placeItems: 'center', border: '1px solid rgba(212,175,55,.18)', background: '#090909'};
const finalAssessmentPanel: CSSProperties = {display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', marginBottom: '18px', border: '1px solid rgba(212,175,55,.4)', flexWrap: 'wrap', boxShadow: '0 14px 36px rgba(0,0,0,.2)'};
const finalAssessmentSeal: CSSProperties = {width: '62px', height: '62px', flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid rgba(212,175,55,.4)', background: '#090909'};
const certificatePanel: CSSProperties = {display: 'flex', alignItems: 'center', gap: '14px', padding: '17px', marginBottom: '18px', background: 'linear-gradient(135deg,rgba(212,175,55,.1),rgba(212,175,55,.025))', border: '1px solid rgba(212,175,55,.3)', flexWrap: 'wrap'};
const certificateSeal: CSSProperties = {width: '55px', height: '55px', borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid rgba(212,175,55,.35)', background: '#090909'};

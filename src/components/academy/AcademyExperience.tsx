'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Gem,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Menu,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import styles from './AcademyExperience.module.css';

export interface AcademyCurriculumSection {
  id: string;
  title: string;
  description: string | null;
  lessons: string[];
  gateLabel: string | null;
  previewAvailable: boolean;
}

export interface AcademyCourse {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  level: string;
  market: string | null;
  durationHours: number | null;
  lessonCount: number;
  curriculum: AcademyCurriculumSection[];
  assessmentCount: number;
  finalAssessment: {
    title: string;
    passingScore: number;
  } | null;
}

const nav = [
  ['Home', '/'],
  ['Academy', '/academy'],
  ['Quant AI', '/quant-ai'],
  ['Events', '/events'],
  ['Members', '/portal/dashboard'],
] as const;

const beforeAfter = [
  ['Before the program', [
    'Disconnected strategies and information overload',
    'Unstructured chart analysis and entry decisions',
    'Inconsistent risk and no repeatable review process',
  ]],
  ['Through the learning journey', [
    'A repeatable XAUUSD analysis routine',
    'Defined execution, invalidation, and risk criteria',
    'Measured progress through lessons and assessments',
  ]],
] as const;

const learningSystem = [
  {
    icon: <Route size={20} />,
    eyebrow: 'Guided progression',
    title: 'A Path, Not a Playlist',
    body: 'Move through a structured learning sequence with visible lesson progress instead of collecting disconnected videos.',
  },
  {
    icon: <ClipboardCheck size={20} />,
    eyebrow: 'Knowledge validation',
    title: 'Assessment-Gated Learning',
    body: 'Validate understanding at key checkpoints before advancing to the next stage of the course.',
  },
  {
    icon: <Award size={20} />,
    eyebrow: 'Verified completion',
    title: 'Final Assessment & Certificate',
    body: 'Complete the full course and pass the final assessment to unlock a verifiable electronic certificate.',
  },
] as const;

const faq = [
  {
    question: 'Can I preview the curriculum before creating an account?',
    answer:
      'Yes. The published learning journey is displayed on this page. Creating a free account is only required when you are ready to access lessons or choose an enrollment path.',
  },
  {
    question: 'Do approved Elite Members pay separately for eligible courses?',
    answer:
      'No. Members with approved Elite access can unlock eligible Academy courses at no additional monthly cost. Elite Lifetime Access remains a separate offer where applicable.',
  },
  {
    question: 'Can I access a course without applying for Elite membership?',
    answer:
      'Yes. Selected courses can also be accessed directly. Sign in or create a free account to review the current course-access and payment details privately.',
  },
  {
    question: 'Does completing a course guarantee trading profits?',
    answer:
      'No. The Academy provides education, structured practice, risk-management frameworks, and assessment. Trading involves risk, and results depend on the individual.',
  },
] as const;

function meaningfulDescription(course: AcademyCourse) {
  const description = course.description?.trim();
  if (description && description.toLowerCase() !== course.title.trim().toLowerCase()) {
    return description;
  }
  return 'A structured learning journey from XAUUSD foundations and risk control to market intelligence, disciplined execution, and AI-assisted system development.';
}

function sectionLabel(title: string, index: number) {
  const match = title.match(/^WEEK\s+(\d+)\s*[—-]\s*(.+)$/i);
  if (!match) return {number: String(index + 1).padStart(2, '0'), title};
  return {number: match[1].padStart(2, '0'), title: match[2]};
}

export default function AcademyExperience({courses}: {courses: AcademyCourse[]}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? '');
  const [openSection, setOpenSection] = useState<string | null>(courses[0]?.curriculum[0]?.id ?? null);
  const [showFullCurriculum, setShowFullCurriculum] = useState(false);

  const course = useMemo(
    () => courses.find(item => item.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId],
  );

  const visibleCurriculum = course
    ? showFullCurriculum
      ? course.curriculum
      : course.curriculum.slice(0, 6)
    : [];

  function selectCourse(courseId: string) {
    const next = courses.find(item => item.id === courseId);
    setSelectedCourseId(courseId);
    setOpenSection(next?.curriculum[0]?.id ?? null);
    setShowFullCurriculum(false);
    requestAnimationFrame(() => document.getElementById('curriculum')?.scrollIntoView({behavior: 'smooth'}));
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="MAHustler Trades home">
          <span>MAHustler</span>
          <small>TRADES</small>
        </Link>

        <div className={styles.desktopNav}>
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className={href === '/academy' ? styles.activeNav : ''}>
              {label}
            </Link>
          ))}
        </div>

        <div className={styles.navActions}>
          <Link href="/portal/courses" className={styles.signInLink}>Member Sign In</Link>
          <Link
            href="/portal?tab=register&returnTo=/portal/courses"
            className={styles.goldButtonSmall}
          >
            Create Free Account
          </Link>
        </div>

        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setMobileOpen(value => !value)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {mobileOpen && (
          <div className={styles.mobileNav}>
            {nav.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>{label}</Link>
            ))}
            <Link href="/portal/courses" onClick={() => setMobileOpen(false)}>Member Sign In</Link>
            <Link
              href="/portal?tab=register&returnTo=/portal/courses"
              className={styles.mobileGoldLink}
              onClick={() => setMobileOpen(false)}
            >
              Create Free Account
            </Link>
          </div>
        )}
      </nav>

      <section className={styles.hero}>
        {course?.coverImageUrl && (
          <div
            className={styles.heroArtwork}
            style={{backgroundImage: `url("${course.coverImageUrl.replace(/"/g, '%22')}")`}}
          />
        )}
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />

        <div className={styles.heroContent}>
          <div className={styles.availabilityBadge}>
            <span className={styles.statusDot} />
            Private enrollment and Elite access paths available
          </div>
          <p className={styles.eyebrow}>Private XAUUSD Trading Education</p>
          <h1>
            Stop Guessing.
            <span>Start Reading Gold With Structure.</span>
          </h1>
          <p className={styles.heroCopy}>
            Build a repeatable framework for analyzing XAUUSD, controlling risk, planning execution,
            and measuring your development through a guided professional learning system.
          </p>
          <div className={styles.heroActions}>
            <a href="#curriculum" className={styles.goldButton}>
              Preview the Learning Journey <ArrowRight size={15} />
            </a>
            <a href="#access" className={styles.outlineButton}>
              Discover Your Access Path
            </a>
          </div>
          <p className={styles.microcopy}>
            Explore the curriculum first. No payment or credit card is required to preview the program.
          </p>
          <div className={styles.heroTrust}>
            <span><Check size={13} /> Structured progression</span>
            <span><Check size={13} /> Practical assessments</span>
            <span><Check size={13} /> Verified certificate</span>
          </div>
        </div>

        {course && (
          <aside className={styles.heroCourseCard} aria-label="Featured Academy program">
            <div className={styles.courseImage}>
              {course.coverImageUrl ? (
                // The cover is uploaded by the administrator and may be hosted on any configured storage domain.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.coverImageUrl} alt={`${course.title} course cover`} />
              ) : course.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.logoUrl} alt={`${course.title} logo`} className={styles.containImage} />
              ) : (
                <GraduationCap size={58} />
              )}
              <span className={styles.privateBadge}><LockKeyhole size={11} /> Private program</span>
            </div>
            <div className={styles.courseCardBody}>
              <p className={styles.cardEyebrow}>{course.level} · {course.market ?? 'Trading'}</p>
              <h2>{course.title}</h2>
              <p>{meaningfulDescription(course)}</p>
              <div className={styles.courseStats}>
                <span><Layers3 size={14} /><strong>{course.curriculum.length}</strong> learning stages</span>
                <span><BookOpen size={14} /><strong>{course.lessonCount}</strong> published units</span>
                {course.durationHours ? (
                  <span><Clock3 size={14} /><strong>{course.durationHours}h</strong> listed media</span>
                ) : null}
              </div>
              <a href="#curriculum" className={styles.cardLink}>
                Open curriculum preview <ArrowRight size={13} />
              </a>
            </div>
          </aside>
        )}
      </section>

      <section className={styles.realitySection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>The Market Reality</p>
          <h2>The Problem Isn&apos;t a Lack of Trading Information.</h2>
          <p>
            Most aspiring traders already have indicators, videos, signals, and strategies. What is
            usually missing is a structured process for deciding what to trade, why a setup is valid,
            how much to risk, and how to learn from the outcome.
          </p>
        </div>
        <div className={styles.realityStatement}>
          <div className={styles.quoteMark}>“</div>
          <p>
            MAHustler Academy turns disconnected information into a measurable trading-development
            journey—built around process, risk discipline, and deliberate practice.
          </p>
          <span>THE STRUCTURED EXECUTION APPROACH</span>
        </div>
      </section>

      <section className={styles.transformationSection}>
        <div className={styles.centeredIntro}>
          <p className={styles.eyebrow}>From Information to Process</p>
          <h2>Build the Habits Behind More Disciplined Decisions.</h2>
          <p>
            The goal is not to promise an outcome. It is to help you replace random decisions with a
            process you can explain, execute, review, and improve.
          </p>
        </div>
        <div className={styles.transformationGrid}>
          {beforeAfter.map(([title, points], groupIndex) => (
            <article key={title} className={groupIndex === 1 ? styles.afterCard : styles.beforeCard}>
              <div className={styles.transformCardHeader}>
                {groupIndex === 1 ? <Target size={20} /> : <BarChart3 size={20} />}
                <h3>{title}</h3>
              </div>
              <div className={styles.transformList}>
                {points.map(point => (
                  <p key={point}>
                    <span>{groupIndex === 1 ? <Check size={13} /> : '—'}</span>
                    {point}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.curriculumSection} id="curriculum">
        <div className={styles.curriculumHeader}>
          <div>
            <p className={styles.eyebrow}>Peek Behind the Curtain</p>
            <h2>A Complete Learning Journey—Before You Commit.</h2>
            <p>
              Review the published stages and learning outcomes. Execution materials, lesson content,
              assessments, and protected resources unlock through your chosen access path.
            </p>
          </div>
          {course && (
            <div className={styles.curriculumSummary}>
              <span><strong>{course.curriculum.length}</strong> stages</span>
              <span><strong>{course.lessonCount}</strong> units</span>
              <span><strong>{course.finalAssessment ? 'Included' : 'Planned'}</strong> final assessment</span>
            </div>
          )}
        </div>

        {courses.length > 1 && (
          <div className={styles.coursePicker} aria-label="Available Academy programs">
            {courses.map(item => (
              <button
                key={item.id}
                type="button"
                className={item.id === course?.id ? styles.selectedCourseButton : ''}
                onClick={() => selectCourse(item.id)}
              >
                <small>{item.level}</small>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        )}

        {course ? (
          <div className={styles.curriculumLayout}>
            <div className={styles.accordion}>
              {visibleCurriculum.map((section, index) => {
                const label = sectionLabel(section.title, index);
                const isOpen = openSection === section.id;
                return (
                  <article key={section.id} className={isOpen ? styles.openAccordionItem : styles.accordionItem}>
                    <button
                      type="button"
                      className={styles.accordionButton}
                      onClick={() => setOpenSection(isOpen ? null : section.id)}
                      aria-expanded={isOpen}
                    >
                      <span className={styles.stageNumber}>{label.number}</span>
                      <span className={styles.stageTitle}>
                        <small>Learning stage</small>
                        <strong>{label.title}</strong>
                      </span>
                      <span className={styles.stageMeta}>
                        {section.lessons.length} lesson{section.lessons.length === 1 ? '' : 's'}
                      </span>
                      <ChevronDown size={17} className={styles.chevron} />
                    </button>
                    {isOpen && (
                      <div className={styles.accordionContent}>
                        {section.description && <p className={styles.moduleDescription}>{section.description}</p>}
                        <div className={styles.lessonList}>
                          {section.lessons.length ? section.lessons.map((lesson, lessonIndex) => (
                            <div key={`${section.id}-${lesson}`} className={styles.lessonRow}>
                              <span>{String(lessonIndex + 1).padStart(2, '0')}</span>
                              <p>{lesson}</p>
                              <LockKeyhole size={12} />
                            </div>
                          )) : (
                            <p className={styles.emptyStage}>Detailed lesson material unlocks inside the course workspace.</p>
                          )}
                        </div>
                        {section.gateLabel && (
                          <div className={styles.gateRow}>
                            <ShieldCheck size={16} />
                            <div>
                              <strong>{section.gateLabel}</strong>
                              <small>Validate this stage before advancing</small>
                            </div>
                            <LockKeyhole size={13} />
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

              {course.curriculum.length > 6 && (
                <button
                  type="button"
                  className={styles.showAllButton}
                  onClick={() => setShowFullCurriculum(value => !value)}
                >
                  {showFullCurriculum
                    ? 'Show condensed curriculum'
                    : `Reveal all ${course.curriculum.length} learning stages`}
                  <ChevronDown size={14} />
                </button>
              )}

              {course.finalAssessment && (
                <div className={styles.finalAssessment}>
                  <div className={styles.finalIcon}><Award size={22} /></div>
                  <div>
                    <small>Course completion gateway</small>
                    <strong>{course.finalAssessment.title}</strong>
                    <p>
                      Complete every required lesson and pass with at least {course.finalAssessment.passingScore}%
                      to unlock your electronic certificate.
                    </p>
                  </div>
                  <LockKeyhole size={16} />
                </div>
              )}
            </div>

            <aside className={styles.artifactPreview}>
              <p className={styles.eyebrow}>Inside the Workspace</p>
              <h3>Your Structured Execution Framework</h3>
              <p>
                The course is designed to move from knowledge to a repeatable preparation and review process.
              </p>
              <div className={styles.artifactWindow}>
                <div className={styles.artifactBar}>
                  <span />
                  <small>Illustrative learning framework</small>
                </div>
                {['Market context', 'Pre-session bias', 'Risk parameters', 'Execution conditions'].map((label, index) => (
                  <div key={label} className={styles.artifactLine}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{label}</strong>
                    <div />
                  </div>
                ))}
                <div className={styles.artifactLock}>
                  <LockKeyhole size={18} />
                  <strong>Protected course materials</strong>
                  <small>Unlocked after access is confirmed</small>
                </div>
              </div>
              <div className={styles.previewProof}>
                <BadgeCheck size={17} />
                <p>
                  You can inspect the complete learning architecture now. Only the teaching content and
                  execution materials remain protected.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className={styles.emptyAcademy}>
            <GraduationCap size={34} />
            <h3>Private programs are being prepared.</h3>
            <p>Create a free account to be notified when the next published course becomes available.</p>
            <Link href="/portal?tab=register&returnTo=/portal/courses" className={styles.goldButton}>
              Create Free Account <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>

      <section className={styles.systemSection}>
        <div className={styles.centeredIntro}>
          <p className={styles.eyebrow}>More Than Course Videos</p>
          <h2>A Learning System That Makes Progress Visible.</h2>
          <p>
            Every layer is designed to help students understand where they are, what they have validated,
            and what must be completed next.
          </p>
        </div>
        <div className={styles.systemGrid}>
          {learningSystem.map(item => (
            <article key={item.title}>
              <div className={styles.systemIcon}>{item.icon}</div>
              <small>{item.eyebrow}</small>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.accessSection} id="access">
        <div className={styles.centeredIntro}>
          <p className={styles.eyebrow}>Choose Your Access Path</p>
          <h2>Explore First. Decide When You&apos;re Ready.</h2>
          <p>
            No forced checkout and no hidden commitment. Start with a free account, then choose the path
            that matches how you want to use the Academy.
          </p>
        </div>
        <div className={styles.accessGrid}>
          <article className={styles.eliteAccessCard}>
            <div className={styles.accessIcon}><Gem size={23} /></div>
            <p className={styles.cardEyebrow}>The complete ecosystem</p>
            <h3>Verified Elite Member Access</h3>
            <p>
              Open and verify an eligible broker account through MAHustler Trades to unlock qualifying
              Academy courses and the wider Elite member workspace.
            </p>
            <ul>
              <li><Check size={13} /> Eligible Academy courses included</li>
              <li><Check size={13} /> Elite Tools and Trading Journal</li>
              <li><Check size={13} /> Elite Vault and member resources</li>
              <li><Check size={13} /> Live signals and Elite Events access</li>
            </ul>
            <Link
              href="/portal?tab=register&returnTo=/portal/ib"
              className={styles.goldButton}
            >
              Explore Elite Membership <ArrowRight size={15} />
            </Link>
            <small className={styles.accessNote}>
              Broker eligibility and account verification are required. Elite Lifetime Access is excluded.
            </small>
          </article>

          <article className={styles.directAccessCard}>
            <div className={styles.accessIcon}><BookOpen size={23} /></div>
            <p className={styles.cardEyebrow}>A focused learning path</p>
            <h3>Direct Course Access</h3>
            <p>
              Prefer to begin with one selected program? Create a free member account and privately review
              the current course-access details before making a decision.
            </p>
            <ul>
              <li><Check size={13} /> Choose an individual published course</li>
              <li><Check size={13} /> Full LMS lesson and progress tracking</li>
              <li><Check size={13} /> Assessments and final validation</li>
              <li><Check size={13} /> Electronic certificate after completion</li>
            </ul>
            <Link
              href="/portal?tab=register&returnTo=/portal/courses"
              className={styles.outlineButton}
            >
              View Course Access Details <ArrowRight size={15} />
            </Link>
            <small className={styles.accessNote}>
              Review the available program and exact access details before committing.
            </small>
          </article>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.faqIntro}>
          <p className={styles.eyebrow}>Before You Begin</p>
          <h2>Clear Answers. No Pressure.</h2>
          <p>Everything you need to understand the next step before creating your account.</p>
        </div>
        <div className={styles.faqList}>
          {faq.map(item => (
            <details key={item.question}>
              <summary>
                {item.question}
                <ChevronDown size={16} />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.closingSection}>
        <div className={styles.closingGlow} />
        <Sparkles size={24} className={styles.closingIcon} />
        <p className={styles.eyebrow}>Your Next Step</p>
        <h2>Your Next Trade Doesn&apos;t Need to Be Another Guess.</h2>
        <p>
          Build the knowledge, process, and discipline needed to approach XAUUSD with greater structure
          and accountability.
        </p>
        <div className={styles.heroActions}>
          <a href="#curriculum" className={styles.goldButton}>
            Preview the Private Curriculum <ArrowRight size={15} />
          </a>
          <Link
            href="/portal?tab=register&returnTo=/portal/courses"
            className={styles.outlineButton}
          >
            Create My Free Account
          </Link>
        </div>
        <small>Start free. Explore the platform. Choose your access path when you are ready.</small>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <strong>MAHustler</strong>
          <span>TRADES</span>
        </div>
        <p>
          Educational content only. Trading involves substantial risk and does not guarantee financial returns.
        </p>
        <div>
          <Link href="/">Home</Link>
          <Link href="/portal">Member Portal</Link>
          <Link href="/events">Events</Link>
        </div>
      </footer>
    </main>
  );
}

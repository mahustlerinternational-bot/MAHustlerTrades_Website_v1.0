'use client';

import Link from 'next/link';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Play,
  RotateCcw,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { Course, Enrollment, PaymentMethod } from '@/types';
import type {CourseProgressSummary} from '@/types/lms';

interface EnrollmentWithCourse extends Omit<Enrollment, 'course'> {
  course: Course | null;
  lms_summary?: CourseProgressSummary;
}

const LEVEL_COLOR: Record<string, string> = {
  Beginner: '#34D399',
  Intermediate: '#60A5FA',
  Advanced: '#F59E0B',
  Expert: '#F87171',
  'All Levels': '#A78BFA',
};

const ACCESS_LABEL: Record<PaymentMethod, string> = {
  ib_grant: 'Verified Elite Access',
  admin_grant: 'Enrollment Grant',
  coupon: 'Coupon Enrollment',
  free: 'Free Enrollment',
  ziina: 'Ziina Enrollment',
  stripe: 'Paid Enrollment',
};

const GST_SHORT_DATE = new Intl.DateTimeFormat('en-AE', {
  timeZone: 'Asia/Dubai',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDuration(hours: number | null) {
  const totalMinutes = Math.max(0, Math.round(Number(hours || 0) * 60));
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function CourseCard({ enrollment }: { enrollment: EnrollmentWithCourse }) {
  const course = enrollment.course;
  if (!course) return null;

  const progress = enrollment.lms_summary ?? {
    completed: 0,
    total: 0,
    percent: 0,
    completed_assessments: 0,
    total_assessments: 0,
    average_score: null,
    latest_score: null,
    last_viewed_at: null,
    last_lesson_id: null,
    next_lesson_title: null,
    certificate_issued: false,
  };
  const percent = Math.min(100, Math.max(0, Number(progress.percent) || 0));
  const hasStarted = Boolean(progress.last_viewed_at) || percent > 0;
  const isComplete = percent >= 100 || progress.certificate_issued;
  const actionLabel = isComplete ? 'Review Course' : hasStarted ? 'Continue Learning' : 'Start Course';
  const ActionIcon = isComplete ? RotateCcw : Play;
  const levelColor = LEVEL_COLOR[course.level] ?? '#D4AF37';

  return (
    <article className="group flex h-full flex-col overflow-hidden border border-[rgba(212,175,55,0.15)] bg-[#101010] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(212,175,55,0.38)] hover:shadow-[0_20px_55px_rgba(0,0,0,0.4)]">
      <div className="relative h-48 overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.2),transparent_55%),#090909]">
        {course.cover_image_url ? (
          <img
            src={course.cover_image_url}
            alt={`${course.title} cover`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : course.logo_url ? (
          <div className="flex h-full w-full items-center justify-center p-8">
            <img src={course.logo_url} alt={`${course.title} logo`} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap size={58} strokeWidth={1} className="text-[#D4AF37]/55" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span
            className="border bg-black/75 px-2.5 py-1 text-[9px] uppercase tracking-[1.7px] backdrop-blur-sm"
            style={{ color: levelColor, borderColor: `${levelColor}55` }}
          >
            {course.level}
          </span>
          {course.market && (
            <span className="border border-white/10 bg-black/75 px-2.5 py-1 text-[9px] uppercase tracking-[1.7px] text-white/65 backdrop-blur-sm">
              {course.market}
            </span>
          )}
        </div>

        {isComplete && (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[9px] uppercase tracking-[1.5px] text-emerald-300 backdrop-blur-sm">
            <Award size={11} /> Completed
          </span>
        )}

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[1.4px]">
            <span className="text-white/65">Course progress</span>
            <span className="font-mono text-[#E4C65A]">{percent}%</span>
          </div>
          <div className="h-1 overflow-hidden bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#F0D36A] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-base font-semibold leading-snug text-white">{course.title}</h3>
        {course.description && (
          <p
            className="mt-2 text-[11px] leading-5 text-[#777]"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {course.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3">
          <div className="flex items-center gap-2 text-[10px] text-[#777]">
            <Clock3 size={12} className="text-[#D4AF37]" />
            <span>{course.duration_hours ? formatDuration(course.duration_hours) : '00:00'}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#777]">
            <BookOpen size={12} className="text-[#D4AF37]" />
            <span>{progress.total || Number(course.lesson_count) || 0} lessons</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-[10px] text-[#777]">
            <ClipboardCheck size={12} className="text-[#D4AF37]" />
            <span>{progress.completed_assessments}/{progress.total_assessments}</span>
          </div>
        </div>

        {(progress.next_lesson_title || progress.average_score !== null || progress.certificate_issued) && (
          <div className="mt-3 grid gap-2 border border-white/[0.06] bg-black/20 p-3">
            {progress.next_lesson_title && !isComplete && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-[8px] uppercase tracking-[1.3px] text-[#555]">Current lesson</span>
                <span className="max-w-[65%] text-right text-[9px] leading-4 text-white/70">
                  {progress.next_lesson_title}
                </span>
              </div>
            )}
            {progress.average_score !== null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[8px] uppercase tracking-[1.3px] text-[#555]">Assessment average</span>
                <span className="font-mono text-[10px] text-blue-300">{progress.average_score}%</span>
              </div>
            )}
            {progress.certificate_issued && (
              <div className="flex items-center justify-between gap-3 text-emerald-300">
                <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[1.3px]"><Trophy size={10} /> Certificate</span>
                <span className="text-[9px]">Issued</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[1.5px] text-emerald-400">
              <CheckCircle2 size={11} /> Active Enrollment
            </p>
            <p className="mt-1.5 text-[9px] tracking-[0.5px] text-[#666]">
              {ACCESS_LABEL[enrollment.payment_method] ?? 'Enrollment Grant'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-[#777]">
              {progress.total ? `${progress.completed} of ${progress.total} completed` : 'Curriculum coming soon'}
            </p>
            <p className="mt-1.5 flex items-center justify-end gap-1 text-[8px] uppercase tracking-[1px] text-[#4D4D4D]">
              <CalendarDays size={9} /> Enrolled {GST_SHORT_DATE.format(new Date(enrollment.enrolled_at))}
            </p>
          </div>
        </div>

        <Link
          href={`/portal/courses/${course.id}`}
          className="mt-5 flex items-center justify-center gap-2 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-4 py-3 font-serif text-[10px] font-bold uppercase tracking-[2px] text-black transition-opacity hover:opacity-90"
        >
          <ActionIcon size={13} /> {actionLabel}
        </Link>
      </div>
    </article>
  );
}

export function EnrolledCourseList({ enrollments }: { enrollments: EnrollmentWithCourse[] }) {
  const valid = enrollments.filter(enrollment => Boolean(enrollment.course));
  const started = valid.filter(enrollment => {
    const progress = enrollment.lms_summary;
    return Boolean(progress?.last_viewed_at) && (progress?.percent ?? 0) < 100;
  });
  const ordered = [...valid].sort((a, b) => {
    const aStarted = started.includes(a) ? 1 : 0;
    const bStarted = started.includes(b) ? 1 : 0;
    if (aStarted !== bStarted) return bStarted - aStarted;
    return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime();
  });

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="border border-white/[0.06] bg-[#101010] px-4 py-3">
          <p className="text-[9px] uppercase tracking-[2px] text-[#555]">Learning Library</p>
          <p className="mt-1 flex items-center gap-2 font-serif text-lg text-white"><GraduationCap size={16} className="text-[#D4AF37]" /> {valid.length}</p>
        </div>
        <div className="border border-white/[0.06] bg-[#101010] px-4 py-3">
          <p className="text-[9px] uppercase tracking-[2px] text-[#555]">In Progress</p>
          <p className="mt-1 flex items-center gap-2 font-serif text-lg text-white"><TrendingUp size={16} className="text-blue-400" /> {started.length}</p>
        </div>
        <div className="border border-white/[0.06] bg-[#101010] px-4 py-3">
          <p className="text-[9px] uppercase tracking-[2px] text-[#555]">Completed</p>
          <p className="mt-1 flex items-center gap-2 font-serif text-lg text-white">
            <Award size={16} className="text-emerald-400" />
            {valid.filter(enrollment => {
              const progress = enrollment.lms_summary;
              return Boolean(progress?.certificate_issued) || (progress?.percent ?? 0) >= 100;
            }).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {ordered.map(enrollment => <CourseCard key={enrollment.id} enrollment={enrollment} />)}
      </div>
    </div>
  );
}

export default EnrolledCourseList;

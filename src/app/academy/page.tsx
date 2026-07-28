import type {Metadata} from 'next';
import AcademyExperience, {
  type AcademyCourse,
  type AcademyCurriculumSection,
} from '@/components/academy/AcademyExperience';
import {supabaseAdmin} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Private Trading Academy | MAHustler Trades',
  description:
    'Preview the structured MAHustler Trades learning journey, assessments, Elite access path, and professional course-completion experience.',
};

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  level: string;
  market: string | null;
  duration_hours: number | null;
  lesson_count: number | null;
}

interface ModuleRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  is_preview: boolean;
  sort_order: number;
}

interface AssessmentRow {
  course_id: string;
  scope: string;
  title: string;
  passing_score: number;
}

function cleanTitle(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim();
}

function buildModuleSections(module: ModuleRow, lessons: LessonRow[]): AcademyCurriculumSection[] {
  const sorted = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
  const weekSections: AcademyCurriculumSection[] = [];
  let current: AcademyCurriculumSection | null = null;

  sorted.forEach((lesson, index) => {
    const title = cleanTitle(lesson.title);
    const nextTitle = cleanTitle(sorted[index + 1]?.title ?? '');
    const startsWeek = /^WEEK\s+\d+\b/i.test(title);
    const followedByLesson = /^LESSON\s+\d+/i.test(nextTitle);
    const isWeekHeading = startsWeek && followedByLesson;
    const isGate = /(?:^|\s)GATE(?:\s|$)/i.test(title);

    if (isWeekHeading) {
      if (current) weekSections.push(current);
      current = {
        id: lesson.id,
        title,
        description: weekSections.length === 0 ? module.description : null,
        lessons: [],
        gateLabel: null,
        previewAvailable: lesson.is_preview,
      };
      return;
    }

    if (isGate && current) {
      current.gateLabel = 'Progress Gate & Assessment';
      current.previewAvailable ||= lesson.is_preview;
      return;
    }

    if (/^\d+\s+WEEKS?\s+XAUUSD/i.test(title)) return;

    if (!current) {
      current = {
        id: `${module.id}-overview`,
        title: cleanTitle(module.title),
        description: module.description,
        lessons: [],
        gateLabel: null,
        previewAvailable: false,
      };
    }

    current.lessons.push(title);
    current.previewAvailable ||= lesson.is_preview;
  });

  if (current) weekSections.push(current);
  if (weekSections.length) return weekSections;

  return [{
    id: module.id,
    title: cleanTitle(module.title),
    description: module.description,
    lessons: sorted.map(lesson => cleanTitle(lesson.title)),
    gateLabel: null,
    previewAvailable: sorted.some(lesson => lesson.is_preview),
  }];
}

async function getPublishedAcademy(): Promise<AcademyCourse[]> {
  try {
    const coursesResult = await supabaseAdmin
      .from('courses')
      .select('id,title,description,cover_image_url,logo_url,level,market,duration_hours,lesson_count')
      .eq('is_published', true)
      .order('sort_order');

    const courses = (coursesResult.data ?? []) as CourseRow[];
    if (!courses.length || coursesResult.error) return [];

    const courseIds = courses.map(course => course.id);
    const [modulesResult, assessmentsResult] = await Promise.all([
      supabaseAdmin
        .from('course_modules')
        .select('id,course_id,title,description,sort_order')
        .in('course_id', courseIds)
        .order('sort_order'),
      supabaseAdmin
        .from('lms_assessments')
        .select('course_id,scope,title,passing_score')
        .in('course_id', courseIds)
        .eq('is_published', true),
    ]);

    const modules = (modulesResult.data ?? []) as ModuleRow[];
    const moduleIds = modules.map(module => module.id);
    const lessonsResult = moduleIds.length
      ? await supabaseAdmin
          .from('course_lessons')
          .select('id,module_id,title,is_preview,sort_order')
          .in('module_id', moduleIds)
          .eq('is_published', true)
          .order('sort_order')
      : {data: []};

    const lessons = (lessonsResult.data ?? []) as LessonRow[];
    const assessments = (assessmentsResult.data ?? []) as AssessmentRow[];

    return courses.map(course => {
      const courseModules = modules.filter(module => module.course_id === course.id);
      const curriculum = courseModules.flatMap(module =>
        buildModuleSections(
          module,
          lessons.filter(lesson => lesson.module_id === module.id),
        ),
      );
      const courseAssessments = assessments.filter(assessment => assessment.course_id === course.id);
      const finalAssessment = courseAssessments.find(assessment => assessment.scope === 'final');
      const publishedLessonCount = courseModules.reduce(
        (total, module) => total + lessons.filter(lesson => lesson.module_id === module.id).length,
        0,
      );

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        coverImageUrl: course.cover_image_url,
        logoUrl: course.logo_url,
        level: course.level,
        market: course.market,
        durationHours: course.duration_hours,
        lessonCount: publishedLessonCount || course.lesson_count || 0,
        curriculum,
        assessmentCount: courseAssessments.length,
        finalAssessment: finalAssessment
          ? {
              title: finalAssessment.title,
              passingScore: Number(finalAssessment.passing_score),
            }
          : null,
      };
    });
  } catch {
    return [];
  }
}

export default async function AcademyPage() {
  const courses = await getPublishedAcademy();
  return <AcademyExperience courses={courses} />;
}

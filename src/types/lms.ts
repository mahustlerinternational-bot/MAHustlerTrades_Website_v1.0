export type LessonProgressStatus = 'in_progress' | 'completed';
export type AssessmentScope = 'module' | 'lesson' | 'submodule' | 'final';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';
export type AttemptStatus = 'in_progress' | 'passed' | 'failed';

export interface LmsQuestionOption {
  id: string;
  text: string;
}

export interface LmsQuestion {
  id: string;
  assessment_id: string;
  prompt: string;
  question_type: QuestionType;
  options: LmsQuestionOption[];
  /** Only present in authenticated admin payloads. */
  correct_answer?: string[];
  explanation?: string | null;
  points: number;
  sort_order: number;
}

export type LessonMediaType = 'video' | 'image';

export interface LessonMedia {
  type: LessonMediaType;
  url: string | null;
  storage_path?: string | null;
}

export interface LmsAssessment {
  id: string;
  course_id: string;
  module_id: string | null;
  lesson_id: string | null;
  scope: AssessmentScope;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  is_required: boolean;
  is_published: boolean;
  randomize_questions: boolean;
  question_count?: number;
  questions?: LmsQuestion[];
  best_score?: number | null;
  latest_score?: number | null;
  attempts_used?: number;
  passed?: boolean;
  locked?: boolean;
  lock_reason?: string | null;
}

export interface LessonProgress {
  status: LessonProgressStatus;
  progress_seconds: number;
  completed_at: string | null;
  last_viewed_at?: string | null;
}

export interface LmsLesson {
  id: string;
  module_id: string;
  parent_lesson_id: string | null;
  title: string;
  content: string;
  video_url: string | null;
  video_storage_path?: string | null;
  playback_url?: string | null;
  intro_media?: LessonMedia | null;
  outro_media?: LessonMedia | null;
  intro_playback_url?: string | null;
  outro_playback_url?: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_preview: boolean;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
  progress?: LessonProgress | null;
  assessment?: LmsAssessment | null;
  submodules?: LmsLesson[];
  locked?: boolean;
  lock_reason?: string | null;
}

export interface LmsModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  lessons: LmsLesson[];
  assessment?: LmsAssessment | null;
  locked?: boolean;
  lock_reason?: string | null;
}

export interface CourseProgressSummary {
  completed: number;
  total: number;
  percent: number;
  completed_assessments: number;
  total_assessments: number;
  average_score: number | null;
  latest_score: number | null;
  last_viewed_at: string | null;
  last_lesson_id: string | null;
  next_lesson_title: string | null;
  certificate_issued: boolean;
}

export interface LmsCoursePayload {
  course: {
    id: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    level: string;
    market: string | null;
    lms_sequential: boolean;
  };
  modules: LmsModule[];
  final_assessment: LmsAssessment | null;
  certificate: {
    eligible: boolean;
    issued: boolean;
    certificate_number: string | null;
    verification_code: string | null;
    issued_at: string | null;
    has_template: boolean;
  };
  summary: CourseProgressSummary;
}

export interface AssessmentAttemptResult {
  attempt_id: string;
  status: 'passed' | 'failed';
  score_percent: number;
  earned_points: number;
  total_points: number;
  passing_score: number;
  explanations: Array<{
    question_id: string;
    correct: boolean;
    explanation: string | null;
  }>;
  lesson_completed?: boolean;
  certificate_issued?: boolean;
}

export type LessonProgressStatus='in_progress'|'completed';

export interface LmsLesson{
  id:string;
  module_id:string;
  title:string;
  content:string;
  video_url:string|null;
  video_storage_path?:string|null;
  playback_url?:string|null;
  duration_seconds:number|null;
  sort_order:number;
  is_preview:boolean;
  is_published:boolean;
  created_at?:string;
  updated_at?:string;
  progress?:{status:LessonProgressStatus;progress_seconds:number;completed_at:string|null}|null;
}

export interface LmsModule{
  id:string;
  course_id:string;
  title:string;
  description:string|null;
  sort_order:number;
  created_at?:string;
  updated_at?:string;
  lessons:LmsLesson[];
}

export interface LmsCoursePayload{
  course:{id:string;title:string;description:string|null;cover_image_url:string|null;level:string;market:string|null};
  modules:LmsModule[];
  summary:{completed:number;total:number;percent:number;last_lesson_id:string|null};
}

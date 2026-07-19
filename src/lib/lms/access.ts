import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export async function hasCourseAccess(userId:string,courseId:string){
  const [{data:profile},{data:enrollment}]=await Promise.all([
    supabaseAdmin.from('profiles').select('role').eq('id',userId).single(),
    supabaseAdmin.from('enrollments').select('id').eq('user_id',userId).eq('course_id',courseId).eq('status','active').maybeSingle(),
  ]);
  return profile?.role==='admin'||Boolean(enrollment);
}

export async function lessonBelongsToCourse(lessonId:string,courseId:string){
  const {data}=await supabaseAdmin.from('course_lessons').select('id,module:course_modules!inner(course_id)').eq('id',lessonId).maybeSingle();
  const relation=data?.module as unknown as {course_id:string}|{course_id:string}[]|null|undefined;
  const courseModule=Array.isArray(relation)?relation[0]:relation;
  return courseModule?.course_id===courseId;
}

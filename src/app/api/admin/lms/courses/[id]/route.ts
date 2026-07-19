import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {signedVideoUrl} from '@/lib/lms/media';

export const dynamic='force-dynamic';

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  const [course,modules]=await Promise.all([
    supabaseAdmin.from('courses').select('*').eq('id',id).single(),
    supabaseAdmin.from('course_modules').select('*').eq('course_id',id).order('sort_order'),
  ]);
  if(course.error)return NextResponse.json({error:course.error.message},{status:course.error.code==='PGRST116'?404:500});
  if(modules.error)return NextResponse.json({error:modules.error.message},{status:500});
  const moduleIds=(modules.data??[]).map(module=>module.id);
  const lessons=moduleIds.length?await supabaseAdmin.from('course_lessons').select('*').in('module_id',moduleIds).order('sort_order'):{data:[],error:null};
  if(lessons.error)return NextResponse.json({error:lessons.error.message},{status:500});
  const withPlayback=await Promise.all((lessons.data??[]).map(async lesson=>({...lesson,playback_url:lesson.video_storage_path?await signedVideoUrl(lesson.video_storage_path):lesson.video_url})));
  return NextResponse.json({course:course.data,modules:(modules.data??[]).map(module=>({...module,lessons:withPlayback.filter(lesson=>lesson.module_id===module.id)}))});
}

import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {removeCourseMedia} from '@/lib/lms/media';
import {cleanTitle,externalVideoUrl,lessonMediaInput} from '@/lib/lms/validation';

function storedMediaPath(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  return String((value as Record<string,unknown>).storage_path??'').trim()||null;
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=await params;
  try{
    const body=await req.json();const current=await supabaseAdmin.from('course_lessons').select('*,module:course_modules!inner(course_id)').eq('id',id).single();if(current.error)return NextResponse.json({error:'Lesson not found'},{status:404});
    const update:Record<string,unknown>={};for(const key of ['content','is_preview','is_published'] as const)if(body[key]!==undefined)update[key]=key==='content'?String(body[key]??''):Boolean(body[key]);
    if(body.title!==undefined)update.title=cleanTitle(body.title,'Lesson title');if(body.duration_seconds!==undefined)update.duration_seconds=body.duration_seconds?Math.max(0,Number(body.duration_seconds)):null;
    const courseId=(current.data.module as unknown as {course_id:string}).course_id;
    const removePaths=new Set<string>();
    if(body.intro_media!==undefined){
      const intro=lessonMediaInput(body.intro_media,courseId,'Introduction media');
      update.intro_media=intro;
      update.video_url=intro?.type==='video'?intro.url:null;
      update.video_storage_path=intro?.type==='video'?intro.storage_path:null;
      const previous=storedMediaPath(current.data.intro_media)??current.data.video_storage_path;
      if(previous&&previous!==intro?.storage_path)removePaths.add(previous);
    }else if(body.video_storage_path!==undefined){
      const path=String(body.video_storage_path??'');
      if(path&&!path.startsWith(`courses/${courseId}/`))return NextResponse.json({error:'Invalid course video path'},{status:400});
      const intro=path?{type:'video',storage_path:path,url:null}:null;
      update.intro_media=intro;update.video_storage_path=path||null;update.video_url=null;
      const previous=storedMediaPath(current.data.intro_media)??current.data.video_storage_path;
      if(previous&&previous!==path)removePaths.add(previous);
    }else if(body.video_url!==undefined){
      const url=externalVideoUrl(body.video_url);
      update.intro_media=url?{type:'video',storage_path:null,url}:null;
      update.video_url=url;update.video_storage_path=null;
      const previous=storedMediaPath(current.data.intro_media)??current.data.video_storage_path;
      if(previous)removePaths.add(previous);
    }
    if(body.outro_media!==undefined){
      const outro=lessonMediaInput(body.outro_media,courseId,'Outro media');
      update.outro_media=outro;
      const previous=storedMediaPath(current.data.outro_media);
      if(previous&&previous!==outro?.storage_path)removePaths.add(previous);
    }
    if(!Object.keys(update).length)return NextResponse.json({error:'No valid changes'},{status:400});
    const result=await supabaseAdmin.from('course_lessons').update(update).eq('id',id).select('*').single();
    if(result.error)return NextResponse.json({error:result.error.message},{status:500});
    await Promise.all([...removePaths].map(path=>removeCourseMedia(path)));
    return NextResponse.json(result.data);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid lesson'},{status:400});}
}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  const [current,children]=await Promise.all([
    supabaseAdmin.from('course_lessons').select('video_storage_path,intro_media,outro_media').eq('id',id).maybeSingle(),
    supabaseAdmin.from('course_lessons').select('video_storage_path,intro_media,outro_media').eq('parent_lesson_id',id),
  ]);
  const result=await supabaseAdmin.from('course_lessons').delete().eq('id',id);
  if(result.error)return NextResponse.json({error:result.error.message},{status:500});
  const paths=new Set<string>();
  for(const lesson of [current.data,...(children.data??[])].filter(Boolean)){
    const row=lesson as {video_storage_path?:string|null;intro_media?:unknown;outro_media?:unknown};
    for(const path of [row.video_storage_path,storedMediaPath(row.intro_media),storedMediaPath(row.outro_media)]){
      if(path)paths.add(path);
    }
  }
  await Promise.all([...paths].map(path=>removeCourseMedia(path)));
  return NextResponse.json({success:true});
}

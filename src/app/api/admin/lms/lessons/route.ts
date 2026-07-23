import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {cleanTitle,externalVideoUrl,lessonMediaInput} from '@/lib/lms/validation';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const body=await req.json(),moduleId=String(body.module_id??''),parentLessonId=String(body.parent_lesson_id??'')||null,title=cleanTitle(body.title,parentLessonId?'Submodule title':'Lesson title');if(!moduleId)return NextResponse.json({error:'module_id is required'},{status:400});
    const moduleResult=await supabaseAdmin.from('course_modules').select('id,course_id').eq('id',moduleId).maybeSingle();if(!moduleResult.data)return NextResponse.json({error:'Module not found'},{status:404});
    if(parentLessonId){
      const parent=await supabaseAdmin.from('course_lessons').select('id,module_id,parent_lesson_id').eq('id',parentLessonId).maybeSingle();
      if(!parent.data||parent.data.module_id!==moduleId||parent.data.parent_lesson_id)return NextResponse.json({error:'Submodule parent must be a top-level lesson in this module'},{status:400});
    }
    let lastQuery=supabaseAdmin.from('course_lessons').select('sort_order').eq('module_id',moduleId);
    lastQuery=parentLessonId?lastQuery.eq('parent_lesson_id',parentLessonId):lastQuery.is('parent_lesson_id',null);
    const last=await lastQuery.order('sort_order',{ascending:false}).limit(1).maybeSingle();
    const storagePath=String(body.video_storage_path??'');if(storagePath&&!storagePath.startsWith(`courses/${moduleResult.data.course_id}/`))return NextResponse.json({error:'Invalid course video path'},{status:400});
    const legacyIntro=storagePath||body.video_url
      ? {type:'video',storage_path:storagePath||null,url:storagePath?null:externalVideoUrl(body.video_url)}
      : null;
    const introMedia=body.intro_media!==undefined
      ? lessonMediaInput(body.intro_media,moduleResult.data.course_id,'Introduction media')
      : legacyIntro;
    const outroMedia=lessonMediaInput(body.outro_media,moduleResult.data.course_id,'Outro media');
    const result=await supabaseAdmin.from('course_lessons').insert({
      module_id:moduleId,
      parent_lesson_id:parentLessonId,
      title,
      content:String(body.content??''),
      intro_media:introMedia,
      outro_media:outroMedia,
      video_url:introMedia?.type==='video'?introMedia.url:null,
      video_storage_path:introMedia?.type==='video'?introMedia.storage_path:null,
      duration_seconds:body.duration_seconds?Math.max(0,Number(body.duration_seconds)):null,
      is_preview:Boolean(body.is_preview),
      is_published:Boolean(body.is_published),
      sort_order:(last.data?.sort_order??-1)+1,
    }).select('*').single();
    if(result.error)return NextResponse.json({error:result.error.message},{status:500});return NextResponse.json(result.data,{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid lesson'},{status:400});}
}

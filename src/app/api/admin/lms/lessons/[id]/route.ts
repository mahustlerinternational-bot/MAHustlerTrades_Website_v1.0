import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {removeVideo} from '@/lib/lms/media';
import {cleanTitle,externalVideoUrl} from '@/lib/lms/validation';

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=await params;
  try{
    const body=await req.json();const current=await supabaseAdmin.from('course_lessons').select('*,module:course_modules!inner(course_id)').eq('id',id).single();if(current.error)return NextResponse.json({error:'Lesson not found'},{status:404});
    const update:Record<string,unknown>={};for(const key of ['content','is_preview','is_published'] as const)if(body[key]!==undefined)update[key]=key==='content'?String(body[key]??''):Boolean(body[key]);
    if(body.title!==undefined)update.title=cleanTitle(body.title,'Lesson title');if(body.duration_seconds!==undefined)update.duration_seconds=body.duration_seconds?Math.max(0,Number(body.duration_seconds)):null;
    let removeOld=false;
    if(body.video_storage_path!==undefined){const path=String(body.video_storage_path??'');const courseId=(current.data.module as unknown as {course_id:string}).course_id;if(path&&!path.startsWith(`courses/${courseId}/`))return NextResponse.json({error:'Invalid course video path'},{status:400});update.video_storage_path=path||null;update.video_url=null;removeOld=Boolean(current.data.video_storage_path&&current.data.video_storage_path!==path);}
    else if(body.video_url!==undefined){update.video_url=externalVideoUrl(body.video_url);update.video_storage_path=null;removeOld=Boolean(current.data.video_storage_path);}
    if(!Object.keys(update).length)return NextResponse.json({error:'No valid changes'},{status:400});const result=await supabaseAdmin.from('course_lessons').update(update).eq('id',id).select('*').single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});if(removeOld)await removeVideo(current.data.video_storage_path);return NextResponse.json(result.data);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid lesson'},{status:400});}
}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=await params;const current=await supabaseAdmin.from('course_lessons').select('video_storage_path').eq('id',id).maybeSingle();const result=await supabaseAdmin.from('course_lessons').delete().eq('id',id);if(result.error)return NextResponse.json({error:result.error.message},{status:500});await removeVideo(current.data?.video_storage_path);return NextResponse.json({success:true});
}

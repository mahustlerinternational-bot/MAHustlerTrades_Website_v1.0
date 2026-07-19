import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {cleanTitle,externalVideoUrl} from '@/lib/lms/validation';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const body=await req.json(),moduleId=String(body.module_id??''),title=cleanTitle(body.title,'Lesson title');if(!moduleId)return NextResponse.json({error:'module_id is required'},{status:400});
    const moduleResult=await supabaseAdmin.from('course_modules').select('id,course_id').eq('id',moduleId).maybeSingle();if(!moduleResult.data)return NextResponse.json({error:'Module not found'},{status:404});
    const last=await supabaseAdmin.from('course_lessons').select('sort_order').eq('module_id',moduleId).order('sort_order',{ascending:false}).limit(1).maybeSingle();
    const storagePath=String(body.video_storage_path??'');if(storagePath&&!storagePath.startsWith(`courses/${moduleResult.data.course_id}/`))return NextResponse.json({error:'Invalid course video path'},{status:400});
    const result=await supabaseAdmin.from('course_lessons').insert({module_id:moduleId,title,content:String(body.content??''),video_url:storagePath?null:externalVideoUrl(body.video_url),video_storage_path:storagePath||null,duration_seconds:body.duration_seconds?Math.max(0,Number(body.duration_seconds)):null,is_preview:Boolean(body.is_preview),is_published:Boolean(body.is_published),sort_order:(last.data?.sort_order??-1)+1}).select('*').single();
    if(result.error)return NextResponse.json({error:result.error.message},{status:500});return NextResponse.json(result.data,{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid lesson'},{status:400});}
}

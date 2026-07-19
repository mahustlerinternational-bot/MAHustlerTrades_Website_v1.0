import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {removeVideo} from '@/lib/lms/media';
import {cleanTitle} from '@/lib/lms/validation';

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=await params;
  try{const body=await req.json(),update:Record<string,unknown>={};if(body.title!==undefined)update.title=cleanTitle(body.title,'Module title');if(body.description!==undefined)update.description=String(body.description??'').trim()||null;if(!Object.keys(update).length)return NextResponse.json({error:'No valid changes'},{status:400});const result=await supabaseAdmin.from('course_modules').update(update).eq('id',id).select('*').single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});return NextResponse.json(result.data);}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid module'},{status:400});}
}

export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});const {id}=await params;
  const lessons=await supabaseAdmin.from('course_lessons').select('video_storage_path').eq('module_id',id);if(lessons.error)return NextResponse.json({error:lessons.error.message},{status:500});
  const result=await supabaseAdmin.from('course_modules').delete().eq('id',id);if(result.error)return NextResponse.json({error:result.error.message},{status:500});await Promise.all((lessons.data??[]).map(item=>removeVideo(item.video_storage_path)));return NextResponse.json({success:true});
}

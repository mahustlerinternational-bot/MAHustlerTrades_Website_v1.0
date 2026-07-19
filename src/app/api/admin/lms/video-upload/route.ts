import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {createVideoUpload} from '@/lib/lms/media';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{const body=await req.json(),courseId=String(body.course_id??'');if(!courseId)return NextResponse.json({error:'course_id is required'},{status:400});const course=await supabaseAdmin.from('courses').select('id').eq('id',courseId).maybeSingle();if(!course.data)return NextResponse.json({error:'Course not found'},{status:404});return NextResponse.json(await createVideoUpload(courseId,String(body.file_name??'video'),String(body.content_type??''),Number(body.size??0)));}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not prepare upload'},{status:400});}
}

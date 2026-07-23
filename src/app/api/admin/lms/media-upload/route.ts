import {NextRequest,NextResponse} from 'next/server';

import {createLessonMediaUpload} from '@/lib/lms/media';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);
  if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const body=await req.json();
    const courseId=String(body.course_id??'');
    const mediaType=String(body.media_type??'');
    if(!courseId)return NextResponse.json({error:'course_id is required'},{status:400});
    if(mediaType!=='video'&&mediaType!=='image')return NextResponse.json({error:'media_type must be video or image'},{status:400});
    const course=await supabaseAdmin.from('courses').select('id').eq('id',courseId).maybeSingle();
    if(!course.data)return NextResponse.json({error:'Course not found'},{status:404});
    return NextResponse.json(await createLessonMediaUpload(
      courseId,
      String(body.file_name??`lesson-${mediaType}`),
      String(body.content_type??''),
      Number(body.size??0),
      mediaType,
    ));
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Could not prepare media upload'},{status:400});
  }
}

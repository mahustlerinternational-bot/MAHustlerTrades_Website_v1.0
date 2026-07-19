import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {cleanTitle} from '@/lib/lms/validation';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const body=await req.json(),courseId=String(body.course_id??''),title=cleanTitle(body.title,'Module title');if(!courseId)return NextResponse.json({error:'course_id is required'},{status:400});
    const course=await supabaseAdmin.from('courses').select('id').eq('id',courseId).maybeSingle();if(!course.data)return NextResponse.json({error:'Course not found'},{status:404});
    const last=await supabaseAdmin.from('course_modules').select('sort_order').eq('course_id',courseId).order('sort_order',{ascending:false}).limit(1).maybeSingle();
    const result=await supabaseAdmin.from('course_modules').insert({course_id:courseId,title,description:String(body.description??'').trim()||null,sort_order:(last.data?.sort_order??-1)+1}).select('*').single();
    if(result.error)return NextResponse.json({error:result.error.message},{status:500});return NextResponse.json({...result.data,lessons:[]},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid module'},{status:400});}
}

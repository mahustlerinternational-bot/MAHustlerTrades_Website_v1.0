import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession,supabaseAdmin} from '@/lib/supabase/server';
import {hasCourseAccess,lessonBelongsToCourse} from '@/lib/lms/access';

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});const {id}=await params;if(!await hasCourseAccess(session.userId,id))return NextResponse.json({error:'An active course enrollment is required'},{status:403});const body=await req.json(),lessonId=String(body.lesson_id??''),status=body.status==='completed'?'completed':'in_progress';if(!lessonId||!await lessonBelongsToCourse(lessonId,id))return NextResponse.json({error:'Lesson not found in this course'},{status:404});const seconds=Math.min(7*24*60*60,Math.max(0,Math.floor(Number(body.progress_seconds??0)||0))),now=new Date().toISOString();const result=await supabaseAdmin.from('lesson_progress').upsert({user_id:session.userId,lesson_id:lessonId,status,progress_seconds:seconds,last_viewed_at:now,completed_at:status==='completed'?now:null},{onConflict:'user_id,lesson_id'}).select('*').single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});return NextResponse.json(result.data);
}

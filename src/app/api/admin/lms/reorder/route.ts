import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const body=await req.json(),type=String(body.type??''),orderedIds:string[]=Array.isArray(body.ordered_ids)?body.ordered_ids.map((value:unknown)=>String(value)):[],containerId=String(body.container_id??''),parentLessonId=String(body.parent_lesson_id??'')||null;
  if(!['modules','lessons'].includes(type)||!containerId||!orderedIds.length)return NextResponse.json({error:'Invalid reorder request'},{status:400});
  const table=type==='modules'?'course_modules':'course_lessons',column=type==='modules'?'course_id':'module_id';
  let query=supabaseAdmin.from(table).select('id').eq(column,containerId);
  if(type==='lessons')query=parentLessonId?query.eq('parent_lesson_id',parentLessonId):query.is('parent_lesson_id',null);
  const existing=await query;
  if(existing.error)return NextResponse.json({error:existing.error.message},{status:500});
  const actual=new Set((existing.data??[]).map(item=>item.id));
  if(actual.size!==orderedIds.length||orderedIds.some(id=>!actual.has(id)))return NextResponse.json({error:'The ordered list does not match this container'},{status:400});
  const updates=await Promise.all(orderedIds.map((id,index)=>supabaseAdmin.from(table).update({sort_order:index}).eq('id',id)));
  const failed=updates.find(item=>item.error);if(failed?.error)return NextResponse.json({error:failed.error.message},{status:500});
  return NextResponse.json({success:true});
}

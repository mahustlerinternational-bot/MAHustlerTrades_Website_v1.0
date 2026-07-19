import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {parseLmsText} from '@/lib/lms/importText';

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const created:string[]=[];
  try{
    const form=await req.formData(),file=form.get('file'),courseId=String(form.get('course_id')??'');if(!(file instanceof File)||!courseId)return NextResponse.json({error:'A course and TXT or MD file are required'},{status:400});if(file.size<=0||file.size>2*1024*1024)return NextResponse.json({error:'Text import must be 2 MB or smaller'},{status:413});if(!/\.(txt|md|markdown)$/i.test(file.name))return NextResponse.json({error:'Use a .txt or .md file'},{status:415});
    const course=await supabaseAdmin.from('courses').select('id').eq('id',courseId).maybeSingle();if(!course.data)return NextResponse.json({error:'Course not found'},{status:404});const fallback=file.name.replace(/\.(txt|md|markdown)$/i,'').replace(/[-_]+/g,' ').trim()||'Imported Module';const parsed=parseLmsText(await file.text(),fallback);const last=await supabaseAdmin.from('course_modules').select('sort_order').eq('course_id',courseId).order('sort_order',{ascending:false}).limit(1).maybeSingle();let moduleSort=(last.data?.sort_order??-1)+1,lessonCount=0;
    for(const importedModule of parsed){const inserted=await supabaseAdmin.from('course_modules').insert({course_id:courseId,title:importedModule.title,description:importedModule.description,sort_order:moduleSort++}).select('id').single();if(inserted.error)throw new Error(inserted.error.message);created.push(inserted.data.id);if(importedModule.lessons.length){const lessons=importedModule.lessons.map((lesson,index)=>({module_id:inserted.data.id,title:lesson.title,content:lesson.content,video_url:lesson.video_url,sort_order:index,is_published:false,is_preview:false}));const result=await supabaseAdmin.from('course_lessons').insert(lessons);if(result.error)throw new Error(result.error.message);lessonCount+=lessons.length;}}
    return NextResponse.json({modules:created.length,lessons:lessonCount,module_ids:created},{status:201});
  }catch(error){if(created.length)await supabaseAdmin.from('course_modules').delete().in('id',created);return NextResponse.json({error:error instanceof Error?error.message:'Import failed'},{status:400});}
}

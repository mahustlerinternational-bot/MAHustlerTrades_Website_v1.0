import {NextRequest,NextResponse} from 'next/server';
import {requireAdminSession,supabaseAdmin} from '@/lib/supabase/server';
import {signedVideoUrl} from '@/lib/lms/media';
import {normalizeCertificateLayout} from '@/lib/lms/certificateLayout';
import {lessonMediaFromValue} from '@/lib/lms/lessonMedia';

export const dynamic='force-dynamic';

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  const [course,modules]=await Promise.all([
    supabaseAdmin.from('courses').select('*').eq('id',id).single(),
    supabaseAdmin.from('course_modules').select('*').eq('course_id',id).order('sort_order'),
  ]);
  if(course.error)return NextResponse.json({error:course.error.message},{status:course.error.code==='PGRST116'?404:500});
  if(modules.error)return NextResponse.json({error:modules.error.message},{status:500});
  const moduleIds=(modules.data??[]).map(module=>module.id);
  const lessons=moduleIds.length?await supabaseAdmin.from('course_lessons').select('*').in('module_id',moduleIds).order('sort_order'):{data:[],error:null};
  if(lessons.error)return NextResponse.json({error:lessons.error.message},{status:500});
  const assessments=await supabaseAdmin.from('lms_assessments').select('*').eq('course_id',id).order('created_at');
  if(assessments.error)return NextResponse.json({error:assessments.error.message},{status:500});
  const assessmentIds=(assessments.data??[]).map(assessment=>assessment.id);
  const questions=assessmentIds.length
    ? await supabaseAdmin.from('lms_questions').select('*').in('assessment_id',assessmentIds).order('sort_order')
    : {data:[],error:null};
  if(questions.error)return NextResponse.json({error:questions.error.message},{status:500});
  const withPlayback=await Promise.all((lessons.data??[]).map(async lesson=>{
    const introMedia=lessonMediaFromValue(lesson.intro_media,lesson.video_url,lesson.video_storage_path);
    const outroMedia=lessonMediaFromValue(lesson.outro_media);
    const [introPlayback,outroPlayback]=await Promise.all([
      introMedia?.storage_path?signedVideoUrl(introMedia.storage_path):Promise.resolve(introMedia?.url??null),
      outroMedia?.storage_path?signedVideoUrl(outroMedia.storage_path):Promise.resolve(outroMedia?.url??null),
    ]);
    return {
      ...lesson,
      intro_media:introMedia,
      outro_media:outroMedia,
      intro_playback_url:introPlayback,
      outro_playback_url:outroPlayback,
      playback_url:introMedia?.type==='video'?introPlayback:null,
    };
  }));
  return NextResponse.json({
    course:course.data,
    modules:(modules.data??[]).map(module=>({...module,lessons:withPlayback.filter(lesson=>lesson.module_id===module.id)})),
    assessments:(assessments.data??[]).map(assessment=>({
      ...assessment,
      questions:(questions.data??[]).filter(question=>question.assessment_id===assessment.id),
    })),
  });
}

export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  const {id}=await params;
  try{
    const body=await req.json();
    const update:Record<string,unknown>={};
    if(body.lms_sequential!==undefined)update.lms_sequential=Boolean(body.lms_sequential);
    if(body.certificate_title!==undefined){
      const value=String(body.certificate_title??'').trim();
      if(value.length<2||value.length>120)return NextResponse.json({error:'Certificate title must be between 2 and 120 characters'},{status:400});
      update.certificate_title=value;
    }
    if(body.certificate_layout!==undefined){
      update.certificate_layout=normalizeCertificateLayout(body.certificate_layout);
    }
    for(const key of ['certificate_signatory_name','certificate_signatory_title'] as const){
      if(body[key]!==undefined){
        const value=String(body[key]??'').trim();
        if(value.length>120)return NextResponse.json({error:'Certificate signatory fields cannot exceed 120 characters'},{status:400});
        update[key]=value||null;
      }
    }
    if(!Object.keys(update).length)return NextResponse.json({error:'No valid course settings supplied'},{status:400});
    const result=await supabaseAdmin.from('courses').update(update).eq('id',id).select('*').single();
    if(result.error)return NextResponse.json({error:result.error.message},{status:500});
    return NextResponse.json(result.data);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Invalid course settings'},{status:400});
  }
}

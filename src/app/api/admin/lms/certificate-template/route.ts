import {NextRequest, NextResponse} from 'next/server';

import {
  removeCertificateTemplate,
  uploadCertificateTemplate,
} from '@/lib/lms/media';
import {requireAdminSession, supabaseAdmin} from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});

  try {
    const form = await req.formData();
    const courseId = String(form.get('course_id') ?? '');
    const file = form.get('file');
    if (!courseId) return NextResponse.json({error: 'course_id is required'}, {status: 400});
    if (!(file instanceof File)) {
      return NextResponse.json({error: 'Choose a certificate template file'}, {status: 400});
    }

    const course = await supabaseAdmin
      .from('courses')
      .select('id,certificate_template_path')
      .eq('id', courseId)
      .maybeSingle();
    if (!course.data) return NextResponse.json({error: 'Course not found'}, {status: 404});

    const path = await uploadCertificateTemplate(courseId, file);
    const updated = await supabaseAdmin
      .from('courses')
      .update({certificate_template_path: path, certificate_template_name: file.name.slice(0, 255)})
      .eq('id', courseId)
      .select('certificate_template_path,certificate_template_name')
      .single();
    if (updated.error) {
      await removeCertificateTemplate(path);
      throw new Error(updated.error.message);
    }
    await removeCertificateTemplate(course.data.certificate_template_path);
    return NextResponse.json(updated.data);
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Certificate template upload failed'},
      {status: 400},
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({error: 'Forbidden'}, {status: 403});
  const courseId = String(new URL(req.url).searchParams.get('course_id') ?? '');
  if (!courseId) return NextResponse.json({error: 'course_id is required'}, {status: 400});

  const course = await supabaseAdmin
    .from('courses')
    .select('certificate_template_path')
    .eq('id', courseId)
    .maybeSingle();
  if (!course.data) return NextResponse.json({error: 'Course not found'}, {status: 404});
  const updated = await supabaseAdmin
    .from('courses')
    .update({certificate_template_path: null, certificate_template_name: null})
    .eq('id', courseId);
  if (updated.error) return NextResponse.json({error: updated.error.message}, {status: 500});
  await removeCertificateTemplate(course.data.certificate_template_path);
  return NextResponse.json({success: true});
}

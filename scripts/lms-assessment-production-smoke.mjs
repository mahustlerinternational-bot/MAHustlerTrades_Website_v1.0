import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {PDFDocument} from 'pdf-lib';
import {createClient} from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const base = 'http://127.0.0.1:3010';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Supabase environment is incomplete');

const adminClient = createClient(url, serviceKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});
const publicClient = createClient(url, anonKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});
const stamp = Date.now();
const password = 'Codex-Lms-Assessment-9348!';
const createdUsers = [];
let courseId = null;
let certificateTemplatePath = null;

async function api(path, token, init = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${base}${path}`, {...init, headers});
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/pdf')) {
    return {
      status: response.status,
      contentType,
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {status: response.status, body, contentType};
}

async function createUser(kind, role = 'member') {
  const email = `codex-lms-assessment-${kind}-${stamp}@example.invalid`;
  const made = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {full_name: `LMS Assessment ${kind}`},
  });
  if (made.error || !made.data.user) throw new Error(made.error?.message ?? 'User creation failed');
  createdUsers.push(made.data.user.id);
  const profile = await adminClient.from('profiles').update({role}).eq('id', made.data.user.id);
  if (profile.error) throw new Error(profile.error.message);
  const signed = await publicClient.auth.signInWithPassword({email, password});
  if (signed.error || !signed.data.session) {
    throw new Error(signed.error?.message ?? 'Sign-in failed');
  }
  return {id: made.data.user.id, token: signed.data.session.access_token};
}

async function createAssessment(adminToken, target, title) {
  const response = await api('/api/admin/lms/assessments', adminToken, {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId,
      ...target,
      title,
      description: 'Disposable production scoring and progression check',
      passing_score: 70,
      max_attempts: 3,
      is_required: true,
      is_published: true,
      questions: [
        {
          prompt: `${title}: choose the valid answer`,
          question_type: 'single_choice',
          options: [
            {id: 'valid', text: 'Valid answer'},
            {id: 'invalid', text: 'Invalid answer'},
          ],
          correct_answer: ['valid'],
          explanation: 'The valid answer confirms the learning objective.',
          points: 1,
        },
      ],
    }),
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}

async function startAssessment(memberToken, assessmentId) {
  const response = await api(
    `/api/me/courses/${courseId}/assessments/${assessmentId}`,
    memberToken,
    {method: 'POST', body: JSON.stringify({action: 'start'})},
  );
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(
    Object.prototype.hasOwnProperty.call(response.body.questions[0], 'correct_answer'),
    false,
    'member question payload must never expose the answer key',
  );
  return response.body;
}

async function answer(memberToken, assessmentId, optionId = 'valid') {
  const started = await startAssessment(memberToken, assessmentId);
  const questionId = started.questions[0].id;
  const submitted = await api(
    `/api/me/courses/${courseId}/assessments/${assessmentId}`,
    memberToken,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'submit',
        attempt_id: started.attempt.id,
        answers: {[questionId]: [optionId]},
      }),
    },
  );
  assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
  return submitted.body;
}

try {
  const admin = await createUser('admin', 'admin');
  const member = await createUser('member');
  const outsider = await createUser('outsider');

  const course = await api('/api/admin/courses', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      title: `CODEX-ASSESSMENT-LMS-${stamp}`,
      description: 'Disposable assessment, gating, and certificate verification course',
      price: 0,
      level: 'All Levels',
      is_published: true,
    }),
  });
  assert.equal(course.status, 201, JSON.stringify(course.body));
  courseId = course.body.id;

  const moduleOne = await api('/api/admin/lms/modules', admin.token, {
    method: 'POST',
    body: JSON.stringify({course_id: courseId, title: 'Module One'}),
  });
  const moduleTwo = await api('/api/admin/lms/modules', admin.token, {
    method: 'POST',
    body: JSON.stringify({course_id: courseId, title: 'Module Two'}),
  });
  assert.equal(moduleOne.status, 201, JSON.stringify(moduleOne.body));
  assert.equal(moduleTwo.status, 201, JSON.stringify(moduleTwo.body));

  const lessonOne = await api('/api/admin/lms/lessons', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      module_id: moduleOne.body.id,
      title: 'Lesson One',
      content: '# Lesson One\n\nRequired lesson content.',
      is_published: true,
    }),
  });
  assert.equal(lessonOne.status, 201, JSON.stringify(lessonOne.body));
  const submodule = await api('/api/admin/lms/lessons', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      module_id: moduleOne.body.id,
      parent_lesson_id: lessonOne.body.id,
      title: 'Lesson One Submodule',
      content: 'Submodule content.',
      is_published: true,
    }),
  });
  assert.equal(submodule.status, 201, JSON.stringify(submodule.body));
  const lessonTwo = await api('/api/admin/lms/lessons', admin.token, {
    method: 'POST',
    body: JSON.stringify({
      module_id: moduleTwo.body.id,
      title: 'Lesson Two',
      content: 'Second module content.',
      is_published: true,
    }),
  });
  assert.equal(lessonTwo.status, 201, JSON.stringify(lessonTwo.body));

  const lessonOneQuiz = await createAssessment(
    admin.token,
    {scope: 'lesson', module_id: null, lesson_id: lessonOne.body.id},
    'Lesson One Quiz',
  );
  const submoduleQuiz = await createAssessment(
    admin.token,
    {scope: 'submodule', module_id: null, lesson_id: submodule.body.id},
    'Submodule Quiz',
  );
  const moduleOneQuiz = await createAssessment(
    admin.token,
    {scope: 'module', module_id: moduleOne.body.id, lesson_id: null},
    'Module One Assessment',
  );
  const lessonTwoQuiz = await createAssessment(
    admin.token,
    {scope: 'lesson', module_id: null, lesson_id: lessonTwo.body.id},
    'Lesson Two Quiz',
  );
  const moduleTwoQuiz = await createAssessment(
    admin.token,
    {scope: 'module', module_id: moduleTwo.body.id, lesson_id: null},
    'Module Two Assessment',
  );
  const finalQuiz = await createAssessment(
    admin.token,
    {scope: 'final', module_id: null, lesson_id: null},
    'Final Course Assessment',
  );

  const settings = await api(`/api/admin/lms/courses/${courseId}`, admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      lms_sequential: true,
      certificate_title: 'Verified Quant Learning Certificate',
      certificate_signatory_name: 'MAHustler Trades',
      certificate_signatory_title: 'Academy Director',
      certificate_layout: {
        certificate_title: {x: 0.5, y: 0.27, align: 'center', font_size: 31},
        member_name: {x: 0.44, y: 0.5, align: 'left', font_size: 29},
        course_title: {x: 0.5, y: 0.69, align: 'center', font_size: 21},
        issued_date: {x: 0.82, y: 0.84, align: 'right', font_size: 11},
      },
    }),
  });
  assert.equal(settings.status, 200, JSON.stringify(settings.body));
  assert.equal(settings.body.certificate_layout.member_name.x, 0.44);
  assert.equal(settings.body.certificate_layout.member_name.align, 'left');
  assert.equal(settings.body.certificate_layout.certificate_id.y, 0.92);
  assert.equal(settings.body.certificate_layout.certificate_id.align, 'center');
  assert.equal(settings.body.certificate_layout.verification_qr.y, 0.84);
  assert.equal(settings.body.certificate_layout.verification_qr.font_size, 58);

  const templateDocument = await PDFDocument.create();
  templateDocument.addPage([842, 595]);
  const templateBytes = await templateDocument.save();
  const templateForm = new FormData();
  templateForm.set('course_id', courseId);
  templateForm.set(
    'file',
    new File([templateBytes], 'smoke-certificate-template.pdf', {type: 'application/pdf'}),
  );
  const template = await api('/api/admin/lms/certificate-template', admin.token, {
    method: 'POST',
    body: templateForm,
  });
  assert.equal(template.status, 200, JSON.stringify(template.body));
  certificateTemplatePath = template.body.certificate_template_path;
  const templatePreview = await api(
    `/api/admin/lms/certificate-template?course_id=${courseId}`,
    admin.token,
  );
  assert.equal(templatePreview.status, 200);
  assert.match(templatePreview.contentType, /application\/pdf/);
  assert.equal(String.fromCharCode(...templatePreview.bytes.slice(0, 4)), '%PDF');

  const enrollment = await api('/api/me/courses', member.token, {
    method: 'POST',
    body: JSON.stringify({course_id: courseId}),
  });
  assert.equal(enrollment.status, 201, JSON.stringify(enrollment.body));

  let state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.status, 200, JSON.stringify(state.body));
  assert.equal(state.body.summary.total, 3);
  assert.equal(state.body.summary.total_assessments, 6);
  assert.equal(state.body.modules[0].lessons[0].locked, false);
  assert.equal(state.body.modules[0].lessons[0].submodules[0].locked, true);
  assert.equal(state.body.modules[1].locked, true);
  assert.equal(state.body.final_assessment.locked, true);

  const bypass = await api(`/api/me/courses/${courseId}/progress`, member.token, {
    method: 'POST',
    body: JSON.stringify({lesson_id: lessonOne.body.id, status: 'completed'}),
  });
  assert.equal(bypass.status, 409, 'required assessment must prevent manual completion');
  assert.equal(bypass.body.code, 'ASSESSMENT_REQUIRED');

  const failed = await answer(member.token, lessonOneQuiz.id, 'invalid');
  assert.equal(failed.status, 'failed');
  state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.body.modules[0].lessons[0].submodules[0].locked, true);

  const passedLessonOne = await answer(member.token, lessonOneQuiz.id);
  assert.equal(passedLessonOne.status, 'passed');
  assert.equal(passedLessonOne.lesson_completed, true);
  state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.body.modules[0].lessons[0].submodules[0].locked, false);

  const outsiderAttempt = await api(
    `/api/me/courses/${courseId}/assessments/${submoduleQuiz.id}`,
    outsider.token,
    {method: 'POST', body: JSON.stringify({action: 'start'})},
  );
  assert.equal(outsiderAttempt.status, 403, 'unenrolled user must not access assessments');

  assert.equal((await answer(member.token, submoduleQuiz.id)).status, 'passed');
  state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.body.modules[0].assessment.locked, false);

  assert.equal((await answer(member.token, moduleOneQuiz.id)).status, 'passed');
  state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.body.modules[1].locked, false);

  assert.equal((await answer(member.token, lessonTwoQuiz.id)).status, 'passed');
  assert.equal((await answer(member.token, moduleTwoQuiz.id)).status, 'passed');
  state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.body.final_assessment.locked, false);

  const finalResult = await answer(member.token, finalQuiz.id);
  assert.equal(finalResult.status, 'passed');
  assert.equal(finalResult.certificate_issued, true);
  const issuedCertificate = await adminClient
    .from('course_certificates')
    .select('certificate_number,verification_code,metadata')
    .eq('course_id', courseId)
    .eq('user_id', member.id)
    .single();
  if (issuedCertificate.error) throw new Error(issuedCertificate.error.message);
  assert.equal(issuedCertificate.data.metadata.certificate_layout.member_name.x, 0.44);
  assert.equal(issuedCertificate.data.metadata.certificate_layout.issued_date.align, 'right');
  assert.equal(issuedCertificate.data.metadata.certificate_layout.certificate_id.y, 0.92);
  assert.equal(issuedCertificate.data.metadata.certificate_layout.verification_qr.x, 0.1);

  const publicVerification = await api(
    `/api/certificates/verify/${issuedCertificate.data.verification_code}`,
    null,
  );
  assert.equal(publicVerification.status, 200, JSON.stringify(publicVerification.body));
  assert.equal(publicVerification.body.valid, true);
  assert.equal(
    publicVerification.body.certificate_number,
    issuedCertificate.data.certificate_number,
  );
  assert.equal(publicVerification.body.member_name, 'LMS Assessment member');
  const invalidVerification = await api('/api/certificates/verify/NOTAREALCODE1234', null);
  assert.equal(invalidVerification.status, 404);
  assert.equal(invalidVerification.body.valid, false);
  const verificationPage = await api(
    `/certificate/verify/${issuedCertificate.data.verification_code}`,
    null,
  );
  assert.equal(verificationPage.status, 200);
  assert.match(verificationPage.body, /Verified &amp; Authentic/);

  const modifiedSettings = await api(`/api/admin/lms/courses/${courseId}`, admin.token, {
    method: 'PATCH',
    body: JSON.stringify({
      certificate_title: 'Updated Certificate Presentation',
      certificate_layout: {
        certificate_title: {x: 0.5, y: 0.3, align: 'center', font_size: 30},
        member_name: {x: 0.53, y: 0.52, align: 'center', font_size: 28},
        course_title: {x: 0.5, y: 0.7, align: 'center', font_size: 21},
        issued_date: {x: 0.8, y: 0.85, align: 'right', font_size: 11},
        certificate_id: {x: 0.5, y: 0.9, align: 'center', font_size: 9},
      },
    }),
  });
  assert.equal(modifiedSettings.status, 200, JSON.stringify(modifiedSettings.body));

  state = await api(`/api/me/courses/${courseId}/lms`, member.token);
  assert.equal(state.body.summary.percent, 100);
  assert.equal(state.body.summary.completed, 3);
  assert.equal(state.body.summary.completed_assessments, 6);
  assert.equal(state.body.certificate.issued, true);
  assert.match(state.body.certificate.certificate_number, /^MAHT-CERT-/);
  assert.equal(
    state.body.certificate.verification_code,
    issuedCertificate.data.verification_code,
  );

  const certificateRecord = await api(`/api/me/courses/${courseId}/certificate`, member.token);
  assert.equal(certificateRecord.status, 200, JSON.stringify(certificateRecord.body));
  assert.match(
    certificateRecord.body.verification_url,
    new RegExp(`/certificate/verify/${issuedCertificate.data.verification_code}$`),
  );

  const certificate = await api(
    `/api/me/courses/${courseId}/certificate?download=1`,
    member.token,
  );
  assert.equal(certificate.status, 200);
  assert.match(certificate.contentType, /application\/pdf/);
  assert.ok(certificate.bytes.length > 1000, 'generated certificate PDF must contain data');
  assert.equal(String.fromCharCode(...certificate.bytes.slice(0, 4)), '%PDF');

  const refreshedCertificate = await adminClient
    .from('course_certificates')
    .select('certificate_number,issued_at,metadata')
    .eq('course_id', courseId)
    .eq('user_id', member.id)
    .single();
  if (refreshedCertificate.error) throw new Error(refreshedCertificate.error.message);
  assert.equal(
    refreshedCertificate.data.certificate_number,
    state.body.certificate.certificate_number,
    'presentation refresh must preserve the permanent certificate ID',
  );
  assert.equal(
    refreshedCertificate.data.metadata.certificate_title,
    'Updated Certificate Presentation',
  );
  assert.equal(refreshedCertificate.data.metadata.certificate_layout.member_name.x, 0.53);
  assert.equal(refreshedCertificate.data.metadata.certificate_layout.certificate_id.y, 0.9);

  console.log(
    'LMS assessment production smoke passed: submodules, secure scoring, failed retry, sequential gates, module/final assessments, progress, authenticated template preview, saved and refreshed placeholder layout, public validation, and QR-enabled generated certificate',
  );
} finally {
  if (certificateTemplatePath) {
    await adminClient.storage.from('course-certificates').remove([certificateTemplatePath]);
  }
  if (courseId) await adminClient.from('courses').delete().eq('id', courseId);
  for (const id of createdUsers.reverse()) await adminClient.auth.admin.deleteUser(id);
}

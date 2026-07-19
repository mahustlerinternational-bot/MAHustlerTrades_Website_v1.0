import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());
const base='http://127.0.0.1:3010';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!anonKey||!serviceKey)throw new Error('Supabase environment is incomplete');

const adminClient=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const publicClient=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const stamp=Date.now();
const password='Codex-Lms-Smoke-9348!';
const createdUsers=[];
let courseId=null;
let uploadedPath=null;

async function api(path,token,init={}){
  const headers=new Headers(init.headers);
  if(token)headers.set('Authorization',`Bearer ${token}`);
  if(init.body&&!(init.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const response=await fetch(`${base}${path}`,{...init,headers});
  const text=await response.text();
  let body;try{body=text?JSON.parse(text):null;}catch{body=text;}
  return {status:response.status,body};
}

async function createUser(kind,role='member'){
  const email=`codex-lms-${kind}-${stamp}@example.invalid`;
  const made=await adminClient.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`LMS ${kind}`}});
  if(made.error||!made.data.user)throw new Error(made.error?.message??'User creation failed');
  createdUsers.push(made.data.user.id);
  const profile=await adminClient.from('profiles').update({role}).eq('id',made.data.user.id);
  if(profile.error)throw new Error(profile.error.message);
  const signed=await publicClient.auth.signInWithPassword({email,password});
  if(signed.error||!signed.data.session)throw new Error(signed.error?.message??'Sign-in failed');
  return {id:made.data.user.id,token:signed.data.session.access_token};
}

try{
  const admin=await createUser('admin','admin');
  const member=await createUser('member');
  const outsider=await createUser('outsider');

  const denied=await api('/api/admin/lms/modules',null,{method:'POST',body:JSON.stringify({course_id:'none',title:'Denied'})});
  assert.equal(denied.status,403,'anonymous admin LMS access must be forbidden');

  const course=await api('/api/admin/courses',admin.token,{method:'POST',body:JSON.stringify({title:`CODEX-LMS-${stamp}`,description:'Disposable native LMS verification course',price:0,level:'All Levels',is_published:true})});
  assert.equal(course.status,201,JSON.stringify(course.body));courseId=course.body.id;

  const firstModule=await api('/api/admin/lms/modules',admin.token,{method:'POST',body:JSON.stringify({course_id:courseId,title:'Foundations',description:'First module'})});
  assert.equal(firstModule.status,201,JSON.stringify(firstModule.body));
  const firstLesson=await api('/api/admin/lms/lessons',admin.token,{method:'POST',body:JSON.stringify({module_id:firstModule.body.id,title:'Welcome',content:'Private draft content',video_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',duration_seconds:180,is_published:false})});
  assert.equal(firstLesson.status,201,JSON.stringify(firstLesson.body));

  const beforeEnrollment=await api(`/api/me/courses/${courseId}/lms`,member.token);
  assert.equal(beforeEnrollment.status,403,'unenrolled member must be denied');
  const enrollment=await api('/api/me/courses',member.token,{method:'POST',body:JSON.stringify({course_id:courseId})});
  assert.equal(enrollment.status,201,JSON.stringify(enrollment.body));
  const draftsHidden=await api(`/api/me/courses/${courseId}/lms`,member.token);
  assert.equal(draftsHidden.status,200);assert.equal(draftsHidden.body.summary.total,0,'draft lesson must be hidden');

  const published=await api(`/api/admin/lms/lessons/${firstLesson.body.id}`,admin.token,{method:'PATCH',body:JSON.stringify({is_published:true,content:'Published professional lesson content'})});
  assert.equal(published.status,200,JSON.stringify(published.body));
  const memberCourse=await api(`/api/me/courses/${courseId}/lms`,member.token);
  assert.equal(memberCourse.status,200);assert.equal(memberCourse.body.summary.total,1);assert.equal(memberCourse.body.modules[0].lessons[0].content,'Published professional lesson content');
  assert.match(memberCourse.body.modules[0].lessons[0].playback_url,/youtube\.com/);

  const completed=await api(`/api/me/courses/${courseId}/progress`,member.token,{method:'POST',body:JSON.stringify({lesson_id:firstLesson.body.id,status:'completed',progress_seconds:164})});
  assert.equal(completed.status,200,JSON.stringify(completed.body));
  const completedCourse=await api(`/api/me/courses/${courseId}/lms`,member.token);
  assert.equal(completedCourse.body.summary.percent,100);assert.equal(completedCourse.body.summary.completed,1);
  const outsiderDenied=await api(`/api/me/courses/${courseId}/progress`,outsider.token,{method:'POST',body:JSON.stringify({lesson_id:firstLesson.body.id,status:'completed'})});
  assert.equal(outsiderDenied.status,403,'outsider progress must be forbidden');

  const form=new FormData();form.set('course_id',courseId);form.set('file',new File([`# Advanced\n## Setup\nImported setup notes.\n## Execution\nImported execution notes.`],'advanced-course.txt',{type:'text/plain'}));
  const imported=await api('/api/admin/lms/import',admin.token,{method:'POST',body:form});
  assert.equal(imported.status,201,JSON.stringify(imported.body));assert.deepEqual({modules:imported.body.modules,lessons:imported.body.lessons},{modules:1,lessons:2});

  let builder=await api(`/api/admin/lms/courses/${courseId}`,admin.token);
  assert.equal(builder.status,200);assert.equal(builder.body.modules.length,2);assert.equal(builder.body.modules.flatMap(item=>item.lessons).length,3);
  const importedModule=builder.body.modules.find(item=>item.title==='Advanced');
  assert.ok(importedModule);assert.ok(importedModule.lessons.every(item=>item.is_published===false));
  const reordered=await api('/api/admin/lms/reorder',admin.token,{method:'POST',body:JSON.stringify({type:'modules',container_id:courseId,ordered_ids:[importedModule.id,firstModule.body.id]})});
  assert.equal(reordered.status,200,JSON.stringify(reordered.body));

  const prepared=await api('/api/admin/lms/video-upload',admin.token,{method:'POST',body:JSON.stringify({course_id:courseId,file_name:'lesson-preview.mp4',content_type:'video/mp4',size:16})});
  assert.equal(prepared.status,200,JSON.stringify(prepared.body));uploadedPath=prepared.body.path;
  const uploaded=await publicClient.storage.from(prepared.body.bucket).uploadToSignedUrl(prepared.body.path,prepared.body.token,new Blob([new Uint8Array(16)],{type:'video/mp4'}),{contentType:'video/mp4'});
  if(uploaded.error)throw new Error(uploaded.error.message);
  const videoLesson=importedModule.lessons[0];
  const attached=await api(`/api/admin/lms/lessons/${videoLesson.id}`,admin.token,{method:'PATCH',body:JSON.stringify({video_storage_path:uploadedPath,is_published:true})});
  assert.equal(attached.status,200,JSON.stringify(attached.body));
  builder=await api(`/api/admin/lms/courses/${courseId}`,admin.token);
  const storedLesson=builder.body.modules.flatMap(item=>item.lessons).find(item=>item.id===videoLesson.id);
  assert.match(storedLesson.playback_url,/token=/,'admin should receive a signed private video URL');
  const bucket=await adminClient.storage.getBucket('course-media');
  if(bucket.error)throw bucket.error;assert.equal(bucket.data.public,false,'course-media bucket must be private');

  const memberWithVideo=await api(`/api/me/courses/${courseId}/lms`,member.token);
  const memberStoredLesson=memberWithVideo.body.modules.flatMap(item=>item.lessons).find(item=>item.id===videoLesson.id);
  assert.ok(memberStoredLesson);assert.equal('video_storage_path' in memberStoredLesson,false,'storage path must not leak to members');assert.match(memberStoredLesson.playback_url,/token=/);
  const finalCourse=await api(`/api/admin/courses/${courseId}`,admin.token);
  assert.equal(Number(finalCourse.body.lesson_count),3,'lesson count trigger must stay synchronized');

  console.log('LMS production smoke passed: auth, drafts, enrollment, import, reorder, private video, playback, progress, and lesson counts');
}finally{
  if(uploadedPath)await adminClient.storage.from('course-media').remove([uploadedPath]);
  if(courseId)await adminClient.from('courses').delete().eq('id',courseId);
  for(const id of createdUsers.reverse())await adminClient.auth.admin.deleteUser(id);
}

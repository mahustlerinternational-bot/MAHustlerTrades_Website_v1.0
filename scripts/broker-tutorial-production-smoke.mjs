import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const baseUrl=process.env.BROKER_TUTORIAL_SMOKE_BASE_URL??'http://127.0.0.1:3010';
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(supabaseUrl&&anonKey&&serviceKey,'Supabase environment variables are required');

const service=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const stamp=Date.now();
let adminUserId=null;
let memberUserId=null;
let adminToken=null;
let memberToken=null;
let brokerId=null;
let uploadPath=null;
const {data:originalSetting,error:originalError}=await service.from('site_settings').select('*').eq('key','ib_brokers').maybeSingle();
assert.ifError(originalError);

async function createUser(label,role){
  const email=`broker-tutorial-${label}-${stamp}@example.test`;
  const password=`Smoke-${crypto.randomUUID()}-Aa1!`;
  const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`Broker Tutorial ${label}`}});
  assert.ifError(error);
  for(let attempt=0;attempt<10;attempt+=1){
    const profile=await service.from('profiles').select('id').eq('id',data.user.id).maybeSingle();
    if(profile.data)break;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  const elevated=await service.from('profiles').update({role,ib_status:'none'}).eq('id',data.user.id);
  assert.ifError(elevated.error);
  const client=createClient(supabaseUrl,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const signed=await client.auth.signInWithPassword({email,password});
  assert.ifError(signed.error);
  return {id:data.user.id,token:signed.data.session.access_token,client};
}

async function api(path,token,init={}){
  const headers=new Headers(init.headers);
  headers.set('authorization',`Bearer ${token}`);
  const response=await fetch(`${baseUrl}${path}`,{...init,headers});
  const body=await response.json();
  return {response,body};
}

try{
  const admin=await createUser('admin','admin');
  adminUserId=admin.id;adminToken=admin.token;
  const member=await createUser('member','member');
  memberUserId=member.id;memberToken=member.token;

  const invalid=await api('/api/admin/brokers',adminToken,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({name:`Invalid ${stamp}`,referral_link:'https://example.com/ref',tutorial_video_url:'javascript:alert(1)'}),
  });
  assert.equal(invalid.response.status,400);

  const created=await api('/api/admin/brokers',adminToken,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({
      name:`Smoke Broker ${stamp}`,
      referral_link:`https://example.com/ref-${stamp}`,
      min_deposit:100,
      sort_order:999,
      is_active:true,
      tutorial_video_url:'https://youtu.be/dQw4w9WgXcQ',
    }),
  });
  assert.equal(created.response.status,201,JSON.stringify(created.body));
  brokerId=created.body.id;
  assert.equal(created.body.tutorial_video_url,'https://youtu.be/dQw4w9WgXcQ');

  const prepared=await api('/api/admin/brokers/tutorial-upload',adminToken,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({file_name:'smoke.mp4',content_type:'video/mp4',size:16}),
  });
  assert.equal(prepared.response.status,200,JSON.stringify(prepared.body));
  uploadPath=prepared.body.path;
  const bytes=Buffer.from('00000018667479706d703432','hex');
  const uploaded=await admin.client.storage
    .from(prepared.body.bucket)
    .uploadToSignedUrl(prepared.body.path,prepared.body.token,bytes,{contentType:'video/mp4'});
  assert.ifError(uploaded.error);

  const updated=await api('/api/admin/brokers',adminToken,{
    method:'PATCH',headers:{'content-type':'application/json'},
    body:JSON.stringify({
      id:brokerId,
      tutorial_video_url:'',
      tutorial_video_storage_path:uploadPath,
    }),
  });
  assert.equal(updated.response.status,200,JSON.stringify(updated.body));
  assert.equal(updated.body.tutorial_video_storage_path,uploadPath);
  assert.match(updated.body.tutorial_playback_url,/token=/);

  const list=await api('/api/admin/brokers',adminToken);
  assert.equal(list.response.status,200);
  const listed=list.body.find(item=>item.id===brokerId);
  assert.equal(listed.tutorial_video_storage_path,uploadPath);
  assert.match(listed.tutorial_playback_url,/token=/);

  const invalidSelection=await api('/api/me/ib',memberToken,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({broker_name:'Not An Approved Broker',account_number:'TEST-123'}),
  });
  assert.equal(invalidSelection.response.status,400);

  const submitted=await api('/api/me/ib',memberToken,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({broker_name:`smoke broker ${stamp}`,account_number:'TEST-123'}),
  });
  assert.equal(submitted.response.status,201,JSON.stringify(submitted.body));
  assert.equal(submitted.body.broker_name,`Smoke Broker ${stamp}`);

  const removed=await api(`/api/admin/brokers?id=${encodeURIComponent(brokerId)}`,adminToken,{method:'DELETE'});
  assert.equal(removed.response.status,200);
  brokerId=null;
  uploadPath=null;
  console.log('Broker tutorial URL, private upload, signed playback, broker validation and cleanup production smoke passed.');
}finally{
  if(memberUserId)await service.from('ib_registrations').delete().eq('user_id',memberUserId);
  if(uploadPath)await service.storage.from('course-media').remove([uploadPath]);
  if(originalSetting){
    await service.from('site_settings').upsert({
      key:'ib_brokers',
      value:originalSetting.value,
      description:originalSetting.description,
      updated_by:originalSetting.updated_by,
    },{onConflict:'key'});
  }else{
    await service.from('site_settings').delete().eq('key','ib_brokers');
  }
  if(adminUserId)await service.auth.admin.deleteUser(adminUserId);
  if(memberUserId)await service.auth.admin.deleteUser(memberUserId);
}

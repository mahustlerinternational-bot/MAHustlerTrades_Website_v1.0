import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
import { provisionCommunityInvites } from '@/lib/community/invites';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const [pr,er,evr,ibr,authResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('*,package:packages(name,slug)').eq('id',id).single(),
    supabaseAdmin.from('enrollments').select('*,course:courses(title,price)').eq('user_id',id).eq('status','active'),
    supabaseAdmin.from('event_registrations').select('*,event:events(title,event_date)').eq('user_id',id),
    supabaseAdmin.from('ib_registrations').select('*').eq('user_id',id).order('submitted_at',{ ascending:false }).limit(1).maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(id),
  ]);
  if (pr.error) return NextResponse.json({ error:pr.error.message },{ status:pr.error.code==='PGRST116'?404:500 });
  const relatedError=er.error??evr.error??ibr.error??authResult.error;
  if (relatedError) return NextResponse.json({ error:relatedError.message },{ status:500 });
  const authUser=authResult.data.user;
  return NextResponse.json({
    profile:pr.data,
    enrollments:er.data??[],
    eventRegs:evr.data??[],
    ibReg:ibr.data??null,
    account: authUser ? {
      email:authUser.email??null,
      phone:authUser.phone??null,
      email_confirmed_at:authUser.email_confirmed_at??null,
      last_sign_in_at:authUser.last_sign_in_at??null,
    } : null,
  });
}
export async function PATCH(req: NextRequest,{ params }:{ params:Promise<{ id:string }> }) {
  const { id } = await params;
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const body = await req.json();
  const { action } = body;
  if (action === 'review_ib') {
    const { status, admin_notes } = body;
    if (!['approved','rejected'].includes(status)) return NextResponse.json({ error:'Invalid status' },{ status:400 });
    const targetProfile=await supabaseAdmin.from('profiles').select('role').eq('id',id).maybeSingle();
    if(targetProfile.error)return NextResponse.json({error:targetProfile.error.message},{status:500});
    await supabaseAdmin.from('ib_registrations').update({ status, admin_notes:admin_notes??null, reviewed_at:new Date().toISOString(), reviewed_by:s.userId }).eq('user_id',id);
    const pu: Record<string,string> = { ib_status: status==='approved'?'active':'rejected' };
    if (status==='approved'&&targetProfile.data?.role!=='admin') pu.role='ib_member';
    const { error } = await supabaseAdmin.from('profiles').update(pu).eq('id',id);
    if (error) return NextResponse.json({ error:error.message },{ status:500 });
    let community:Awaited<ReturnType<typeof provisionCommunityInvites>>=[];
    if(status==='approved'){
      try{community=await provisionCommunityInvites(id);}catch(error){console.error('[IB approval] community invite provisioning failed',error);}
    }else{
      await supabaseAdmin.from('enrollments').update({status:'revoked',revoked_at:new Date().toISOString()}).eq('user_id',id).eq('payment_method','ib_grant').eq('status','active');
    }
    return NextResponse.json({ success:true, action:'review_ib', status, community, course_benefit:status==='approved' });
  }
  if (action === 'grant_course') {
    const { course_id } = body;
    if (!course_id) return NextResponse.json({ error:'course_id required' },{ status:400 });
    const { data, error } = await supabaseAdmin.from('enrollments').upsert({
      user_id:id, course_id, status:'active', payment_method:'admin_grant', amount_paid:0, enrolled_at:new Date().toISOString(), granted_by:s.userId,
    },{ onConflict:'user_id,course_id' }).select('*').single();
    if (error) return NextResponse.json({ error:error.message },{ status:500 });
    return NextResponse.json({ success:true, enrollment:data });
  }
  if (action === 'revoke_enrollment') {
    const { enrollment_id } = body;
    const { error } = await supabaseAdmin.from('enrollments').update({ status:'revoked', revoked_at:new Date().toISOString() }).eq('id',enrollment_id).eq('user_id',id);
    if (error) return NextResponse.json({ error:error.message },{ status:500 });
    return NextResponse.json({ success:true });
  }
  const allowed = ['role','package_id','ib_status','full_name'];
  const u: Record<string,unknown> = {};
  for (const k of allowed) if (body[k]!==undefined) u[k]=body[k];
  if (!Object.keys(u).length) return NextResponse.json({ error:'No valid fields' },{ status:400 });
  const { data, error } = await supabaseAdmin.from('profiles').update(u).eq('id',id).select('*,package:packages(name,slug)').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  if(u.ib_status&&u.ib_status!=='active')await supabaseAdmin.from('enrollments').update({status:'revoked',revoked_at:new Date().toISOString()}).eq('user_id',id).eq('payment_method','ib_grant').eq('status','active');
  return NextResponse.json(data);
}

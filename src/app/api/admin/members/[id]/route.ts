import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdminSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest,{ params }:{ params:{ id:string } }) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const [pr,er,evr,ibr] = await Promise.all([
    supabaseAdmin.from('profiles').select('*,package:packages(name,slug)').eq('id',params.id).single(),
    supabaseAdmin.from('enrollments').select('*,course:courses(title,price)').eq('user_id',params.id).eq('status','active'),
    supabaseAdmin.from('event_registrations').select('*,event:events(title,event_date)').eq('user_id',params.id),
    supabaseAdmin.from('ib_registrations').select('*').eq('user_id',params.id).order('submitted_at',{ ascending:false }).limit(1).maybeSingle(),
  ]);
  return NextResponse.json({ profile:pr.data??null, enrollments:er.data??[], eventRegs:evr.data??[], ibReg:ibr.data??null });
}
export async function PATCH(req: NextRequest,{ params }:{ params:{ id:string } }) {
  const s = await requireAdminSession(req);
  if (!s) return NextResponse.json({ error:'Forbidden' },{ status:403 });
  const body = await req.json();
  const { action } = body;
  if (action === 'review_ib') {
    const { status, admin_notes } = body;
    if (!['approved','rejected'].includes(status)) return NextResponse.json({ error:'Invalid status' },{ status:400 });
    await supabaseAdmin.from('ib_registrations').update({ status, admin_notes:admin_notes??null, reviewed_at:new Date().toISOString() }).eq('user_id',params.id);
    const pu: Record<string,string> = { ib_status: status==='approved'?'active':'rejected' };
    if (status==='approved') pu.role='ib_member';
    const { error } = await supabaseAdmin.from('profiles').update(pu).eq('id',params.id);
    if (error) return NextResponse.json({ error:error.message },{ status:500 });
    return NextResponse.json({ success:true, action:'review_ib', status });
  }
  if (action === 'grant_course') {
    const { course_id } = body;
    if (!course_id) return NextResponse.json({ error:'course_id required' },{ status:400 });
    const { data, error } = await supabaseAdmin.from('enrollments').upsert({
      user_id:params.id, course_id, status:'active', payment_method:'admin_grant', amount_paid:0, enrolled_at:new Date().toISOString(),
    },{ onConflict:'user_id,course_id' }).select('*').single();
    if (error) return NextResponse.json({ error:error.message },{ status:500 });
    return NextResponse.json({ success:true, enrollment:data });
  }
  if (action === 'revoke_enrollment') {
    const { enrollment_id } = body;
    const { error } = await supabaseAdmin.from('enrollments').update({ status:'revoked' }).eq('id',enrollment_id).eq('user_id',params.id);
    if (error) return NextResponse.json({ error:error.message },{ status:500 });
    return NextResponse.json({ success:true });
  }
  const allowed = ['role','package_id','ib_status','full_name'];
  const u: Record<string,unknown> = {};
  for (const k of allowed) if (body[k]!==undefined) u[k]=body[k];
  if (!Object.keys(u).length) return NextResponse.json({ error:'No valid fields' },{ status:400 });
  const { data, error } = await supabaseAdmin.from('profiles').update(u).eq('id',params.id).select('*,package:packages(name,slug)').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data);
}

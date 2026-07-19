import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('enrollments').select('*,course:courses(*)').eq('user_id',s.userId).eq('status','active').order('enrolled_at',{ ascending:false });
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json(data??[]);
}
export async function POST(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { course_id, coupon_code } = await req.json();
  if (!course_id) return NextResponse.json({ error:'course_id required' },{ status:400 });
  const { data:existing } = await supabaseAdmin.from('enrollments').select('id').eq('user_id',s.userId).eq('course_id',course_id).eq('status','active').maybeSingle();
  if (existing) return NextResponse.json({ error:'Already enrolled' },{ status:409 });
  const [{ data:course },{ data:profile,error:profileError }] = await Promise.all([
    supabaseAdmin.from('courses').select('id,title,price').eq('id',course_id).eq('is_published',true).single(),
    supabaseAdmin.from('profiles').select('ib_status').eq('id',s.userId).single(),
  ]);
  if (!course) return NextResponse.json({ error:'Course not found' },{ status:404 });
  if (profileError) return NextResponse.json({ error:profileError.message },{ status:500 });
  const approvedIb = profile.ib_status === 'active';
  let finalPrice = course.price;
  let method: 'ziina'|'free'|'coupon'|'admin_grant'|'ib_grant' = approvedIb ? 'ib_grant' : Number(course.price) <= 0 ? 'free' : 'ziina';
  if (approvedIb) finalPrice=0;
  if (coupon_code && !approvedIb) {
    const { data:coupon } = await supabaseAdmin.from('coupons').select('*').eq('code',coupon_code.toUpperCase().trim()).eq('is_active',true).maybeSingle();
    if (!coupon) return NextResponse.json({ error:'Invalid or inactive coupon' },{ status:400 });
    if (coupon.expires_at && new Date(coupon.expires_at)<new Date()) return NextResponse.json({ error:'Coupon expired' },{ status:400 });
    if (coupon.max_uses && coupon.uses_count>=coupon.max_uses) return NextResponse.json({ error:'Coupon max uses reached' },{ status:400 });
    if (coupon.course_id && coupon.course_id!==course_id) return NextResponse.json({ error:'Coupon not valid for this course' },{ status:400 });
    if (coupon.discount_type==='full') finalPrice=0;
    else if (coupon.discount_type==='percent') finalPrice=course.price*(1-coupon.discount_value/100);
    else finalPrice=Math.max(0,course.price-coupon.discount_value);
    method='coupon';
    if (finalPrice <= 0) {
      const { error:couponUseError } = await supabaseAdmin.rpc('increment_coupon_uses',{ p_coupon_id:coupon.id, p_max_uses:coupon.max_uses });
      if (couponUseError) return NextResponse.json({ error:'Coupon limit reached or coupon inactive' },{ status:409 });
    }
  }
  if (finalPrice>0) {
    return NextResponse.json({ requires_payment:true, gateway:'ziina', course_id, coupon_code:coupon_code||null, amount_usd:finalPrice, amount_aed:(finalPrice*3.6725).toFixed(2) },{ status:202 });
  }
  const { data, error } = await supabaseAdmin.from('enrollments').upsert({ user_id:s.userId, course_id, status:'active', payment_method:method, amount_paid:finalPrice, enrolled_at:new Date().toISOString(), revoked_at:null },{ onConflict:'user_id,course_id' }).select('*').single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({...data,ib_benefit:approvedIb},{ status:201 });
}

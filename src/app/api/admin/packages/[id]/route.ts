import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, supabaseAdmin } from '@/lib/supabase/server';
import { saveMembershipPaymentLink } from '@/lib/packages/paymentLinks';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params:Promise<{id:string}> }) {
  const { id } = await params;
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error:'Forbidden' }, { status:403 });
  const body = await req.json();
  const allowed = ['name','slug','description','price','billing_period','is_active','is_featured','sort_order'];
  const update:Record<string,unknown> = {};
  for (const key of allowed) if (body[key] !== undefined) update[key] = body[key];
  if (update.name) update.name = String(update.name).trim();
  if (update.slug) update.slug = String(update.slug).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if (update.price !== undefined) update.price = Math.max(0, Number(update.price) || 0);
  if (update.sort_order !== undefined) update.sort_order = Number(update.sort_order) || 0;
  const { data, error } = await supabaseAdmin.from('packages').update(update).eq('id',id).select('*').single();
  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  if (Array.isArray(body.features)) {
    const features = body.features.map((value:unknown) => String(value).trim()).filter(Boolean);
    const { error:deleteError } = await supabaseAdmin.from('package_features').delete().eq('package_id',id);
    if (deleteError) return NextResponse.json({ error:deleteError.message }, { status:500 });
    if (features.length) {
      const { error:insertError } = await supabaseAdmin.from('package_features').insert(features.map((feature_text:string,index:number)=>({package_id:id,feature_text,sort_order:index})));
      if (insertError) return NextResponse.json({ error:insertError.message }, { status:500 });
    }
  }
  try { if (body.payment_url !== undefined) await saveMembershipPaymentLink(id, body.payment_url, session.userId); }
  catch (linkError) { return NextResponse.json({ error:linkError instanceof Error?linkError.message:'Invalid payment link' }, { status:400 }); }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params:Promise<{id:string}> }) {
  const { id } = await params;
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error:'Forbidden' }, { status:403 });
  const { count } = await supabaseAdmin.from('profiles').select('*',{count:'exact',head:true}).eq('package_id',id);
  if (count) return NextResponse.json({ error:`Cannot delete: ${count} member(s) currently use this package. Deactivate it instead.` }, { status:409 });
  const { error } = await supabaseAdmin.from('packages').delete().eq('id',id);
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  try { await saveMembershipPaymentLink(id, '', session.userId); } catch {}
  return NextResponse.json({success:true});
}

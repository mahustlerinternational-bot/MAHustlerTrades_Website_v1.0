import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, supabaseAdmin } from '@/lib/supabase/server';
import { getMembershipPaymentLinks, saveMembershipPaymentLink } from '@/lib/packages/paymentLinks';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [{ data, error }, links] = await Promise.all([
    supabaseAdmin.from('packages').select('*,features:package_features(*)').order('sort_order'),
    getMembershipPaymentLinks(),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(pkg => ({ ...pkg, payment_url: links[pkg.id] ?? '' })));
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const name = String(body.name ?? '').trim();
  if (name.length < 2) return NextResponse.json({ error: 'Package name is required' }, { status: 400 });
  const slug = String(body.slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const { data, error } = await supabaseAdmin.from('packages').insert({
    name, slug, description: body.description || null, price: Math.max(0, Number(body.price) || 0),
    billing_period: body.billing_period ?? 'monthly', is_active: body.is_active !== false,
    is_featured: Boolean(body.is_featured), sort_order: Number(body.sort_order) || 0,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (Array.isArray(body.features) && body.features.length) {
    await supabaseAdmin.from('package_features').insert(body.features.map((feature: string, index: number) => ({ package_id:data.id, feature_text:String(feature).trim(), sort_order:index })));
  }
  try { if (body.payment_url) await saveMembershipPaymentLink(data.id, body.payment_url, session.userId); }
  catch (linkError) { return NextResponse.json({ error:linkError instanceof Error?linkError.message:'Invalid payment link' }, { status:400 }); }
  return NextResponse.json(data, { status: 201 });
}

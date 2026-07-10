import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAuthSession } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { data, error } = await supabaseAdmin.from('profiles').select('package_id,package:packages(*,features:package_features(*))').eq('id',s.userId).single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json((data as any)?.package??null);
}
export async function POST(req: NextRequest) {
  const s = await requireAuthSession(req);
  if (!s?.userId) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  const { package_id } = await req.json();
  if (!package_id) return NextResponse.json({ error:'package_id required' },{ status:400 });
  const { data:pkg } = await supabaseAdmin.from('packages').select('id,price,name').eq('id',package_id).eq('is_active',true).single();
  if (!pkg) return NextResponse.json({ error:'Package not found' },{ status:404 });
  if (pkg.price===0) {
    await supabaseAdmin.from('profiles').update({ package_id }).eq('id',s.userId);
    return NextResponse.json({ success:true, package_name:pkg.name });
  }
  return NextResponse.json({ requires_payment:true, gateway:'ziina', package_id:pkg.id, package_name:pkg.name, amount_usd:pkg.price, amount_aed:(pkg.price*3.6725).toFixed(2) },{ status:202 });
}

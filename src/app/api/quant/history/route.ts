import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession,supabaseAdmin} from '@/lib/supabase/server';
import {signalPerformance} from '@/lib/quant/performance';
import type {QuantSignal} from '@/types';

export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data:profile,error:profileError}=await supabaseAdmin.from('profiles').select('role,package_id,ib_status').eq('id',session.userId).single();
  if(profileError)return NextResponse.json({error:profileError.message},{status:500});
  const allowed=profile.role==='admin'||profile.ib_status==='active'||Boolean(profile.package_id);
  if(!allowed)return NextResponse.json({error:'Premium or approved Elite access is required'},{status:403});
  const limit=Math.min(100,Math.max(1,Number(new URL(req.url).searchParams.get('limit')??50)));
  const {data,error}=await supabaseAdmin.from('quant_signals').select('*').order('broadcasted_at',{ascending:false}).limit(limit);
  if(error)return NextResponse.json({error:error.message},{status:500});
  const signals=(data??[]) as QuantSignal[];
  return NextResponse.json(
    {data:signals,performance:signalPerformance(signals)},
    {headers:{'Cache-Control':'private, no-store, max-age=0'}},
  );
}

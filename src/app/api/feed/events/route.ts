import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession,supabaseAdmin} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {data:profile,error:profileError}=await supabaseAdmin.from('profiles').select('role,package_id,ib_status').eq('id',session.userId).single();
  if(profileError)return NextResponse.json({error:profileError.message},{status:500});
  if(profile.role!=='admin'&&profile.ib_status!=='active'&&!profile.package_id)return NextResponse.json({error:'Premium or approved IB access is required'},{status:403});
  const url=new URL(req.url),limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')??30))),category=url.searchParams.get('category');
  let query=supabaseAdmin.from('signal_feed_events').select('*').order('occurred_at',{ascending:false}).limit(limit);if(category)query=query.eq('category',category);
  const {data,error}=await query;if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({data:data??[]});
}

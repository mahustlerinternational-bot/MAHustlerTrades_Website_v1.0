import {NextRequest,NextResponse} from 'next/server';
import {requireAuthSession,supabaseAdmin} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const [accounts,profile,invites]=await Promise.all([
    supabaseAdmin.from('member_community_accounts').select('platform,platform_user_id,username,display_name,email_masked,email_matches_account,verified_at').eq('user_id',session.userId),
    supabaseAdmin.from('profiles').select('ib_status').eq('id',session.userId).single(),
    supabaseAdmin.from('community_invites').select('platform,invite_url,expires_at,status').eq('user_id',session.userId).eq('status','active'),
  ]);
  if(accounts.error||profile.error||invites.error)return NextResponse.json({error:(accounts.error??profile.error??invites.error)?.message},{status:500});
  return NextResponse.json({accounts:accounts.data??[],ib_approved:profile.data.ib_status==='active',invites:invites.data??[]});
}

export async function DELETE(req:NextRequest){
  const session=await requireAuthSession(req);if(!session)return NextResponse.json({error:'Unauthorized'},{status:401});
  const platform=new URL(req.url).searchParams.get('platform');if(!['telegram','discord'].includes(platform??''))return NextResponse.json({error:'Invalid platform'},{status:400});
  const {error}=await supabaseAdmin.from('member_community_accounts').delete().eq('user_id',session.userId).eq('platform',platform!);
  if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({success:true});
}

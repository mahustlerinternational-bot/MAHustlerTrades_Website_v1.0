import {NextRequest,NextResponse} from 'next/server';
import {identityHash,maskEmail,consumeLinkCode} from '@/lib/community/linking';
import {loadIntegrationSettings} from '@/lib/integrations/settings';
import {supabaseAdmin} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
const destination=(req:NextRequest,status:string)=>NextResponse.redirect(new URL(`/portal/ib?community=${status}`,req.url));
export async function GET(req:NextRequest){
  const url=new URL(req.url),code=url.searchParams.get('code'),state=url.searchParams.get('state');
  if(!code||!state)return destination(req,'discord-error');
  const link=await consumeLinkCode(state,'discord');if(!link)return destination(req,'discord-expired');
  try{
    const {discord}=await loadIntegrationSettings();const redirectUri=String(link.metadata?.redirect_uri??'');
    const tokenResponse=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:discord.client_id,client_secret:discord.client_secret,grant_type:'authorization_code',code,redirect_uri:redirectUri})});
    const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)throw new Error(token.error_description??'Discord token exchange failed');
    const userResponse=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:`Bearer ${token.access_token}`}});const user=await userResponse.json();if(!userResponse.ok||!user.id)throw new Error('Discord identity lookup failed');
    const auth=await supabaseAdmin.auth.admin.getUserById(link.user_id);const accountEmail=auth.data.user?.email?.trim().toLowerCase()??'';const email=String(user.email??'').trim().toLowerCase();
    const row={user_id:link.user_id,platform:'discord',platform_user_id:String(user.id),username:String(user.username??''),display_name:String(user.global_name??user.username??''),email_hash:email?identityHash(email):null,email_masked:email?maskEmail(email):null,email_matches_account:Boolean(email&&accountEmail&&email===accountEmail),metadata:{avatar:user.avatar??null,email_verified:Boolean(user.verified)}};
    const saved=await supabaseAdmin.from('member_community_accounts').upsert(row,{onConflict:'user_id,platform'});if(saved.error)throw new Error(saved.error.message);
    return destination(req,'discord-linked');
  }catch(error){console.error('[discord callback]',error);return destination(req,'discord-error');}
}

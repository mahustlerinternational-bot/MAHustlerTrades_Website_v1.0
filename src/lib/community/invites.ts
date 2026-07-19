import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';
import {loadIntegrationSettings} from '@/lib/integrations/settings';

export interface CommunityInvite{platform:'telegram'|'discord';invite_url:string;expires_at:string|null;status:string;}

async function telegramInvite(userId:string){
  const {telegram}=await loadIntegrationSettings();
  if(!telegram.enabled)return null;
  if(telegram.bot_token&&telegram.chat_id){
    try{
      const response=await fetch(`https://api.telegram.org/bot${telegram.bot_token}/createChatInviteLink`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:telegram.chat_id,name:`IB ${userId.slice(0,8)}`,member_limit:1}),signal:AbortSignal.timeout(10000),
      });
      const body=await response.json().catch(()=>null);
      if(response.ok&&body?.ok&&body.result?.invite_link)return {url:String(body.result.invite_link),expiresAt:null};
    }catch{/* fallback below */}
  }
  return telegram.invite_url?{url:telegram.invite_url,expiresAt:null}:null;
}

export async function provisionCommunityInvites(userId:string){
  const settings=await loadIntegrationSettings();
  const telegram=await telegramInvite(userId);
  const candidates:Array<{platform:'telegram'|'discord';url:string;expiresAt:string|null}>=[];
  if(telegram)candidates.push({platform:'telegram',url:telegram.url,expiresAt:telegram.expiresAt});
  if(settings.discord.enabled&&settings.discord.invite_url)candidates.push({platform:'discord',url:settings.discord.invite_url,expiresAt:null});
  const results:CommunityInvite[]=[];
  for(const item of candidates){
    const {data,error}=await supabaseAdmin.from('community_invites').upsert({user_id:userId,platform:item.platform,invite_url:item.url,status:'active',expires_at:item.expiresAt},{onConflict:'user_id,platform'}).select('platform,invite_url,expires_at,status').single();
    if(!error&&data)results.push(data as CommunityInvite);
  }
  return results;
}

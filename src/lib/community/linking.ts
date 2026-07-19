import 'server-only';

import {createHash,randomBytes} from 'crypto';
import {supabaseAdmin} from '@/lib/supabase/server';

export type CommunityPlatform='telegram'|'discord';
export const linkTokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const identityHash=(value:string)=>createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

export function maskEmail(email:string){
  const [name='',domain='']=email.trim().toLowerCase().split('@');
  if(!domain)return '';
  return `${name.slice(0,2)}${name.length>2?'***':''}@${domain}`;
}

export async function createLinkCode(userId:string,platform:CommunityPlatform,metadata:Record<string,unknown>={}){
  await supabaseAdmin.from('community_link_codes').delete().eq('user_id',userId).eq('platform',platform).is('used_at',null);
  const token=randomBytes(24).toString('base64url');
  const {error}=await supabaseAdmin.from('community_link_codes').insert({user_id:userId,platform,token_hash:linkTokenHash(token),expires_at:new Date(Date.now()+15*60_000).toISOString(),metadata});
  if(error)throw new Error(error.message);
  return token;
}

export async function consumeLinkCode(token:string,platform:CommunityPlatform){
  const now=new Date().toISOString();
  const {data,error}=await supabaseAdmin.from('community_link_codes').select('*').eq('token_hash',linkTokenHash(token)).eq('platform',platform).is('used_at',null).gt('expires_at',now).maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)return null;
  const used=await supabaseAdmin.from('community_link_codes').update({used_at:now}).eq('id',data.id).is('used_at',null).select('*').maybeSingle();
  if(used.error||!used.data)return null;
  return used.data;
}

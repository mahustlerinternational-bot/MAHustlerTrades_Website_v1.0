import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface IntegrationSettings {
  telegram: { enabled:boolean; bot_token:string; chat_id:string; invite_url:string; inbound_enabled:boolean; source_chat_id:string; webhook_secret:string };
  discord: { enabled:boolean; webhook_url:string; invite_url:string; oauth_enabled:boolean; client_id:string; client_secret:string };
  ea: { enabled:boolean; webhook_secret:string };
}

const DEFAULTS: IntegrationSettings = {
  telegram:{ enabled:false, bot_token:'', chat_id:'', invite_url:'', inbound_enabled:false, source_chat_id:'', webhook_secret:'' },
  discord:{ enabled:false, webhook_url:'', invite_url:'', oauth_enabled:false, client_id:'', client_secret:'' },
  ea:{ enabled:true, webhook_secret:'' },
};

function encryptionKeys() {
  const materials=[process.env.INTEGRATION_ENCRYPTION_KEY,process.env.SUPABASE_SERVICE_ROLE_KEY].filter((value,index,list):value is string=>Boolean(value)&&list.indexOf(value)===index);
  if(!materials.length)throw new Error('Integration encryption key is not configured');
  return materials.map(material=>createHash('sha256').update(material).digest());
}

function encrypt(value:string) {
  if(!value)return '';
  if(value.startsWith('enc:v1:'))return value;
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',encryptionKeys()[0],iv);
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return `enc:v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decrypt(value:unknown) {
  if(typeof value!=='string'||!value)return '';
  if(!value.startsWith('enc:v1:'))return value;
  const [,version,ivRaw,tagRaw,dataRaw]=value.split(':');
  if(version!=='v1')return '';
  for(const key of encryptionKeys())try{
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(ivRaw,'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw,'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataRaw,'base64url')),decipher.final()]).toString('utf8');
  }catch{/* try the fallback key */}
  return '';
}

type StoredSettings = {
  telegram?:Partial<IntegrationSettings['telegram']>;
  discord?:Partial<IntegrationSettings['discord']>;
  ea?:Partial<IntegrationSettings['ea']>;
};

export async function loadIntegrationSettings():Promise<IntegrationSettings>{
  const {data,error}=await supabaseAdmin.from('site_settings').select('value').eq('key','integrations').maybeSingle();
  if(error)throw new Error(error.message);
  const raw=(data?.value??{}) as StoredSettings;
  return {
    telegram:{...DEFAULTS.telegram,...raw.telegram,bot_token:decrypt(raw.telegram?.bot_token),webhook_secret:decrypt(raw.telegram?.webhook_secret)},
    discord:{...DEFAULTS.discord,...raw.discord,webhook_url:decrypt(raw.discord?.webhook_url),client_secret:decrypt(raw.discord?.client_secret)},
    ea:{...DEFAULTS.ea,...raw.ea,webhook_secret:decrypt(raw.ea?.webhook_secret)},
  };
}

export async function saveIntegrationSettings(next:IntegrationSettings,userId:string){
  const stored={
    telegram:{...next.telegram,bot_token:encrypt(next.telegram.bot_token),webhook_secret:encrypt(next.telegram.webhook_secret)},
    discord:{...next.discord,webhook_url:encrypt(next.discord.webhook_url),client_secret:encrypt(next.discord.client_secret)},
    ea:{...next.ea,webhook_secret:encrypt(next.ea.webhook_secret)},
  };
  const {error}=await supabaseAdmin.from('site_settings').upsert({
    key:'integrations',value:stored,description:'Encrypted Telegram, Discord, and EA signal hub settings',updated_by:userId,
  },{onConflict:'key'});
  if(error)throw new Error(error.message);
}

export function publicIntegrationSettings(settings:IntegrationSettings){
  return {
    telegram:{enabled:settings.telegram.enabled,chat_id:settings.telegram.chat_id,invite_url:settings.telegram.invite_url,bot_token_configured:Boolean(settings.telegram.bot_token),inbound_enabled:settings.telegram.inbound_enabled,source_chat_id:settings.telegram.source_chat_id,webhook_secret_configured:Boolean(settings.telegram.webhook_secret)},
    discord:{enabled:settings.discord.enabled,invite_url:settings.discord.invite_url,webhook_url_configured:Boolean(settings.discord.webhook_url),oauth_enabled:settings.discord.oauth_enabled,client_id:settings.discord.client_id,client_secret_configured:Boolean(settings.discord.client_secret)},
    ea:{enabled:settings.ea.enabled,webhook_secret_configured:Boolean(settings.ea.webhook_secret)},
  };
}

export function newEaSecret(){return `mah_ea_${randomBytes(32).toString('base64url')}`;}

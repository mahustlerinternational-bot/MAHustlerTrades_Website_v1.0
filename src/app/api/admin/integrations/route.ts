import { NextRequest,NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/server';
import { loadIntegrationSettings,newEaSecret,publicIntegrationSettings,saveIntegrationSettings } from '@/lib/integrations/settings';
import { sendDiscordMessage,sendTelegramMessage } from '@/lib/integrations/broadcast';
import {randomBytes} from 'crypto';

export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{return NextResponse.json({...publicIntegrationSettings(await loadIntegrationSettings()),endpoint:`${process.env.NEXT_PUBLIC_APP_URL??''}/api/integrations/ea/signals`,telegram_webhook_endpoint:`${process.env.NEXT_PUBLIC_APP_URL??''}/api/integrations/telegram/webhook`});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}
}

export async function PATCH(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const body=await req.json();const current=await loadIntegrationSettings();
    const next={
      telegram:{...current.telegram,enabled:Boolean(body.telegram?.enabled),chat_id:String(body.telegram?.chat_id??''),invite_url:String(body.telegram?.invite_url??''),inbound_enabled:Boolean(body.telegram?.inbound_enabled),source_chat_id:String(body.telegram?.source_chat_id??'')},
      discord:{...current.discord,enabled:Boolean(body.discord?.enabled),invite_url:String(body.discord?.invite_url??''),oauth_enabled:Boolean(body.discord?.oauth_enabled),client_id:String(body.discord?.client_id??'').trim()},
      ea:{...current.ea,enabled:Boolean(body.ea?.enabled)},
    };
    if(body.telegram?.bot_token)next.telegram.bot_token=String(body.telegram.bot_token).trim();
    if(body.telegram?.webhook_secret)next.telegram.webhook_secret=String(body.telegram.webhook_secret).trim();
    if(body.discord?.webhook_url)next.discord.webhook_url=String(body.discord.webhook_url).trim();
    if(body.discord?.client_secret)next.discord.client_secret=String(body.discord.client_secret).trim();
    if(body.ea?.webhook_secret)next.ea.webhook_secret=String(body.ea.webhook_secret).trim();
    if(next.telegram.invite_url&&!/^https:\/\//i.test(next.telegram.invite_url))throw new Error('Telegram invite URL must use https://');
    if(next.discord.invite_url&&!/^https:\/\//i.test(next.discord.invite_url))throw new Error('Discord invite URL must use https://');
    if(next.discord.webhook_url&&!/^https:\/\/(?:canary\.|ptb\.)?(?:discord\.com|discordapp\.com)\/api\/webhooks\//i.test(next.discord.webhook_url))throw new Error('Enter a valid Discord incoming webhook URL');
    await saveIntegrationSettings(next,session.userId);
    return NextResponse.json({...publicIntegrationSettings(next),endpoint:`${process.env.NEXT_PUBLIC_APP_URL??''}/api/integrations/ea/signals`,telegram_webhook_endpoint:`${process.env.NEXT_PUBLIC_APP_URL??''}/api/integrations/telegram/webhook`});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}
}

export async function POST(req:NextRequest){
  const session=await requireAdminSession(req);if(!session)return NextResponse.json({error:'Forbidden'},{status:403});
  try{
    const {action}=await req.json();
    if(action==='configure_telegram_webhook'){
      const settings=await loadIntegrationSettings();const base=process.env.NEXT_PUBLIC_APP_URL??'';
      if(!settings.telegram.bot_token)throw new Error('Save the Telegram bot token first');
      if(!settings.telegram.source_chat_id)throw new Error('Set the inbound source channel ID or @username first');
      if(!/^https:\/\//i.test(base)||/localhost|127\.0\.0\.1/i.test(base))throw new Error('NEXT_PUBLIC_APP_URL must be your public HTTPS domain before Telegram webhook activation');
      if(!settings.telegram.webhook_secret)settings.telegram.webhook_secret=`tg_wh_${randomBytes(32).toString('base64url')}`;
      const url=`${base.replace(/\/$/,'')}/api/integrations/telegram/webhook`;
      const response=await fetch(`https://api.telegram.org/bot${settings.telegram.bot_token}/setWebhook`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,secret_token:settings.telegram.webhook_secret,allowed_updates:['message','channel_post','edited_channel_post'],drop_pending_updates:false}),signal:AbortSignal.timeout(10000)});
      const result=await response.json().catch(()=>null);if(!response.ok||!result?.ok)throw new Error(result?.description??`Telegram HTTP ${response.status}`);
      settings.telegram.inbound_enabled=true;await saveIntegrationSettings(settings,session.userId);return NextResponse.json({success:true,url});
    }
    if(action==='telegram_webhook_status'){
      const settings=await loadIntegrationSettings();if(!settings.telegram.bot_token)throw new Error('Telegram bot token is not configured');
      const response=await fetch(`https://api.telegram.org/bot${settings.telegram.bot_token}/getWebhookInfo`,{signal:AbortSignal.timeout(10000)});const result=await response.json().catch(()=>null);if(!response.ok||!result?.ok)throw new Error(result?.description??`Telegram HTTP ${response.status}`);
      const info=result.result??{};return NextResponse.json({success:true,url:info.url??'',pending_update_count:info.pending_update_count??0,last_error_message:info.last_error_message??null,allowed_updates:info.allowed_updates??[]});
    }
    if(action==='disable_telegram_webhook'){
      const settings=await loadIntegrationSettings();if(settings.telegram.bot_token)await fetch(`https://api.telegram.org/bot${settings.telegram.bot_token}/deleteWebhook`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drop_pending_updates:false}),signal:AbortSignal.timeout(10000)});
      settings.telegram.inbound_enabled=false;await saveIntegrationSettings(settings,session.userId);return NextResponse.json({success:true});
    }
    if(action==='rotate_ea_secret'){
      const settings=await loadIntegrationSettings();const secret=newEaSecret();settings.ea.webhook_secret=secret;settings.ea.enabled=true;
      await saveIntegrationSettings(settings,session.userId);return NextResponse.json({success:true,secret});
    }
    if(action==='test_telegram'){
      const result=await sendTelegramMessage('✅ MAHustler Telegram connection test successful.');
      return NextResponse.json(result,{status:result.ok?200:400});
    }
    if(action==='test_discord'){
      const result=await sendDiscordMessage('✅ MAHustler Discord connection test successful.');
      return NextResponse.json(result,{status:result.ok?200:400});
    }
    return NextResponse.json({error:'Unknown action'},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}
}

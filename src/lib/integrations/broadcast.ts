import 'server-only';

import type { QuantSignal } from '@/types';
import { loadIntegrationSettings } from './settings';

export type SignalEvent='opened'|'closed'|'cancelled';
export type DeliveryResult={enabled:boolean;ok:boolean;error?:string};

function signalResult(signal:QuantSignal){
  if(signal.status==='closed_tp')return '✅ TAKE PROFIT HIT';
  if(signal.status==='closed_sl')return '🛑 STOP LOSS HIT';
  if(signal.status==='cancelled')return '⚪ SIGNAL CANCELLED';
  if(signal.status==='closed_manual')return signal.result_r!=null&&signal.result_r>=0?'✅ SIGNAL CLOSED IN PROFIT':'🛑 SIGNAL CLOSED';
  return '⚡ NEW LIVE SIGNAL';
}

function plainMessage(signal:QuantSignal){
  const result=signal.result_r==null?'':`\nResult: ${signal.result_r>=0?'+':''}${Number(signal.result_r).toFixed(2)}R`;
  return `${signalResult(signal)}\n${signal.instrument} · ${signal.signal_type.toUpperCase()}\nEntry: ${signal.entry_price}\nTP: ${signal.tp_price}\nSL: ${signal.sl_price}${result}${signal.analysis_notes?`\n\n${signal.analysis_notes}`:''}`;
}

export async function sendTelegramMessage(text:string){
  const settings=await loadIntegrationSettings();
  const cfg=settings.telegram;
  if(!cfg.enabled)return {enabled:false,ok:false} satisfies DeliveryResult;
  if(!cfg.bot_token||!cfg.chat_id)return {enabled:true,ok:false,error:'Telegram bot token or chat ID is missing'} satisfies DeliveryResult;
  try{
    const response=await fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendMessage`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:cfg.chat_id,text,disable_web_page_preview:true}),signal:AbortSignal.timeout(10000),
    });
    const body=await response.json().catch(()=>null);
    if(!response.ok||body?.ok===false)throw new Error(body?.description??`Telegram HTTP ${response.status}`);
    return {enabled:true,ok:true} satisfies DeliveryResult;
  }catch(error){return {enabled:true,ok:false,error:error instanceof Error?error.message:String(error)} satisfies DeliveryResult;}
}

export async function sendDiscordMessage(text:string,signal?:QuantSignal){
  const settings=await loadIntegrationSettings();
  const cfg=settings.discord;
  if(!cfg.enabled)return {enabled:false,ok:false} satisfies DeliveryResult;
  if(!cfg.webhook_url)return {enabled:true,ok:false,error:'Discord webhook URL is missing'} satisfies DeliveryResult;
  try{
    const payload=signal?{
      username:'MAHustler Signals',
      embeds:[{title:signalResult(signal),description:text,color:signal.status==='closed_sl'?16729971:signal.status==='active'?13807415:3447003,timestamp:new Date().toISOString()}],
      allowed_mentions:{parse:[]},
    }:{username:'MAHustler Signals',content:text,allowed_mentions:{parse:[]}};
    const separator=cfg.webhook_url.includes('?')?'&':'?';
    const response=await fetch(`${cfg.webhook_url}${separator}wait=true`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error(`Discord HTTP ${response.status}: ${(await response.text()).slice(0,160)}`);
    return {enabled:true,ok:true} satisfies DeliveryResult;
  }catch(error){return {enabled:true,ok:false,error:error instanceof Error?error.message:String(error)} satisfies DeliveryResult;}
}

export async function broadcastSignal(signal:QuantSignal,_event:SignalEvent,channels:{telegram?:boolean;discord?:boolean}={}){
  const text=plainMessage(signal);
  const [telegram,discord]=await Promise.all([
    channels.telegram===false?Promise.resolve({enabled:false,ok:false} as DeliveryResult):sendTelegramMessage(text),
    channels.discord===false?Promise.resolve({enabled:false,ok:false} as DeliveryResult):sendDiscordMessage(text,signal),
  ]);
  return {website:{enabled:true,ok:true},telegram,discord,broadcasted_at:new Date().toISOString()};
}

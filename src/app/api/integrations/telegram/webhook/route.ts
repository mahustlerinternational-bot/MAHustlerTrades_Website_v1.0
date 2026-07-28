import {timingSafeEqual} from 'crypto';
import {NextRequest,NextResponse} from 'next/server';
import {loadIntegrationSettings} from '@/lib/integrations/settings';
import {parseTelegramPost} from '@/lib/integrations/telegramParser';
import {sendDiscordMessage} from '@/lib/integrations/broadcast';
import {closeSignal,openSignal,updateSignalOutcome} from '@/lib/quant/signalService';
import {supabaseAdmin} from '@/lib/supabase/server';
import {consumeLinkCode} from '@/lib/community/linking';
import {signalEntryZone} from '@/lib/quant/signalLevels';
import {inboundTelegramPost} from '@/lib/integrations/telegramUpdate';
import type {QuantSignal} from '@/types';

export const dynamic='force-dynamic';
function secureEqual(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
function regimeName(value:string){const v=value.toLowerCase();return v.includes('accumul')?'Accumulation':v.includes('distribut')?'Distribution':v.includes('rang')?'Ranging':'Trending';}
async function reply(botToken:string,chatId:string,text:string){
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text}),signal:AbortSignal.timeout(10000)}).catch(()=>null);
}
async function findActiveSignal(input:{instrument?:string;signal_type?:string;entry?:number;ticket?:string}){
  let query=supabaseAdmin.from('quant_signals').select('*').eq('status','active');
  if(input.instrument)query=query.eq('instrument',input.instrument);
  if(input.signal_type)query=query.eq('signal_type',input.signal_type);
  const result=await query.order('broadcasted_at',{ascending:false}).limit(50);
  if(result.error)throw new Error(result.error.message);
  const candidates=(result.data??[]) as QuantSignal[];
  const ticket=String(input.ticket??'').replace(/^#/,'').trim().toLowerCase();
  if(ticket){
    const ticketMatch=candidates.find(candidate=>{
      const metadataTicket=String(candidate.metadata?.telegram_ticket??candidate.metadata?.ticket??'').replace(/^#/,'').trim().toLowerCase();
      const externalTicket=String(candidate.external_id??'').replace(/^#/,'').trim().toLowerCase();
      return metadataTicket===ticket||externalTicket===ticket;
    });
    if(ticketMatch)return ticketMatch;
  }
  if(input.entry!=null&&Number.isFinite(Number(input.entry))){
    const entry=Number(input.entry);
    const entryMatch=candidates.find(candidate=>{
      if(Math.abs(Number(candidate.entry_price)-entry)<0.00001)return true;
      const zone=signalEntryZone(candidate);
      return zone.isRange&&entry>=zone.low&&entry<=zone.high;
    });
    if(entryMatch)return entryMatch;
  }
  // The connected EA intentionally has one current setup at a time. Its
  // outcome notifications do not contain a ticket, direction, or entry, so
  // fall back only to the newest active Telegram-created EA signal. Never
  // attach an anonymous Telegram outcome to a manually-created admin signal.
  const telegramEa=candidates.find(candidate=>
    candidate.source==='ea'&&String(candidate.external_id??'').startsWith('tg:'),
  );
  return telegramEa??(candidates.length===1?candidates[0]:null);
}

async function retirePreviousTelegramEaSignals(instrument:string,keepExternalId:string){
  const now=new Date().toISOString();
  const result=await supabaseAdmin
    .from('quant_signals')
    .update({status:'cancelled',closed_at:now})
    .eq('instrument',instrument)
    .eq('source','ea')
    .eq('status','active')
    .neq('external_id',keepExternalId)
    .like('external_id','tg:%');
  if(result.error)throw new Error(result.error.message);
}

export async function POST(req:NextRequest){
  try{
    const settings=await loadIntegrationSettings(),cfg=settings.telegram;
    if(!cfg.inbound_enabled||!cfg.webhook_secret)return NextResponse.json({error:'Telegram inbound webhook is disabled'},{status:503});
    const supplied=req.headers.get('x-telegram-bot-api-secret-token')??'';
    if(!secureEqual(supplied,cfg.webhook_secret))return NextResponse.json({error:'Unauthorized'},{status:401});
    const update=await req.json();
    if(update.message?.chat?.type==='private'){
      const message=update.message,text=String(message.text??'').trim(),match=text.match(/^\/start\s+link_([A-Za-z0-9_-]+)$/);
      if(!match)return NextResponse.json({ok:true,ignored:'private message without link code'});
      const link=await consumeLinkCode(match[1],'telegram');
      if(!link){await reply(cfg.bot_token,String(message.chat.id),'This account-link code is invalid or expired. Please generate a new one from your MAHustler member portal.');return NextResponse.json({ok:true,linked:false});}
      const account={user_id:link.user_id,platform:'telegram',platform_user_id:String(message.from.id),username:message.from.username?String(message.from.username):null,display_name:[message.from.first_name,message.from.last_name].filter(Boolean).join(' ')||null,metadata:{language_code:message.from.language_code??null}};
      const saved=await supabaseAdmin.from('member_community_accounts').upsert(account,{onConflict:'user_id,platform'});
      if(saved.error){await reply(cfg.bot_token,String(message.chat.id),'This Telegram account is already linked to another member. Please contact support from your member portal.');return NextResponse.json({ok:true,linked:false});}
      await reply(cfg.bot_token,String(message.chat.id),'✅ Telegram account verified. Return to your MAHustler IB portal to use your private channel invitation.');
      return NextResponse.json({ok:true,linked:true});
    }
    const inbound=inboundTelegramPost(update);
    if(!inbound)return NextResponse.json({ok:true,ignored:'not a channel or group post'});
    const {post,edited}=inbound;
    const chatId=String(post.chat?.id??''),username=post.chat?.username?`@${post.chat.username}`:'';
    if(cfg.source_chat_id&&cfg.source_chat_id!==chatId&&cfg.source_chat_id.toLowerCase()!==username.toLowerCase())return NextResponse.json({ok:true,ignored:'unapproved channel'});
    const text=String(post.text??post.caption??'').trim();if(!text)return NextResponse.json({ok:true,ignored:'no text or caption'});
    const parsed=parseTelegramPost(text),stored=[];
    for(let index=0;index<parsed.length;index++){
      const event=parsed[index],externalId=`telegram:${chatId}:${post.message_id}:${index}`;
      const occurredAt=new Date((post.date??Date.now()/1000)*1000).toISOString();
      const baseRow={source:'telegram',external_id:externalId,category:event.category,severity:event.severity,title:event.title,body:event.body,metrics:event.metrics,raw_payload:{update_id:update.update_id,entities:post.entities??[],caption_entities:post.caption_entities??[]},telegram_chat_id:chatId,telegram_message_id:post.message_id,occurred_at:occurredAt};
      const {data:existing}=await supabaseAdmin.from('signal_feed_events').select('id').eq('external_id',externalId).maybeSingle();
      if(existing){
        if(edited){
          const discord=await sendDiscordMessage(`✏️ EDITED TELEGRAM UPDATE\n\n${event.body}`);
          await supabaseAdmin.from('signal_feed_events').update({...baseRow,delivery_status:{website:{ok:true},discord,edited:true}}).eq('id',existing.id);
        }
        stored.push(existing.id);continue;
      }
      // Claim the Telegram message before any side effects. Telegram retries can
      // therefore never create a second trade action or Discord broadcast.
      const claimed=await supabaseAdmin.from('signal_feed_events').insert({...baseRow,delivery_status:{website:{ok:true},discord:{enabled:false,ok:false},processing:true}}).select('id').single();
      if(claimed.error){
        if(claimed.error.code==='23505'){
          const duplicate=await supabaseAdmin.from('signal_feed_events').select('id').eq('external_id',externalId).maybeSingle();
          if(duplicate.data)stored.push(duplicate.data.id);
          continue;
        }
        console.error('[telegram webhook claim]',claimed.error);continue;
      }
      stored.push(claimed.data.id);
      let normalization:Record<string,unknown>={};
      try{
        const n=event.normalized;
        if(n?.action==='open_signal'&&n.instrument&&n.signal_type&&n.entry&&n.tp1&&n.sl){
          const signalExternalId=`tg:${chatId}:${post.message_id}:${index}`;
          await retirePreviousTelegramEaSignals(n.instrument,signalExternalId);
          const signal=await openSignal({external_id:signalExternalId,instrument:n.instrument,signal_type:n.signal_type,entry_price:n.entry,tp_price:n.tp1,sl_price:n.sl,analysis_notes:n.notes,metadata:{entry_zone:n.entry_zone??null,take_profits:[n.tp1,n.tp2,n.tp3].filter((value):value is number=>typeof value==='number'),telegram_message_id:post.message_id,...(n.ticket?{telegram_ticket:n.ticket}:{})}},'ea',null,{cancelExisting:false,externalBroadcast:false});
          normalization={signal_id:signal.id};
        }else if(n?.action==='update_signal'&&n.outcome){
          const match=await findActiveSignal(n);
          if(match){
            const updated=await updateSignalOutcome({id:match.id,outcome:n.outcome,price:n.outcome_price,ticket:n.ticket,event_id:externalId,occurred_at:occurredAt,externalBroadcast:false});
            normalization={signal_id:updated.id,matched:true,outcome:n.outcome,status:updated.status};
          }else normalization={matched:false,outcome:n.outcome};
        }else if(n?.action==='close_signal'&&n.exit){
          const match=await findActiveSignal(n);
          if(match){
            if(n.outcome){
              const updated=await updateSignalOutcome({id:match.id,outcome:n.outcome,price:n.exit,ticket:n.ticket,event_id:externalId,occurred_at:occurredAt,close_status:n.status??'closed_manual',result_r:n.result_r,externalBroadcast:false});
              normalization={signal_id:updated.id,matched:true,outcome:n.outcome,status:updated.status};
            }else{
              const closed=await closeSignal({id:match.id,status:n.status??'closed_manual',closed_price:n.exit,externalBroadcast:false});
              const metadata={...(closed.metadata??{}),...(n.ticket?{telegram_ticket:n.ticket}:{})};
              const patch:Record<string,unknown>={metadata};if(n.result_r!=null)patch.result_r=n.result_r;
              await supabaseAdmin.from('quant_signals').update(patch).eq('id',closed.id);normalization={signal_id:closed.id,matched:true,status:closed.status};
            }
          }else normalization={matched:false};
        }else if(n?.action==='regime'&&n.regime){
          const active=regimeName(n.regime);const values={accumulation_pct:0,trending_pct:0,distribution_pct:0,ranging_pct:0};
          if(active==='Accumulation')values.accumulation_pct=100;else if(active==='Trending')values.trending_pct=100;else if(active==='Distribution')values.distribution_pct=100;else values.ranging_pct=100;
          const result=await supabaseAdmin.from('quant_regimes').insert({...values,active_regime:active,source:'ea',recorded_at:new Date((post.date??Date.now()/1000)*1000).toISOString()}).select('id').single();normalization={regime_id:result.data?.id};
        }
      }catch(error){normalization={error:error instanceof Error?error.message:String(error)};}
      const discord=await sendDiscordMessage(event.body);
      const result=await supabaseAdmin.from('signal_feed_events').update({metrics:{...event.metrics,normalization},delivery_status:{website:{ok:true},discord,processed:true}}).eq('id',claimed.data.id);
      if(result.error)console.error('[telegram webhook finalize]',result.error);
    }
    return NextResponse.json({ok:true,events:stored.length,edited});
  }catch(error){console.error('[telegram webhook]',error);return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}
}

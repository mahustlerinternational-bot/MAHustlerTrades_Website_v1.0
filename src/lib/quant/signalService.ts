import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/server';
import type { QuantSignal, SignalSource, SignalStatus, SignalType } from '@/types';
import { broadcastSignal } from '@/lib/integrations/broadcast';

export type SignalOutcomeCode='tp1_hit'|'tp2_hit'|'tp3_hit'|'sl_hit'|'breakeven'|'entry_close';

export interface OpenSignalInput{
  external_id?:string|null;instrument:string;signal_type:SignalType;entry_price:number;tp_price:number;sl_price:number;
  analysis_notes?:string|null;metadata?:Record<string,unknown>;
}

function finitePositive(value:number,name:string){if(!Number.isFinite(value)||value<=0)throw new Error(`${name} must be a positive number`);}

export async function openSignal(input:OpenSignalInput,source:SignalSource,createdBy:string|null,options:{cancelExisting?:boolean;externalBroadcast?:boolean}={}){
  const instrument=input.instrument.trim().toUpperCase();
  if(!instrument)throw new Error('instrument is required');
  finitePositive(input.entry_price,'entry_price');finitePositive(input.tp_price,'tp_price');finitePositive(input.sl_price,'sl_price');
  if(input.entry_price===input.sl_price)throw new Error('entry_price and sl_price cannot be equal');
  if(input.external_id){
    const {data:existing,error}=await supabaseAdmin.from('quant_signals').select('*').eq('external_id',input.external_id).maybeSingle();
    if(error)throw new Error(error.message);
    if(existing)return existing as QuantSignal;
  }
  const rr=Math.abs(input.tp_price-input.entry_price)/Math.abs(input.entry_price-input.sl_price);
  const risk=Math.abs(input.entry_price-input.sl_price)/input.entry_price*100;
  if(options.cancelExisting!==false)await supabaseAdmin.from('quant_signals').update({status:'cancelled',closed_at:new Date().toISOString()}).eq('instrument',instrument).eq('status','active');
  const {data,error}=await supabaseAdmin.from('quant_signals').insert({
    external_id:input.external_id??null,instrument,signal_type:input.signal_type,
    entry_price:input.entry_price,tp_price:input.tp_price,sl_price:input.sl_price,
    rr_ratio:Number(rr.toFixed(2)),risk_pct:Number(risk.toFixed(2)),analysis_notes:input.analysis_notes?.trim()||null,
    status:'active',source,broadcasted_at:new Date().toISOString(),created_by:createdBy,metadata:input.metadata??{},
  }).select('*').single();
  if(error||!data)throw new Error(error?.message??'Signal insert failed');
  const delivery=await broadcastSignal(data as QuantSignal,'opened',options.externalBroadcast===false?{telegram:false,discord:false}:{});
  const updated=await supabaseAdmin.from('quant_signals').update({delivery_status:{open:delivery}}).eq('id',data.id).select('*').single();
  return (updated.data??data) as QuantSignal;
}

export async function closeSignal(input:{id?:string;external_id?:string;status:SignalStatus;closed_price?:number|null;externalBroadcast?:boolean}){
  if(!input.id&&!input.external_id)throw new Error('id or external_id is required');
  if(!['closed_tp','closed_sl','closed_manual','cancelled'].includes(input.status))throw new Error('Invalid close status');
  let query=supabaseAdmin.from('quant_signals').select('*');
  query=input.id?query.eq('id',input.id):query.eq('external_id',input.external_id!);
  const {data:existing,error:findError}=await query.maybeSingle();
  if(findError)throw new Error(findError.message);
  if(!existing)throw new Error('Signal not found');
  const entry=Number(existing.entry_price),sl=Number(existing.sl_price),tp=Number(existing.tp_price);
  const closedPrice=input.closed_price??(input.status==='closed_tp'?tp:input.status==='closed_sl'?sl:null);
  if(closedPrice!=null&&!Number.isFinite(Number(closedPrice)))throw new Error('closed_price must be numeric');
  const risk=Math.abs(entry-sl);
  const directional=closedPrice==null||risk===0?null:(existing.signal_type==='long'?(Number(closedPrice)-entry):(entry-Number(closedPrice)));
  const result_r=directional==null?null:Number((directional/risk).toFixed(4));
  const result_pct=directional==null?null:Number((directional/entry*100).toFixed(4));
  const {data,error}=await supabaseAdmin.from('quant_signals').update({
    status:input.status,closed_price:closedPrice,closed_at:new Date().toISOString(),result_r,result_pct,
  }).eq('id',existing.id).select('*').single();
  if(error||!data)throw new Error(error?.message??'Signal update failed');
  const delivery=await broadcastSignal(data as QuantSignal,input.status==='cancelled'?'cancelled':'closed',input.externalBroadcast===false?{telegram:false,discord:false}:{});
  const previous=(existing.delivery_status&&typeof existing.delivery_status==='object')?existing.delivery_status:{};
  const updated=await supabaseAdmin.from('quant_signals').update({delivery_status:{...previous,close:delivery}}).eq('id',data.id).select('*').single();
  return (updated.data??data) as QuantSignal;
}

function outcomeTargetPrice(signal:QuantSignal,outcome:SignalOutcomeCode){
  if(outcome==='sl_hit')return Number(signal.sl_price);
  if(outcome==='breakeven'||outcome==='entry_close')return Number(signal.entry_price);
  const index=Number(outcome[2])-1;
  const raw=Array.isArray(signal.metadata?.take_profits)?signal.metadata.take_profits:[];
  const parsed=Number(raw[index]??(index===0?signal.tp_price:null));
  return Number.isFinite(parsed)&&parsed>0?parsed:Number(signal.tp_price);
}

export async function updateSignalOutcome(input:{
  id?:string;
  external_id?:string;
  outcome:SignalOutcomeCode;
  price?:number|null;
  ticket?:string|null;
  event_id?:string|null;
  occurred_at?:string|null;
  close_status?:SignalStatus|null;
  result_r?:number|null;
  externalBroadcast?:boolean;
}){
  if(!input.id&&!input.external_id)throw new Error('id or external_id is required');
  let query=supabaseAdmin.from('quant_signals').select('*');
  query=input.id?query.eq('id',input.id):query.eq('external_id',input.external_id!);
  const {data,error}=await query.maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)throw new Error('Signal not found');
  const existing=data as QuantSignal;
  const previousEvents=Array.isArray(existing.metadata?.outcome_events)
    ? existing.metadata.outcome_events.filter((event):event is Record<string,unknown>=>Boolean(event)&&typeof event==='object')
    : [];
  if(input.event_id&&previousEvents.some(event=>event.event_id===input.event_id))return existing;
  // The EA channel may publish a second celebratory post for the same target.
  // Record a lifecycle milestone only once unless this call explicitly closes
  // the signal (for example, a detailed trade-close message after TP3).
  if(
    !input.close_status
    &&previousEvents.some(event=>event.outcome===input.outcome)
  )return existing;
  const price=input.price!=null&&Number.isFinite(Number(input.price))
    ? Number(input.price)
    : outcomeTargetPrice(existing,input.outcome);
  const targetMatch=input.outcome.match(/^tp([123])_hit$/);
  const priorTargets=Array.isArray(existing.metadata?.hit_targets)
    ? existing.metadata.hit_targets.map(Number).filter(value=>[1,2,3].includes(value))
    : [];
  const hitTargets=targetMatch
    ? [...new Set([...priorTargets,Number(targetMatch[1])])].sort()
    : priorTargets;
  const occurredAt=input.occurred_at??new Date().toISOString();
  const outcomeEvent={
    outcome:input.outcome,
    price,
    ticket:input.ticket??null,
    event_id:input.event_id??null,
    occurred_at:occurredAt,
    source:'telegram',
  };
  const metadata={
    ...(existing.metadata??{}),
    latest_outcome:input.outcome,
    latest_outcome_price:price,
    latest_outcome_at:occurredAt,
    hit_targets:hitTargets,
    outcome_events:[...previousEvents,outcomeEvent],
    ...(input.ticket?{telegram_ticket:input.ticket}:{}),
  };
  const terminalStatus=input.close_status
    ??(input.outcome==='tp3_hit'
      ?'closed_tp'
      :input.outcome==='sl_hit'
        ?'closed_sl'
        :input.outcome==='breakeven'||input.outcome==='entry_close'
          ?'closed_manual'
          :null);
  let signal=existing;
  if(terminalStatus){
    signal=await closeSignal({
      id:existing.id,
      status:terminalStatus,
      closed_price:price,
      externalBroadcast:input.externalBroadcast,
    });
  }
  const patch:Record<string,unknown>={metadata};
  if(input.result_r!=null&&Number.isFinite(Number(input.result_r)))patch.result_r=Number(input.result_r);
  const updated=await supabaseAdmin.from('quant_signals').update(patch).eq('id',signal.id).select('*').single();
  if(updated.error||!updated.data)throw new Error(updated.error?.message??'Signal outcome update failed');
  return updated.data as QuantSignal;
}

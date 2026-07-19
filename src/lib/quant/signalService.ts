import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/server';
import type { QuantSignal, SignalSource, SignalStatus, SignalType } from '@/types';
import { broadcastSignal } from '@/lib/integrations/broadcast';

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

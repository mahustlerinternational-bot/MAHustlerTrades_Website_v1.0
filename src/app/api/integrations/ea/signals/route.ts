import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { loadIntegrationSettings } from '@/lib/integrations/settings';
import { closeSignal, openSignal } from '@/lib/quant/signalService';
import type { SignalStatus, SignalType } from '@/types';

export const dynamic='force-dynamic';

function equalSecret(actual:string,expected:string){
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(req:NextRequest){
  try{
    const settings=await loadIntegrationSettings();
    if(!settings.ea.enabled)return NextResponse.json({error:'EA integration is disabled'},{status:503});
    if(!settings.ea.webhook_secret)return NextResponse.json({error:'EA webhook secret is not configured'},{status:503});
    const header=req.headers.get('authorization')??'';
    const supplied=(header.startsWith('Bearer ')?header.slice(7):req.headers.get('x-ea-secret'))??'';
    if(!equalSecret(supplied,settings.ea.webhook_secret))return NextResponse.json({error:'Unauthorized'},{status:401});
    const b=await req.json();
    const action=String(b.action??(b.status&&b.status!=='active'?'close':'open')).toLowerCase();
    const externalId=String(b.external_id??b.ticket??'').trim();
    if(!externalId)return NextResponse.json({error:'external_id (or ticket) is required'},{status:400});
    if(action==='open'){
      const rawDirection=String(b.signal_type??b.direction??'').toLowerCase();
      const signalType:SignalType=rawDirection==='buy'||rawDirection==='long'?'long':rawDirection==='sell'||rawDirection==='short'?'short':rawDirection as SignalType;
      if(!['long','short'].includes(signalType))return NextResponse.json({error:'signal_type/direction must be buy, sell, long, or short'},{status:400});
      const signal=await openSignal({
        external_id:externalId,instrument:String(b.instrument??b.symbol??''),signal_type:signalType,
        entry_price:Number(b.entry_price??b.entry),tp_price:Number(b.tp_price??b.take_profit??b.tp),sl_price:Number(b.sl_price??b.stop_loss??b.sl),
        analysis_notes:b.analysis_notes??b.comment??null,metadata:{ea:b.ea??null,timeframe:b.timeframe??null,raw_timestamp:b.timestamp??null},
      },'ea',null);
      return NextResponse.json({success:true,action:'open',signal},{status:201});
    }
    if(action==='close'||action==='cancel'){
      const raw=action==='cancel'?'cancelled':String(b.status??b.outcome??'closed_manual').toLowerCase();
      const status:SignalStatus=raw==='tp'||raw==='win'?'closed_tp':raw==='sl'||raw==='loss'?'closed_sl':raw==='cancel'||raw==='cancelled'?'cancelled':'closed_manual';
      const signal=await closeSignal({external_id:externalId,status,closed_price:b.closed_price==null?null:Number(b.closed_price)});
      return NextResponse.json({success:true,action,status,signal});
    }
    return NextResponse.json({error:'action must be open, close, or cancel'},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:400});}
}

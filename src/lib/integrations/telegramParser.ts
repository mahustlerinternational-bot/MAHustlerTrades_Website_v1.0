import type {FeedEventCategory,FeedEventSeverity,SignalType} from '@/types';

export interface ParsedTelegramEvent{
  category:FeedEventCategory;severity:FeedEventSeverity;title:string;body:string;metrics:Record<string,unknown>;
  normalized?:{
    action:'open_signal'|'close_signal'|'regime';instrument?:string;signal_type?:SignalType;entry?:number;tp1?:number;tp2?:number;tp3?:number;sl?:number;
    entry_zone?:{low:number;high:number};exit?:number;result_r?:number;status?:'closed_tp'|'closed_sl'|'closed_manual';ticket?:string;regime?:string;notes?:string;
  };
}

function plain(text:string){return text.replace(/\*\*/g,'').replace(/\r/g,'').trim();}
function cleanValue(value:string){return value.replace(/^[^\p{L}\p{N}+#$@-]+/u,'').replace(/[^\p{L}\p{N}.%+$#@_\/|:+→ -]+$/gu,'').trim();}
function field(text:string,label:string){
  const target=label.toLowerCase();
  const line=plain(text).split('\n').map(x=>x.trim()).find(x=>x.toLowerCase().includes(`${target}:`));
  if(!line)return null;const index=line.toLowerCase().indexOf(`${target}:`);return cleanValue(line.slice(index+label.length+1));
}
function number(value:string|null){if(!value)return null;const match=value.replace(/,/g,'').match(/[+-]?\d+(?:\.\d+)?/);return match?Number(match[0]):null;}
function entryZone(text:string){
  const line=plain(text).split('\n').map(value=>value.trim()).find(value=>/\bentry\s+zone\s*:/i.test(value));
  if(!line)return null;
  const tail=line.slice(line.search(/\bentry\s+zone\s*:/i)).replace(/^entry\s+zone\s*:/i,'');
  const values=[...tail.replace(/,/g,'').matchAll(/\d+(?:\.\d+)?/g)].map(match=>Number(match[0])).filter(value=>Number.isFinite(value)&&value>0);
  if(values.length<2)return null;
  const low=Math.min(values[0],values[1]),high=Math.max(values[0],values[1]);
  return {low,high,midpoint:Number(((low+high)/2).toFixed(5))};
}
function titleOf(text:string){
  const lines=plain(text).split('\n').map(x=>x.trim()).filter(Boolean);
  const numbered=lines.find(x=>/^\d{1,2}\/\d{1,2}\s*[—-]/.test(x));
  if(numbered)return numbered.replace(/^\d{1,2}\/\d{1,2}\s*[—-]\s*/,'').trim();
  return lines[0]?.replace(/^[^\p{L}\p{N}]+/u,'').trim()||'Telegram Update';
}
function instrument(text:string){return plain(text).match(/\bXAUUSDm?\b/i)?.[0]?.replace(/m$/i,'').toUpperCase();}
function direction(text:string):SignalType|undefined{const p=plain(text).toUpperCase();return /\bBUY\b/.test(p)?'long':/\bSELL\b/.test(p)?'short':undefined;}

function parseSection(body:string):ParsedTelegramEvent{
  const p=plain(body),upper=p.toUpperCase(),title=titleOf(body);let category:FeedEventCategory='alert',severity:FeedEventSeverity='info';
  if(/\b(?:BUY|SELL)\s+(?:TRADE\s+OPENED|SIGNAL(?:\s+OPENED)?)\b/.test(upper)){category='signal';severity='success';}
  else if(/TRADE CLOSED/.test(upper)){category='trade_update';severity=/LOSS/.test(upper)?'critical':'success';}
  else if(/TP\d HIT|POSITIONS? OPENED|BREAKEVEN/.test(upper)){category='trade_update';severity='success';}
  else if(/DAILY SUMMARY|PERFORMANCE RECAP/.test(upper)){category='performance';severity='info';}
  else if(/DAILY HALT|LOSS LIMIT|DRAWDOWN/.test(upper)){category='risk';severity='critical';}
  else if(/REGIME SHIFT/.test(upper)){category='regime';severity='warning';}
  else if(/DISCONNECTED|CONNECTION LOST/.test(upper)){category='system';severity='critical';}
  else if(/RECONNECTED|SYSTEM ONLINE|ENGINE ONLINE|CONNECTION RESTORED/.test(upper)){category='system';severity='success';}

  const metrics:Record<string,unknown>={};
  const mappings:Array<[string,string,'number'|'text']>=[
    ['balance','Balance','number'],['equity','Equity','number'],['current_equity','Current Equity','number'],['start_equity','Start Equity','number'],
    ['entry','Entry','number'],['exit','Exit','number'],['tp1','TP1','number'],['tp2','TP2','number'],['tp3','TP3','number'],['stop_loss','Stop Loss','number'],
    ['lot_size','Lot Size','number'],['total_volume','Total Volume','number'],['remaining_volume','Remaining Volume','number'],['risk_usd','Risk','number'],['risk_exposure_pct','Risk Exposure','number'],
    ['confluence_pct','Confluence','number'],['drawdown_pct','Drawdown','number'],['profit','Profit','number'],['loss','Loss','number'],['partial_profit','Partial Profit','number'],
    ['result_r','Result','number'],['net_pnl','NET P&L','number'],['best_result_r','BEST RESULT','number'],['win_rate_pct','WIN RATE','number'],
    ['trades_executed','Trades Executed','number'],['winning_trades','Winning Trades','number'],['losing_trades','Losing Trades','number'],['tp1_hits','TP1 Hits','number'],['tp2_hits','TP2 Hits','number'],['tp3_hits','TP3 Hits','number'],['be_hits','BE Hits','number'],['sl_hits','SL Hits','number'],['signals_evaluated','Signals Evaluated','number'],
    ['ticket','Ticket','text'],['regime','Regime','text'],['market_regime','Market Regime','text'],['previous_regime','Previous Regime','text'],['new_regime','New Regime','text'],['session','Session','text'],['sessions','Sessions','text'],['setup_tags','Setup Tags','text'],['exit_reason','Exit Reason','text'],['duration','Duration','text'],['status','Status','text'],['reason','Reason','text'],
  ];
  for(const [key,label,type] of mappings){const value=field(body,label);if(value!=null){const parsed=type==='number'?number(value):value;if(parsed!=null)metrics[key]=parsed;}}
  const zone=entryZone(body);
  if(zone){
    metrics.entry_zone_low=zone.low;
    metrics.entry_zone_high=zone.high;
    metrics.entry_zone_midpoint=zone.midpoint;
  }
  const inst=instrument(body),side=direction(body);if(inst)metrics.instrument=inst;if(side)metrics.signal_type=side;
  let normalized:ParsedTelegramEvent['normalized'];
  const normalizedEntry=typeof metrics.entry==='number'
    ? metrics.entry as number
    : typeof metrics.entry_zone_midpoint==='number'
      ? metrics.entry_zone_midpoint as number
      : undefined;
  if(category==='signal'&&inst&&side&&normalizedEntry&&typeof metrics.tp1==='number'&&typeof metrics.stop_loss==='number')normalized={action:'open_signal',instrument:inst,signal_type:side,entry:normalizedEntry,entry_zone:zone?{low:zone.low,high:zone.high}:undefined,tp1:metrics.tp1 as number,tp2:metrics.tp2 as number|undefined,tp3:metrics.tp3 as number|undefined,sl:metrics.stop_loss as number,notes:typeof metrics.setup_tags==='string'?metrics.setup_tags:undefined};
  else if(category==='trade_update'&&/TRADE CLOSED/.test(upper)&&inst&&side&&typeof metrics.entry==='number'&&typeof metrics.exit==='number')normalized={action:'close_signal',instrument:inst,signal_type:side,entry:metrics.entry as number,exit:metrics.exit as number,result_r:typeof metrics.result_r==='number'?metrics.result_r as number:undefined,status:/LOSS/.test(upper)?'closed_sl':String(metrics.exit_reason??'').toUpperCase().startsWith('TP')?'closed_tp':'closed_manual',ticket:typeof metrics.ticket==='string'?metrics.ticket.replace(/^#/,''):undefined};
  else if(category==='regime')normalized={action:'regime',regime:String(metrics.new_regime??metrics.regime??'')};
  return {category,severity,title,body:p,metrics,normalized};
}

export function parseTelegramPost(text:string){
  const matches=[...text.matchAll(/^\*{0,2}\d{1,2}\/\d{1,2}\s*[—-].*$/gm)];
  if(matches.length<=1)return [parseSection(text)];
  return matches.map((match,index)=>parseSection(text.slice(match.index!,matches[index+1]?.index??text.length)));
}

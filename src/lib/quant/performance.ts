import type { QuantSignal } from '@/types';

export interface PerformanceMetric{trades:number;wins:number;losses:number;winRate:number;netR:number;}

export function resultR(signal:QuantSignal){
  if(signal.result_r!=null)return Number(signal.result_r);
  if(signal.status==='cancelled'||signal.status==='active')return null;
  const entry=Number(signal.entry_price),stop=Number(signal.sl_price);
  const close=signal.closed_price!=null?Number(signal.closed_price):signal.status==='closed_tp'?Number(signal.tp_price):signal.status==='closed_sl'?stop:null;
  const risk=Math.abs(entry-stop);
  if(close==null||!Number.isFinite(close)||risk===0)return null;
  return signal.signal_type==='long'?(close-entry)/risk:(entry-close)/risk;
}

export function performanceMetric(signals:QuantSignal[],since:Date):PerformanceMetric{
  const results=signals.filter(s=>s.closed_at&&new Date(s.closed_at)>=since).map(resultR).filter((r):r is number=>r!=null&&Number.isFinite(r));
  const wins=results.filter(r=>r>0).length,losses=results.filter(r=>r<0).length;
  return {trades:results.length,wins,losses,winRate:results.length?Number((wins/results.length*100).toFixed(1)):0,netR:Number(results.reduce((a,b)=>a+b,0).toFixed(2))};
}

export function signalPerformance(signals:QuantSignal[],now=new Date()){
  const startDay=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  return {
    daily:performanceMetric(signals,startDay),
    weekly:performanceMetric(signals,new Date(now.getTime()-7*86400000)),
    monthly:performanceMetric(signals,new Date(now.getTime()-30*86400000)),
  };
}

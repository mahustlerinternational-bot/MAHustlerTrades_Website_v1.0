'use client';

import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase/client';
import type {SignalFeedEvent} from '@/types';

const COLORS={signal:'#D4AF37',trade_update:'#34D399',performance:'#60A5FA',risk:'#FF4757',regime:'#A78BFA',system:'#2AABEE',alert:'#F59E0B'} as const;
const ICONS={signal:'⚡',trade_update:'🎯',performance:'📊',risk:'🛡️',regime:'🔄',system:'📡',alert:'🚨'} as const;
export default function SignalEventFeed({initialEvents}:{initialEvents:SignalFeedEvent[]}){
  const [events,setEvents]=useState(initialEvents);
  useEffect(()=>{const channel=supabase.channel('member-signal-feed').on('postgres_changes',{event:'*',schema:'public',table:'signal_feed_events'},payload=>{const event=payload.new as SignalFeedEvent;if(!event?.id)return;setEvents(current=>[event,...current.filter(x=>x.id!==event.id)].sort((a,b)=>new Date(b.occurred_at).getTime()-new Date(a.occurred_at).getTime()).slice(0,30));}).subscribe();return()=>{supabase.removeChannel(channel);};},[]);
  return <section style={{background:'#111',border:'1px solid rgba(255,255,255,.07)',marginBottom:'2rem',animation:'fadeUp .5s .4s ease forwards',opacity:0}}>
    <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{width:'3px',height:'16px',background:'#60A5FA'}}/><p style={{fontFamily:'Cinzel,serif',fontSize:'.72rem',fontWeight:700}}>Swarm Live Feed</p></div><span style={{fontSize:'.56rem',letterSpacing:'1.5px',color:'#34D399'}}>● REALTIME</span></div>
    {events.length===0?<p style={{padding:'2.5rem',textAlign:'center',color:'#555',fontSize:'.75rem'}}>Telegram alerts, risk controls, regime updates, and performance reports will appear here.</p>:<div style={{maxHeight:'620px',overflowY:'auto'}}>{events.map(event=>{const color=COLORS[event.category]??'#888';const metrics=event.metrics??{};const highlights=[['P&L',metrics.net_pnl],['Result',metrics.result_r!=null?`${Number(metrics.result_r)>0?'+':''}${metrics.result_r}R`:null],['Win Rate',metrics.win_rate_pct!=null?`${metrics.win_rate_pct}%`:null],['Drawdown',metrics.drawdown_pct!=null?`${metrics.drawdown_pct}%`:null],['Regime',metrics.new_regime??metrics.regime??metrics.market_regime]].filter((x):x is [string,string|number]=>x[1]!=null);return <article key={event.id} style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.04)',borderLeft:`3px solid ${color}`}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'flex-start'}}><div><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}><span>{ICONS[event.category]}</span><strong style={{fontFamily:'Cinzel,serif',fontSize:'.72rem',color}}>{event.title}</strong><span style={{fontSize:'.52rem',textTransform:'uppercase',letterSpacing:'1px',color:'#555'}}>{event.category.replace('_',' ')}</span></div><p style={{fontSize:'.68rem',color:'#777',lineHeight:1.55,whiteSpace:'pre-wrap',display:'-webkit-box',WebkitLineClamp:5,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{event.body}</p></div><time style={{fontSize:'.58rem',color:'#444',whiteSpace:'nowrap'}}>{new Date(event.occurred_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>
      {highlights.length>0&&<div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'9px'}}>{highlights.map(([label,value])=><span key={label} style={{fontSize:'.58rem',padding:'3px 7px',background:`${color}11`,border:`1px solid ${color}33`,color}}>{label}: {String(value)}</span>)}</div>}
    </article>;})}</div>}
  </section>;
}

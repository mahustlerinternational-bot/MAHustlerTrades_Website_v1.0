'use client';
// src/app/events/page.tsx
import Link from 'next/link';
import { useState, useEffect } from 'react';

const EVENTS = [
  { title:'Weekly Live Trading Room — Forex & Indices', dateLabel:'June 5, 2026 · 20:00 GST', host:'MAH Team',        mode:'Virtual',   badge:'Live',      badgeColor:'#00D084', price:0,   target: new Date('2026-06-05T20:00:00+04:00') },
  { title:'Masterclass: ICT 2026 Framework Deep Dive',  dateLabel:'June 12, 2026 · 18:00 GST',host:'Senior Analyst', mode:'Virtual',   badge:'VIP',       badgeColor:'#F59E0B', price:0,   target: new Date('2026-06-12T18:00:00+04:00') },
  { title:'VIP Summit — Dubai Trading Conference 2026',  dateLabel:'June 21, 2026 · All Day',  host:'12 Speakers',   mode:'In-Person', badge:'In-Person', badgeColor:'#378ADD', price:499, target: new Date('2026-06-21T09:00:00+04:00') },
  { title:'Monthly Portfolio Review & Risk Audit',       dateLabel:'June 26, 2026 · 21:00 GST',host:'Risk Mgmt Team',mode:'Virtual',   badge:null,        badgeColor:'#D4AF37', price:0,   target: new Date('2026-06-26T21:00:00+04:00') },
];

const NAV = [['Home','/'],['Academy','/academy'],['Quant AI','/quant-ai'],['Events','/events'],['Members','/portal/dashboard']] as const;

function Countdown({ target }: { target: Date }) {
  const [t, setT] = useState<{d:number;h:number;m:number;s:number}|null>(null);
  useEffect(() => {
    function calc() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setT(null); return; }
      setT({ d: Math.floor(diff/86400000), h: Math.floor((diff%86400000)/3600000), m: Math.floor((diff%3600000)/60000), s: Math.floor((diff%60000)/1000) });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!t) return <span style={{ fontSize:'.78rem', fontWeight:600, color:'#00D084' }}>● Live Now</span>;
  const cells: [string, number][] = [['Days',t.d],['Hrs',t.h],['Min',t.m],['Sec',t.s]];
  return (
    <div style={{ display:'flex', gap:'.6rem' }}>
      {cells.map(([l,n]) => (
        <div key={l as string} style={{ background:'#111', border:'1px solid rgba(212,175,55,.25)', padding:'6px 10px', textAlign:'center', minWidth:'50px' }}>
          <span style={{ display:'block', fontFamily:'Cinzel,serif', fontSize:'1rem', fontWeight:700, color:'#D4AF37', lineHeight:1 }}>{String(n).padStart(2,'0')}</span>
          <span style={{ display:'block', fontSize:'.52rem', letterSpacing:'2px', textTransform:'uppercase', color:'#555', marginTop:'3px' }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  return (
    <div style={{ background:'#0A0A0A', color:'#fff', fontFamily:'Montserrat,sans-serif', minHeight:'100vh', paddingTop:'72px' }}>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'rgba(10,10,10,0.96)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(212,175,55,0.18)', padding:'0 5%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'72px' }}>
          <Link href="/" style={{ textDecoration:'none', fontFamily:'Cinzel,serif', fontSize:'1.1rem', fontWeight:700, background:'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'2px' }}>
            MAHustler TRADES
          </Link>
          <div style={{ display:'flex', gap:'1.5rem' }}>
            {NAV.map(([l,h]) => (
              <Link key={h} href={h} style={{ color: h==='/events'?'#D4AF37':'#B0B0B0', textDecoration:'none', fontSize:'.72rem', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:500 }}>{l}</Link>
            ))}
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <Link href="/portal" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'10px 22px', fontFamily:'Cinzel,serif', fontSize:'.7rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' }}>Join the Elite</Link>
            <Link href="/admin/dashboard" style={{ border:'1px solid rgba(255,255,255,0.1)', color:'#555', textDecoration:'none', padding:'9px 16px', fontSize:'.65rem', letterSpacing:'1.5px', textTransform:'uppercase' }}>Admin</Link>
          </div>
        </div>
      </nav>

      <div style={{ padding:'72px 5% 80px', maxWidth:'1000px' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'10px' }}>Live Events</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'clamp(1.8rem,3.5vw,2.8rem)', fontWeight:700, lineHeight:1.2, marginBottom:'10px' }}>Where Elite Traders<br/>Gather & Grow</h1>
        <div style={{ width:'48px', height:'2px', background:'linear-gradient(90deg,#B8860B,#FFD700)', margin:'16px 0 16px' }} />
        <p style={{ fontSize:'.87rem', color:'#B0B0B0', maxWidth:'580px', lineHeight:1.8, marginBottom:'3rem', fontWeight:300 }}>
          Weekly live trading sessions, exclusive webinars, and VIP in-person meetups across global financial hubs. Never miss a market-moving event.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {EVENTS.map(ev => (
            <div key={ev.title}
              style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', borderLeft:`3px solid ${ev.badgeColor}`, padding:'1.5rem 1.75rem', transition:'background .2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#111'}
            >
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'2rem', flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap:'wrap' }}>
                    <p style={{ fontSize:'.62rem', letterSpacing:'2px', textTransform:'uppercase', color:'#D4AF37' }}>{ev.dateLabel}</p>
                    {ev.badge && (
                      <span style={{ fontSize:'.58rem', letterSpacing:'1.5px', textTransform:'uppercase', border:'1px solid', padding:'2px 8px', color:ev.badgeColor, borderColor:`${ev.badgeColor}44`, background:`${ev.badgeColor}12` }}>
                        {ev.badge}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontFamily:'Cinzel,serif', fontSize:'.95rem', fontWeight:600, marginBottom:'8px', lineHeight:1.3 }}>{ev.title}</h3>
                  <div style={{ display:'flex', gap:'1.25rem', fontSize:'.7rem', color:'#555', marginBottom:'1rem', flexWrap:'wrap' }}>
                    <span>🎙 {ev.host}</span>
                    <span>{ev.mode === 'Virtual' ? '🌐' : '📍'} {ev.mode}</span>
                  </div>
                  <Countdown target={ev.target} />
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontFamily:'Cinzel,serif', fontWeight:700, color:'#D4AF37', fontSize:'1.2rem', marginBottom:'12px' }}>
                    {ev.price > 0 ? `$${ev.price}` : 'Free'}
                  </p>
                  <Link href="/portal/events"
                    style={{
                      display:'inline-block', textDecoration:'none', padding:'9px 22px',
                      fontFamily:'Cinzel,serif', fontSize:'.65rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase',
                      ...(ev.badge === 'VIP' || ev.badge === 'In-Person'
                        ? { background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none' }
                        : { background:'transparent', color:ev.badgeColor, border:`1px solid ${ev.badgeColor}55` }
                      )
                    }}>
                    {ev.badge === 'In-Person' ? 'Get Ticket →' : 'Reserve Spot'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Members note */}
        <div style={{ marginTop:'3rem', background:'rgba(212,175,55,0.04)', border:'1px solid rgba(212,175,55,0.15)', padding:'1.5rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.85rem', fontWeight:700, color:'#D4AF37', marginBottom:'4px' }}>Already a Member?</p>
            <p style={{ fontSize:'.8rem', color:'#888', fontWeight:300 }}>View your registered events and manage upcoming reservations in your portal.</p>
          </div>
          <Link href="/portal/events" style={{ flexShrink:0, background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'10px 24px', fontFamily:'Cinzel,serif', fontSize:'.7rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' }}>
            My Events →
          </Link>
        </div>
      </div>
    </div>
  );
}

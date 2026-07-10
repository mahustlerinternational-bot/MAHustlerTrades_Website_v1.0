'use client';
// src/app/academy/page.tsx
import Link from 'next/link';

const COURSES = [
  { icon:'📈', badge:'Bestseller', level:'Beginner',      market:'Forex',        hours:32, lessons:68, price:197, original:297, title:'Smart Money Concepts: The Foundation',        desc:'Master order blocks, fair value gaps, and liquidity sweeps. Understand exactly how institutional traders move markets.' },
  { icon:'⚡', badge:'Advanced',   level:'Intermediate',  market:'Options',      hours:28, lessons:54, price:267, original:397, title:'Options Flow Mastery & Dark Pool Signals',     desc:'Read the tape like a market maker. Identify unusual options activity and institutional positioning before the crowd.' },
  { icon:'₿',  badge:'New',        level:'All Levels',    market:'Crypto',       hours:40, lessons:82, price:227, original:347, title:'Crypto Market Structure & On-Chain Analytics', desc:'Combine technical structure with on-chain data intelligence. Track whale wallets, exchange inflows, and macro cycles.' },
  { icon:'🎯', badge:'Elite',      level:'Advanced',      market:'Multi-Market', hours:55, lessons:96, price:397, original:597, title:'Algorithmic Trading & Quantitative Systems',   desc:'Build, backtest, and deploy systematic trading strategies using Python and Pine Script. Turn your edge into a machine.' },
  { icon:'🏛️', badge:undefined,   level:'Intermediate',  market:'Indices',      hours:24, lessons:46, price:197, original:297, title:'Indices & Macro: Trading the Big Picture',     desc:'S&P 500, Nasdaq, DAX — understand macro drivers, correlation analysis, and index futures execution.' },
  { icon:'🧠', badge:'VIP',        level:'Expert',        market:'Mindset',      hours:18, lessons:36, price:167, original:247, title:'Trading Psychology & Peak Performance',        desc:'Eliminate emotional trading, build process discipline, and perform under pressure like a professional.' },
];

const NAV = [['Home','/'],['Academy','/academy'],['Quant AI','/quant-ai'],['Events','/events'],['Members','/portal/dashboard']] as const;

export default function AcademyPage() {
  return (
    <div style={{ background:'#0A0A0A', color:'#fff', fontFamily:'Montserrat,sans-serif', minHeight:'100vh', paddingTop:'72px' }}>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'rgba(10,10,10,0.96)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(212,175,55,0.18)', padding:'0 5%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'72px' }}>
          <Link href="/" style={{ textDecoration:'none' }}>
            <span style={{ fontFamily:'Cinzel,serif', fontSize:'1.1rem', fontWeight:700, background:'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'2px' }}>MAHustler TRADES</span>
          </Link>
          <div style={{ display:'flex', gap:'1.5rem' }}>
            {NAV.map(([l,h]) => (
              <Link key={h} href={h} style={{ color: h==='/academy'?'#D4AF37':'#B0B0B0', textDecoration:'none', fontSize:'.72rem', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:500 }}>{l}</Link>
            ))}
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <Link href="/portal" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'10px 22px', fontFamily:'Cinzel,serif', fontSize:'.7rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' }}>Join the Elite</Link>
            <Link href="/admin/dashboard" style={{ border:'1px solid rgba(255,255,255,0.1)', color:'#555', textDecoration:'none', padding:'9px 16px', fontSize:'.65rem', letterSpacing:'1.5px', textTransform:'uppercase' }}>Admin</Link>
          </div>
        </div>
      </nav>

      <div style={{ padding:'72px 5% 80px' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'10px' }}>Trading Academy</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'clamp(1.8rem,3.5vw,2.8rem)', fontWeight:700, lineHeight:1.2, marginBottom:'10px' }}>Institutional Knowledge.<br/>Elite Execution.</h1>
        <div style={{ width:'48px', height:'2px', background:'linear-gradient(90deg,#B8860B,#FFD700)', margin:'16px 0 16px' }} />
        <p style={{ fontSize:'.87rem', color:'#B0B0B0', maxWidth:'580px', lineHeight:1.8, marginBottom:'3rem', fontWeight:300 }}>Every course is crafted by active, verified professionals. Pure, battle-tested methodology — no theory-only academics. No recycled content.</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1.5rem', marginBottom:'3rem' }}>
          {COURSES.map(c => (
            <div key={c.title}
              style={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,.05)', overflow:'hidden', transition:'all .3s', cursor:'pointer' }}
              onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor='rgba(212,175,55,.3)'; d.style.transform='translateY(-4px)'; }}
              onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor='rgba(255,255,255,.05)'; d.style.transform='none'; }}
            >
              <div style={{ height:'160px', background:'linear-gradient(135deg,#0D0D0D,#1A1500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem', borderBottom:'1px solid rgba(212,175,55,.15)', position:'relative' }}>
                {c.icon}
                {c.badge && (
                  <span style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', fontFamily:'Cinzel,serif', fontSize:'.58rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'3px 10px' }}>
                    {c.badge}
                  </span>
                )}
              </div>
              <div style={{ padding:'1.5rem' }}>
                <p style={{ fontSize:'.6rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'.5rem' }}>{c.level}</p>
                <h3 style={{ fontFamily:'Cinzel,serif', fontSize:'1rem', fontWeight:600, marginBottom:'.7rem', lineHeight:1.3 }}>{c.title}</h3>
                <p style={{ fontSize:'.78rem', color:'#B0B0B0', lineHeight:1.7, marginBottom:'1.25rem', fontWeight:300 }}>{c.desc}</p>
                <div style={{ display:'flex', gap:'1.25rem', fontSize:'.7rem', color:'#555', marginBottom:'1.25rem', flexWrap:'wrap' }}>
                  <span>⏱ {c.hours}h</span>
                  <span>📹 {c.lessons} lessons</span>
                  <span>🎯 {c.market}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:'1rem' }}>
                  <div style={{ fontFamily:'Cinzel,serif', fontSize:'1.15rem', fontWeight:700, color:'#D4AF37' }}>
                    <s style={{ fontFamily:'Montserrat,sans-serif', fontSize:'.72rem', color:'#555', fontWeight:400, marginRight:'6px' }}>${c.original}</s>${c.price}
                  </div>
                  <Link href="/portal/courses" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'8px 18px', fontFamily:'Cinzel,serif', fontSize:'.68rem', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase' }}>
                    Enroll Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background:'rgba(212,175,55,0.04)', border:'1px solid rgba(212,175,55,0.15)', padding:'2rem 2.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1.5rem' }}>
          <div>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.9rem', fontWeight:700, color:'#D4AF37', marginBottom:'6px' }}>Already a Member?</p>
            <p style={{ fontSize:'.82rem', color:'#888', fontWeight:300 }}>Access your enrolled courses and continue learning from your Members Portal.</p>
          </div>
          <Link href="/portal/courses" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'12px 28px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', flexShrink:0 }}>
            Go to My Courses →
          </Link>
        </div>
      </div>
    </div>
  );
}

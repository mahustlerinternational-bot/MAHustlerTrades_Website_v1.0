'use client';
// src/app/quant-ai/page.tsx
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuantRealtime, useQuantStore, formatPrice } from '@/lib/hooks/useQuantRealtime';
import CorePillars   from '@/components/quant-ai/CorePillars';
import SignalSuite   from '@/components/quant-ai/SignalSuite';
import RiskReporting from '@/components/quant-ai/RiskReporting';

const NAV = [['Home','/'],['Academy','/academy'],['Quant AI','/quant-ai'],['Events','/events'],['Members','/portal/dashboard']] as const;

export default function QuantAIPage() {
  useQuantRealtime();
  const { activeSignal, currentRegime, isConnected } = useQuantStore();
  const router = useRouter();

  function handleEliteAccess() {
    router.push('/portal/packages?ref=quant-ai');
  }

  return (
    <div style={{ background:'#0A0A0A', color:'#fff', fontFamily:'Montserrat,sans-serif', minHeight:'100vh', paddingTop:'72px' }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}`}</style>

      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'rgba(10,10,10,0.96)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(212,175,55,0.18)', padding:'0 5%' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:'72px' }}>
          <Link href="/" style={{ textDecoration:'none', fontFamily:'Cinzel,serif', fontSize:'1.1rem', fontWeight:700, background:'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'2px' }}>MAHustler TRADES</Link>
          <div style={{ display:'flex', gap:'1.5rem' }}>
            {NAV.map(([l,h]) => (
              <Link key={h} href={h} style={{ color: h==='/quant-ai'?'#D4AF37':'#B0B0B0', textDecoration:'none', fontSize:'.72rem', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:500 }}>{l}</Link>
            ))}
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <Link href="/portal" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'10px 22px', fontFamily:'Cinzel,serif', fontSize:'.7rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' }}>Join the Elite</Link>
            <Link href="/admin/dashboard" style={{ border:'1px solid rgba(255,255,255,0.1)', color:'#555', textDecoration:'none', padding:'9px 16px', fontSize:'.65rem', letterSpacing:'1.5px', textTransform:'uppercase' }}>Admin</Link>
          </div>
        </div>
      </nav>

      <section style={{ position:'relative', padding:'72px 5% 64px', background:'#070707', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(212,175,55,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.03) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:2, maxWidth:'780px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', border:'1px solid rgba(212,175,55,.35)', padding:'5px 14px 5px 10px', marginBottom:'28px' }}>
            <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:isConnected?'#00D084':'#555', flexShrink:0, animation:isConnected?'blink 1.8s ease-in-out infinite':undefined }} />
            <span style={{ fontFamily:'Cinzel,serif', fontSize:'.65rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37' }}>MAHustler Master AI System v1.0 — {isConnected?'Live':'Connecting...'}</span>
          </div>
          <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'clamp(1.8rem,4.5vw,3.4rem)', fontWeight:900, lineHeight:1.1, marginBottom:'20px' }}>
            Institutional Intelligence.<br/>
            <span style={{ background:'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Quantized. Deployed. Live.</span>
          </h1>
          <p style={{ fontSize:'.9rem', color:'#B0B0B0', lineHeight:1.8, maxWidth:'640px', marginBottom:'36px', fontWeight:300 }}>A dual-engine trading ecosystem fusing hard-coded algorithmic execution with locally-deployed quantized AI models — delivering a precision edge that purely discretionary or purely rule-based systems cannot replicate.</p>
          <div style={{ display:'flex', gap:'40px', flexWrap:'wrap' }}>
            {[['~2ms','Execution Latency'],['100%','Emotionless Protocol'],['Dual','Verification Engines'],[isConnected?'Live':'—','Signal Feed Status']].map(([n,l]) => (
              <div key={l}>
                <span style={{ display:'block', fontFamily:'Cinzel,serif', fontSize:'1.6rem', fontWeight:700, background:'linear-gradient(135deg,#FFD700,#D4AF37)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1 }}>{n}</span>
                <span style={{ display:'block', fontSize:'.6rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'#555', marginTop:'5px' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,.35),transparent)' }} />

      {activeSignal && (
        <section style={{ background:'#0D0D0D', borderBottom:'1px solid rgba(212,175,55,.15)', padding:'24px 5%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', fontFamily:'Cinzel,serif', fontSize:'.65rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'16px', flexWrap:'wrap' }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00D084', display:'inline-block', animation:'blink 1.5s infinite' }} />
            Live Order Protocol
            <span style={{ fontSize:'.85rem', fontWeight:700, color:'#fff' }}>{activeSignal.instrument}</span>
            <span style={{ fontSize:'.6rem', padding:'2px 8px', ...(activeSignal.signal_type==='long'?{background:'rgba(0,208,132,.1)',color:'#00D084',border:'1px solid rgba(0,208,132,.2)'}:{background:'rgba(255,71,87,.1)',color:'#FF4757',border:'1px solid rgba(255,71,87,.2)'}) }}>{activeSignal.signal_type.toUpperCase()}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:0, maxWidth:'420px' }}>
            {[{lbl:'TP',val:formatPrice(activeSignal.instrument,activeSignal.tp_price),col:'#00D084',bg:'rgba(0,208,132,.06)',bl:'#00D084',meta:`R:R ${activeSignal.rr_ratio?.toFixed(2)??'—'}`},{lbl:'ENTRY',val:formatPrice(activeSignal.instrument,activeSignal.entry_price),col:'#FFD700',bg:'rgba(212,175,55,.07)',bl:'#D4AF37',meta:'TRIGGERED'},{lbl:'SL',val:formatPrice(activeSignal.instrument,activeSignal.sl_price),col:'#FF4757',bg:'rgba(255,71,87,.06)',bl:'#FF4757',meta:`${activeSignal.risk_pct?.toFixed(2)??'—'}% risk`}].map(r=>(
              <div key={r.lbl} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:r.bg, borderLeft:`3px solid ${r.bl}`, fontFamily:'JetBrains Mono,monospace', marginBottom:'2px' }}>
                <span style={{ fontSize:'.58rem', letterSpacing:'2.5px', textTransform:'uppercase', fontWeight:700, color:r.col, minWidth:'36px' }}>{r.lbl}</span>
                <span style={{ fontSize:'.9rem', fontWeight:600, color:r.col }}>{r.val}</span>
                <span style={{ fontSize:'.62rem', color:'#555' }}>{r.meta}</span>
              </div>
            ))}
          </div>
          {activeSignal.analysis_notes && <p style={{ fontSize:'.75rem', color:'#888', marginTop:'12px', fontStyle:'italic', lineHeight:1.6 }}>{activeSignal.analysis_notes}</p>}
        </section>
      )}

      {currentRegime && (
        <section style={{ background:'#111', borderBottom:'1px solid rgba(55,138,221,.15)', padding:'24px 5%' }}>
          <div style={{ maxWidth:'560px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
              <div>
                <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'3px', textTransform:'uppercase', color:'#85B7EB', marginBottom:'4px' }}>Regime Probability Output</p>
                <p style={{ fontFamily:'Cinzel,serif', fontSize:'1.2rem', fontWeight:700 }}>{currentRegime.active_regime}</p>
              </div>
              <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 10px', background:'rgba(55,138,221,.12)', color:'#85B7EB', border:'1px solid rgba(55,138,221,.3)' }}>LIVE</span>
            </div>
            {[{label:'Accumulation',pct:currentRegime.accumulation_pct,color:'#378ADD'},{label:'Trending',pct:currentRegime.trending_pct,color:'#00D084'},{label:'Distribution',pct:currentRegime.distribution_pct,color:'#FF4757'},{label:'Ranging',pct:currentRegime.ranging_pct,color:'#D4AF37'}].map(({label,pct,color})=>(
              <div key={label} style={{ marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.7rem', marginBottom:'5px', color:'#888' }}>
                  <span>{label}</span><span style={{ fontFamily:'JetBrains Mono,monospace', color }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height:'5px', background:'#1E1E1E', borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:'2px', width:`${pct}%`, background:color, transition:'width .7s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,.35),transparent)' }} />
      <div style={{ padding:'56px 5% 0', background:'#111' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'10px' }}>Core Architecture</p>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:700, lineHeight:1.2 }}>The Two Pillars</h2>
        <div style={{ width:'48px', height:'2px', background:'linear-gradient(90deg,#B8860B,#FFD700)', margin:'16px 0 32px' }} />
      </div>

      <CorePillars />
      <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,.35),transparent)' }} />
      <SignalSuite />
      <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,.35),transparent)' }} />
      <RiskReporting />
      <div style={{ height:'1px', background:'linear-gradient(90deg,transparent,rgba(212,175,55,.35),transparent)' }} />

      <section style={{ padding:'88px 5%', textAlign:'center', background:'#070707' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.65rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'16px' }}>Ready to Deploy</p>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'clamp(1.8rem,3.5vw,2.8rem)', fontWeight:900, lineHeight:1.15, marginBottom:'16px' }}>Access the Full<br/><span style={{ background:'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AI Trading Ecosystem</span></h2>
        <p style={{ fontSize:'.87rem', color:'#B0B0B0', maxWidth:'520px', margin:'0 auto 36px', lineHeight:1.8, fontWeight:300 }}>Elite membership unlocks live signal delivery, real-time caution zone alerts, full trade reporting, and direct access to the MAHustler Master AI System.</p>
        <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={handleEliteAccess} style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', color:'#000', border:'none', padding:'16px 40px', fontFamily:'Cinzel,serif', fontSize:'.78rem', fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase', cursor:'pointer' }}>Activate Elite Access</button>
          <Link href="/academy" style={{ background:'transparent', color:'#D4AF37', textDecoration:'none', border:'1px solid rgba(212,175,55,.35)', padding:'15px 40px', fontFamily:'Cinzel,serif', fontSize:'.78rem', fontWeight:600, letterSpacing:'2.5px', textTransform:'uppercase' }}>Explore the Academy</Link>
        </div>
      </section>
    </div>
  );
}

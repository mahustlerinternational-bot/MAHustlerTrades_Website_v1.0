'use client';
// src/components/quant-ai/CorePillars.tsx
import { useEffect, useRef, useState } from 'react';

const ALGO_SPECS = [
  { label: 'API-Direct Execution',       text: 'Entry, TP, and SL orders submitted programmatically — no manual relay, no slippage from hesitation.' },
  { label: 'Mathematical Rigor',          text: 'Every execution parameter is derived from fixed quantitative rules. No discretion, no deviation under pressure.' },
  { label: 'Error Elimination',           text: 'Removes the human execution loop entirely for defined setups — the system triggers, validates, and fires autonomously.' },
] as const;
const AUG_SPECS = [
  { label: 'Quantized Model Deployment',  text: 'AI models run locally for low-latency inference — no cloud round-trip, no data exposure, no rate limits.' },
  { label: 'Macro Zone Isolation',         text: 'Identifies high-confluence structural zones across timeframes, filtering noise from institutionally significant price regions.' },
  { label: 'Regime Classification',        text: 'Real-time market regime detection — trending, ranging, distribution, or accumulation — adapts signal logic dynamically.' },
] as const;
const INSTRUMENTS = [
  { sym: 'XAUUSD', base: 3241.5, d: 2 }, { sym: 'EURUSD', base: 1.0847, d: 4 },
  { sym: 'NQ', base: 22318, d: 0 },      { sym: 'BTCUSD', base: 98420, d: 0 },
];
const BASE_REGIMES = [
  { label: 'Accumulation', pct: 18, color: 'rgba(55,138,221,0.6)' },
  { label: 'Trending',     pct: 72, color: 'rgba(0,208,132,0.7)'  },
  { label: 'Distribution', pct: 6,  color: 'rgba(255,71,87,0.5)'  },
  { label: 'Ranging',      pct: 14, color: 'rgba(212,175,55,0.5)' },
];

function fmt(n: number, d: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function CorePillars() {
  const instrIdx = useRef(0);
  const [exec, setExec] = useState(() => {
    const { sym, base, d } = INSTRUMENTS[0];
    return { sym, tp: fmt(base*1.0085,d), entry: fmt(base,d), sl: fmt(base*0.9955,d), risk: ((base-base*0.9955)/base*100).toFixed(2) };
  });
  const [regimes, setRegimes] = useState(BASE_REGIMES);

  useEffect(() => {
    const id = setInterval(() => {
      instrIdx.current = (instrIdx.current + 1) % INSTRUMENTS.length;
      const { sym, base, d } = INSTRUMENTS[instrIdx.current];
      setExec({ sym, tp: fmt(base*1.0085,d), entry: fmt(base,d), sl: fmt(base*0.9955,d), risk: ((base-base*0.9955)/base*100).toFixed(2) });
    }, 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setRegimes(r => r.map(x => ({ ...x, pct: Math.max(4, Math.min(95, x.pct + (Math.random()-.5)*6)) })));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const maxP = Math.max(...regimes.map(r => r.pct));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5px', background:'rgba(212,175,55,0.18)' }}>
      {/* Algo Pillar */}
      <div style={{ background:'#111', padding:'40px 36px', borderTop:'3px solid #D4AF37', position:'relative' }}>
        <div style={{ fontSize:'.58rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', fontFamily:'Cinzel,serif', marginBottom:'20px', border:'1px solid rgba(212,175,55,0.3)', display:'inline-block', padding:'4px 12px' }}>Pillar A</div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.35rem', fontWeight:700, marginBottom:'6px' }}>Algorithmic Trading</h2>
        <p style={{ fontSize:'.72rem', letterSpacing:'2px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'18px' }}>The Execution Engine</p>
        <p style={{ fontSize:'.82rem', color:'#B0B0B0', lineHeight:1.75, marginBottom:'28px', fontWeight:300 }}>Hard-coded execution protocols handling live entry, take-profit, and stop-loss via API. Operates with strict mathematical rigor — eliminating emotional trading errors.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
          {ALGO_SPECS.map(s => (
            <div key={s.label} style={{ display:'flex', gap:'10px', padding:'10px 14px', background:'rgba(255,255,255,0.025)', borderLeft:'2px solid rgba(212,175,55,0.5)' }}>
              <div><p style={{ fontSize:'.68rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'#FFD700', marginBottom:'3px', fontWeight:600 }}>{s.label}</p><p style={{ fontSize:'.76rem', color:'#B0B0B0', lineHeight:1.55 }}>{s.text}</p></div>
            </div>
          ))}
        </div>
        {/* Live Exec */}
        <div style={{ background:'#181818', border:'1px solid rgba(212,175,55,0.18)', padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
            <span style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37' }}>Live Order Protocol · {exec.sym}</span>
            <span style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'.62rem', letterSpacing:'2px', textTransform:'uppercase', color:'#00D084' }}><span style={{ width:6,height:6,borderRadius:'50%',background:'#00D084',display:'inline-block' }} />Executing</span>
          </div>
          {[{lbl:'TP',val:exec.tp,col:'#00D084',bg:'rgba(0,208,132,0.06)',bl:'#00D084',meta:`R:R 1.8`},{lbl:'ENTRY',val:exec.entry,col:'#FFD700',bg:'rgba(212,175,55,0.07)',bl:'#D4AF37',meta:'TRIGGERED'},{lbl:'SL',val:exec.sl,col:'#FF4757',bg:'rgba(255,71,87,0.06)',bl:'#FF4757',meta:`${exec.risk}% risk`}].map(r=>(
            <div key={r.lbl} style={{ display:'flex',justifyContent:'space-between',padding:'10px 14px',background:r.bg,borderLeft:`3px solid ${r.bl}`,fontFamily:'JetBrains Mono,monospace' }}>
              <span style={{ fontSize:'.58rem',letterSpacing:'2.5px',textTransform:'uppercase',fontWeight:700,color:r.col }}>{r.lbl}</span>
              <span style={{ fontSize:'.9rem',fontWeight:600,color:r.col }}>{r.val}</span>
              <span style={{ fontSize:'.62rem',color:'#555' }}>{r.meta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Augmented Pillar */}
      <div style={{ background:'#111', padding:'40px 36px', borderTop:'3px solid #378ADD', position:'relative' }}>
        <div style={{ fontSize:'.58rem', letterSpacing:'3px', textTransform:'uppercase', color:'#85B7EB', fontFamily:'Cinzel,serif', marginBottom:'20px', border:'1px solid rgba(55,138,221,0.3)', display:'inline-block', padding:'4px 12px' }}>Pillar B</div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.35rem', fontWeight:700, marginBottom:'6px' }}>Augmented Trading</h2>
        <p style={{ fontSize:'.72rem', letterSpacing:'2px', textTransform:'uppercase', color:'#85B7EB', marginBottom:'18px' }}>The Intelligence Multiplier</p>
        <p style={{ fontSize:'.82rem', color:'#B0B0B0', lineHeight:1.75, marginBottom:'28px', fontWeight:300 }}>Locally-deployed quantized AI models parse massive market data streams — isolating structural macro zones, classifying market regimes, and surfacing predictive analytics.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px' }}>
          {AUG_SPECS.map(s => (
            <div key={s.label} style={{ display:'flex', gap:'10px', padding:'10px 14px', background:'rgba(255,255,255,0.025)', borderLeft:'2px solid rgba(55,138,221,0.5)' }}>
              <div><p style={{ fontSize:'.68rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'#B5D4F4', marginBottom:'3px', fontWeight:600 }}>{s.label}</p><p style={{ fontSize:'.76rem', color:'#B0B0B0', lineHeight:1.55 }}>{s.text}</p></div>
            </div>
          ))}
        </div>
        {/* Regime Bars */}
        <div style={{ background:'#181818', border:'1px solid rgba(55,138,221,0.25)', padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px' }}>
            <span style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'3px', textTransform:'uppercase', color:'#85B7EB' }}>Regime Probability Output</span>
            <span style={{ fontSize:'.58rem', letterSpacing:'2px', padding:'3px 10px', background:'rgba(55,138,221,0.12)', color:'#85B7EB', border:'1px solid rgba(55,138,221,0.3)' }}>TRENDING ↑</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:'4px', height:'72px', paddingBottom:'4px' }}>
            {regimes.map(r => (
              <div key={r.label} style={{ flex:1, height:`${Math.round(r.pct/maxP*100)}%`, background:r.color, borderRadius:'1px 1px 0 0', transition:'height .7s ease' }} />
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.58rem', color:'#555', marginTop:'6px', fontFamily:'JetBrains Mono,monospace' }}>
            {regimes.map(r => <span key={r.label}>{r.label}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

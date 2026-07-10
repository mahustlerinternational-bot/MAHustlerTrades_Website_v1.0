'use client';
// src/components/quant-ai/SignalSuite.tsx
export default function SignalSuite() {
  const engines = [
    { num:'01', name:'Technical Analysis Engine', tags:['Chart Geometry','Order Flow','Liquidity Pools','OB Detection','HTF Structure','FVG Mapping'] },
    { num:'02', name:'Fundamental Analysis Engine', tags:['NLP Sentiment','Macro Scanning','Event Impact','News Flow','COT Data','Rate Decisions'] },
  ];
  const pipeline = [
    { icon:'🛰', name:'Data Ingestion',   desc:'Multi-feed market data',         color:'#555'    },
    { icon:'🧠', name:'AI Processing',    desc:'Quantized model inference',       color:'#85B7EB' },
    { icon:'⚡', name:'Algo Execution',   desc:'API-direct order placement',      color:'#D4AF37', active:true },
    { icon:'📡', name:'Signal Broadcast', desc:'Telegram intelligence delivery',  color:'#00D084' },
    { icon:'🛡', name:'Risk Monitor',     desc:'Caution zone surveillance',       color:'#F59E0B' },
    { icon:'📋', name:'Reporting',        desc:'Automated performance audit',     color:'#555'    },
  ];
  return (
    <div style={{ background:'#111', padding:'72px 5%' }}>
      <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'10px' }}>Ecosystem Infrastructure</p>
      <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:700, marginBottom:'10px' }}>Advanced Telegram Intelligence Suite</h2>
      <div style={{ width:'48px', height:'2px', background:'linear-gradient(90deg,#B8860B,#FFD700)', margin:'16px 0 20px' }} />
      <p style={{ fontSize:'.85rem', color:'#B0B0B0', lineHeight:1.8, maxWidth:'580px', fontWeight:300, marginBottom:'3rem' }}>
        Instant, high-probability trade setup alerts broadcasted directly to the premium Telegram channel. Every signal is cross-verified by two independent analytical pipelines before transmission.
      </p>
      {/* Dual Engines */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5px', background:'rgba(212,175,55,0.18)', marginBottom:'2rem' }}>
        {engines.map(e => (
          <div key={e.num} style={{ background:'#1E1E1E', padding:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
              <span style={{ fontSize:'.6rem', letterSpacing:'3px', textTransform:'uppercase', color:'#555' }}>Engine {e.num}</span>
              <span style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#00D084' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#00D084', display:'inline-block' }} />Online
              </span>
            </div>
            <h4 style={{ fontFamily:'Cinzel,serif', fontSize:'.95rem', fontWeight:700, marginBottom:'16px' }}>{e.name}</h4>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
              {e.tags.map(t => <span key={t} style={{ fontSize:'.6rem', letterSpacing:'1px', textTransform:'uppercase', padding:'3px 9px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'#B0B0B0' }}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
      {/* Pipeline */}
      <div style={{ background:'#181818', border:'1px solid rgba(212,175,55,0.15)', padding:'24px 28px' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'20px' }}>Full Signal Pipeline</p>
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'0', overflowX:'auto' }}>
          {pipeline.map((n, i) => (
            <div key={n.name} style={{ display:'flex', alignItems:'center' }}>
              <div style={{ background: n.active ? `${n.color}0F` : '#1E1E1E', border: `1px solid ${n.active ? n.color : 'rgba(212,175,55,0.12)'}`, padding:'12px 16px', textAlign:'center', minWidth:'110px', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                <span style={{ fontSize:'1.2rem' }}>{n.icon}</span>
                <span style={{ fontSize:'.65rem', fontWeight:600, color:n.color }}>{n.name}</span>
                <span style={{ fontSize:'.58rem', color:'#555' }}>{n.desc}</span>
              </div>
              {i < pipeline.length - 1 && <span style={{ fontSize:'.9rem', color:'rgba(212,175,55,0.3)', padding:'0 6px', flexShrink:0 }}>→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

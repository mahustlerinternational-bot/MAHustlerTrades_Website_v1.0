'use client';
// src/components/quant-ai/RiskReporting.tsx
export default function RiskReporting() {
  const metrics = [
    { val:'Auto', lbl:'Trade Logging'      },
    { val:'Live', lbl:'Performance Metrics'},
    { val:'Full', lbl:'Execution Audit'    },
    { val:'100%', lbl:'Transparency'       },
  ];
  const features = [
    { title:'Comprehensive Trade Logs',      desc:'Every executed order is logged with full metadata — instrument, direction, size, execution timestamp, slippage delta, and outcome.' },
    { title:'Performance Metrics Dashboard', desc:'Win rate, average R:R, max drawdown, expectancy, and Sharpe ratio delivered on a rolling basis — no manual calculation required.' },
    { title:'Strategic Retrospectives',      desc:'Automated post-session analysis identifying recurring edge patterns, regime-specific performance, and execution quality scores.' },
  ];
  return (
    <div style={{ background:'#0A0A0A', padding:'72px 5%', borderTop:'1px solid rgba(212,175,55,0.18)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4rem' }}>
        {/* Caution Zone */}
        <div>
          <p style={{ fontSize:'.6rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'5px' }}>Risk Mitigation</p>
          <h3 style={{ fontFamily:'Cinzel,serif', fontSize:'1.25rem', fontWeight:700, marginBottom:'18px' }}>Dynamic Caution Zone Alerts</h3>
          <p style={{ fontSize:'.82rem', color:'#B0B0B0', lineHeight:1.75, fontWeight:300, marginBottom:'24px' }}>An intelligent exposure management system that monitors live price proximity to critical invalidation zones — enabling dynamic position adjustment before a level is breached.</p>
          <blockquote style={{ border:'1px solid rgba(245,158,11,0.4)', background:'rgba(245,158,11,0.04)', padding:'20px 22px', borderLeft:'3px solid #F59E0B', marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <span style={{ fontSize:'16px', color:'#F59E0B' }}>⚠</span>
              <span style={{ fontFamily:'Cinzel,serif', fontSize:'.6rem', letterSpacing:'3px', textTransform:'uppercase', color:'#F59E0B', fontWeight:700 }}>Dynamic Caution Zone Protocol</span>
            </div>
            <p style={{ fontSize:'.8rem', color:'#B0B0B0', lineHeight:1.7, fontStyle:'italic' }}>
              Instead of generic stop-loss alerts, the AI monitors <strong style={{ color:'#F59E0B', fontStyle:'normal' }}>price proximity to critical invalidation zones</strong> and broadcasts live risk updates — enabling members to dynamically adjust exposure <strong style={{ color:'#F59E0B', fontStyle:'normal' }}>before</strong> the level is reached.
            </p>
          </blockquote>
          <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
            {[
              'AI tracks real-time distance to invalidation zone',
              'Proximity threshold breach triggers Caution Alert',
              'Alert broadcasted to Telegram with adjustment guidance',
              'Member adjusts size or tightens SL before confirmation',
            ].map((text, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontFamily:'Cinzel,serif', fontSize:'.65rem', fontWeight:700, color:'#D4AF37', minWidth:'24px' }}>0{i+1}</span>
                <span style={{ fontSize:'.8rem', color:'#B0B0B0' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Reporting */}
        <div>
          <p style={{ fontSize:'.6rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'5px' }}>Automated Reporting</p>
          <h3 style={{ fontFamily:'Cinzel,serif', fontSize:'1.25rem', fontWeight:700, marginBottom:'18px' }}>Institutional Trades Reporting</h3>
          <p style={{ fontSize:'.82rem', color:'#B0B0B0', lineHeight:1.75, fontWeight:300, marginBottom:'24px' }}>End-to-end transparent reporting framework delivering comprehensive trade performance metrics, execution logs, and strategic retrospectives automatically.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1.5px', background:'rgba(212,175,55,0.15)', marginBottom:'24px' }}>
            {metrics.map(m => (
              <div key={m.lbl} style={{ background:'#1E1E1E', padding:'16px 12px', textAlign:'center' }}>
                <p style={{ fontFamily:'Cinzel,serif', fontSize:'1.15rem', fontWeight:700, background:'linear-gradient(135deg,#FFD700,#D4AF37)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{m.val}</p>
                <p style={{ fontSize:'.58rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'#555', marginTop:'5px' }}>{m.lbl}</p>
              </div>
            ))}
          </div>
          {features.map(f => (
            <div key={f.title} style={{ display:'flex', alignItems:'flex-start', gap:'14px', padding:'16px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize:'18px', color:'#00D084', marginTop:'1px', flexShrink:0 }}>✓</span>
              <div>
                <p style={{ fontSize:'.85rem', fontWeight:600, marginBottom:'5px' }}>{f.title}</p>
                <p style={{ fontSize:'.76rem', color:'#B0B0B0', lineHeight:1.6, fontWeight:300 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

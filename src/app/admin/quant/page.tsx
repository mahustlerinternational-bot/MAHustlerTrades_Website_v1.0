'use client';
// src/app/admin/quant/page.tsx
import { useState, useEffect } from 'react';
import { useForm }             from 'react-hook-form';
import { zodResolver }         from '@hookform/resolvers/zod';
import { z }                   from 'zod';
import { toast }               from 'sonner';
import { useQuantRealtime, useQuantStore, formatPrice } from '@/lib/hooks/useQuantRealtime';
import type { QuantSignal }    from '@/types';
import { authFetch }           from '@/lib/utils/authFetch';
import {
  formatSignalEntryZone,
  formatSignalPrice,
  signalDisplayLevels,
} from '@/lib/quant/signalLevels';

const signalSchema = z.object({
  instrument:     z.string().min(2),
  signal_type:    z.enum(['long','short']),
  entry_price:    z.coerce.number().positive(),
  tp_price:       z.coerce.number().positive(),
  sl_price:       z.coerce.number().positive(),
  analysis_notes: z.string().optional(),
});
const regimeSchema = z.object({
  accumulation_pct:  z.coerce.number().min(0).max(100),
  trending_pct:      z.coerce.number().min(0).max(100),
  distribution_pct:  z.coerce.number().min(0).max(100),
  ranging_pct:       z.coerce.number().min(0).max(100),
});
type SigForm = z.infer<typeof signalSchema>;
type RegForm = z.infer<typeof regimeSchema>;

const INSTRUMENTS = ['XAUUSD','EURUSD','GBPUSD','USDJPY','BTCUSD','ETHUSD','NQ','SPX','OIL','AAPL'];

export default function AdminQuantPage() {
  useQuantRealtime();
  const { activeSignal, currentRegime, isConnected } = useQuantStore();
  const [history,    setHistory]    = useState<QuantSignal[]>([]);
  const [loadingH,   setLoadingH]   = useState(true);
  const [savingSig,  setSavingSig]  = useState(false);
  const [savingReg,  setSavingReg]  = useState(false);

  const sigForm = useForm<SigForm>({ resolver: zodResolver(signalSchema), defaultValues: { signal_type:'long', instrument:'XAUUSD' } });
  const regForm = useForm<RegForm>({ resolver: zodResolver(regimeSchema), defaultValues: {
    accumulation_pct: currentRegime?.accumulation_pct ?? 18,
    trending_pct:     currentRegime?.trending_pct     ?? 72,
    distribution_pct: currentRegime?.distribution_pct ?? 6,
    ranging_pct:      currentRegime?.ranging_pct      ?? 14,
  }});

  const regValues = regForm.watch();
  const total     = Object.values(regValues).reduce((a, b) => Number(a) + Number(b), 0);

  useEffect(() => {
    authFetch('/api/admin/quant/signals?status=all&limit=20')
      .then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([])).finally(() => setLoadingH(false));
  }, []);

  async function refreshHistory() {
    const d = await authFetch('/api/admin/quant/signals?status=all&limit=20').then(r => r.json()).catch(() => []);
    setHistory(Array.isArray(d) ? d : []);
  }

  async function onPushSignal(v: SigForm) {
    setSavingSig(true);
    try {
      const res = await authFetch('/api/admin/quant/signals', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(v) });
      if (!res.ok) { const e = await res.json(); toast.error(e.error); return; }
      toast.success('Signal pushed — broadcasting to all members via Realtime');
      sigForm.reset({ signal_type:'long', instrument:'XAUUSD' });
      refreshHistory();
    } finally { setSavingSig(false); }
  }

  async function onPushRegime(v: RegForm) {
    if (Math.abs(total - 100) > 5) { toast.error('Percentages must sum to ~100'); return; }
    setSavingReg(true);
    try {
      const res = await authFetch('/api/admin/quant/regime', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(v) });
      if (!res.ok) { const e = await res.json(); toast.error(e.error); return; }
      toast.success('Regime updated — broadcasting live');
    } finally { setSavingReg(false); }
  }

  async function closeSignal(id: string,status:'closed_tp'|'closed_sl'|'cancelled') {
    const res = await authFetch(`/api/admin/quant/signals/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
    const data=await res.json().catch(()=>null);
    if (res.ok) { toast.success(status==='closed_tp'?'Signal closed at Take Profit':status==='closed_sl'?'Signal closed at Stop Loss':'Signal cancelled'); refreshHistory(); }
    else toast.error(data?.error??'Unable to close signal');
  }

  const iS: React.CSSProperties = { width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.75rem', padding:'9px 12px', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color .3s' };

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sig-row:hover{background:rgba(255,255,255,.02)!important}
        input[type=range]{accent-color:#D4AF37}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <div>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Intelligence Layer</p>
          <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Quant AI Management</h1>
          <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>Push live signals and regime updates to all subscribed members</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', border:`1px solid ${isConnected ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.07)'}`, background: isConnected ? 'rgba(52,211,153,.06)' : 'transparent', animation:'fadeUp .5s .05s ease forwards', opacity:0 }}>
          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: isConnected ? '#34D399' : '#555', animation: isConnected ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize:'.62rem', letterSpacing:'2px', textTransform:'uppercase', color: isConnected ? '#34D399' : '#555' }}>
            {isConnected ? 'Realtime Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Live previews */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'2rem', animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        {/* Active Signal Preview */}
        <div style={{ background:'#111', border:'1px solid rgba(212,175,55,.2)', padding:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1rem' }}>
            <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.65rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37' }}>Live Order Protocol</p>
          </div>
          {activeSignal ? (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px', flexWrap:'wrap' }}>
                <span style={{ fontFamily:'Cinzel,serif', fontSize:'1.1rem', fontWeight:700 }}>{activeSignal.instrument}</span>
                <span style={{ fontSize:'.6rem', letterSpacing:'1.5px', textTransform:'uppercase', padding:'2px 8px', ...(activeSignal.signal_type==='long' ? {background:'rgba(52,211,153,.1)',color:'#34D399',border:'1px solid rgba(52,211,153,.25)'} : {background:'rgba(255,71,87,.1)',color:'#FF4757',border:'1px solid rgba(255,71,87,.25)'})}}>
                  {activeSignal.signal_type.toUpperCase()}
                </span>
              </div>
              {[
                { lbl:'TP',    val:formatPrice(activeSignal.instrument,activeSignal.tp_price),    col:'#34D399', bg:'rgba(52,211,153,.06)',  bl:'#34D399', meta:`R:R ${activeSignal.rr_ratio?.toFixed(2)??'—'}` },
                { lbl:'ENTRY', val:formatPrice(activeSignal.instrument,activeSignal.entry_price), col:'#FFD700', bg:'rgba(212,175,55,.08)',  bl:'#D4AF37', meta:'TRIGGERED' },
                { lbl:'SL',    val:formatPrice(activeSignal.instrument,activeSignal.sl_price),    col:'#FF4757', bg:'rgba(255,71,87,.06)',   bl:'#FF4757', meta:`${activeSignal.risk_pct?.toFixed(2)??'—'}% risk` },
              ].map(r => (
                <div key={r.lbl} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', background:r.bg, borderLeft:`3px solid ${r.bl}`, fontFamily:'JetBrains Mono,monospace', marginBottom:'2px' }}>
                  <span style={{ fontSize:'.58rem', letterSpacing:'2px', textTransform:'uppercase', fontWeight:700, color:r.col, minWidth:'36px' }}>{r.lbl}</span>
                  <span style={{ fontSize:'.88rem', fontWeight:600, color:r.col }}>{r.val}</span>
                  <span style={{ fontSize:'.6rem', color:'#555' }}>{r.meta}</span>
                </div>
              ))}
              {activeSignal.analysis_notes && <p style={{ fontSize:'.7rem', color:'#888', marginTop:'10px', fontStyle:'italic', lineHeight:1.6 }}>{activeSignal.analysis_notes}</p>}
            </div>
          ) : (
            <div style={{ padding:'2rem', textAlign:'center' }}>
              <p style={{ fontSize:'1.5rem', marginBottom:'8px' }}>📡</p>
              <p style={{ fontSize:'.75rem', color:'#555' }}>No active signal. Push one below →</p>
            </div>
          )}
        </div>

        {/* Regime Preview */}
        <div style={{ background:'#111', border:'1px solid rgba(55,138,221,.2)', padding:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#60A5FA,#2563EB)' }} />
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.65rem', letterSpacing:'3px', textTransform:'uppercase', color:'#85B7EB' }}>Regime Probability</p>
            </div>
            {currentRegime && <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 10px', background:'rgba(55,138,221,.12)', color:'#85B7EB', border:'1px solid rgba(55,138,221,.3)' }}>{currentRegime.active_regime}</span>}
          </div>
          {currentRegime ? (
            <div>
              {[
                { label:'Accumulation', pct:currentRegime.accumulation_pct, color:'#378ADD' },
                { label:'Trending',     pct:currentRegime.trending_pct,     color:'#34D399' },
                { label:'Distribution', pct:currentRegime.distribution_pct, color:'#FF4757' },
                { label:'Ranging',      pct:currentRegime.ranging_pct,      color:'#D4AF37' },
              ].map(({ label, pct, color }) => (
                <div key={label} style={{ marginBottom:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.68rem', marginBottom:'4px' }}>
                    <span style={{ color:'#888' }}>{label}</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', color }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height:'4px', background:'#1E1E1E', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'2px', transition:'width .7s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:'2rem', textAlign:'center' }}>
              <p style={{ fontSize:'1.5rem', marginBottom:'8px' }}>📊</p>
              <p style={{ fontSize:'.75rem', color:'#555' }}>No regime data. Push update below →</p>
            </div>
          )}
        </div>
      </div>

      {/* Forms */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'2rem', animation:'fadeUp .5s .18s ease forwards', opacity:0 }}>
        {/* Push Signal */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1.25rem' }}>
            <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Push New Signal</p>
          </div>
          <form onSubmit={sigForm.handleSubmit(onPushSignal)} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div>
                <label style={lblSt}>Instrument</label>
                <select {...sigForm.register('instrument')} style={{ ...iS, cursor:'pointer' }}>
                  {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={lblSt}>Direction</label>
                <select {...sigForm.register('signal_type')} style={{ ...iS, cursor:'pointer' }}>
                  <option value="long">Long ▲</option>
                  <option value="short">Short ▼</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
              {(['entry_price','tp_price','sl_price'] as const).map((f, i) => (
                <div key={f}>
                  <label style={lblSt}>{['Entry','TP','SL'][i]}</label>
                  <input {...sigForm.register(f)} type="number" step="0.00001" placeholder="0.00" style={iS}
                    onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                    onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                  {sigForm.formState.errors[f] && <p style={errSt}>{sigForm.formState.errors[f]?.message}</p>}
                </div>
              ))}
            </div>
            <div>
              <label style={lblSt}>Analysis Notes (optional)</label>
              <textarea {...sigForm.register('analysis_notes')} rows={2} placeholder="HTF bias, key zone description..." style={{ ...iS, resize:'none' }}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <button type="submit" disabled={savingSig}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'11px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', opacity:savingSig?.6:1, transition:'opacity .2s' }}>
              {savingSig ? '⏳ Broadcasting...' : '⚡ Push Signal Live'}
            </button>
          </form>
        </div>

        {/* Push Regime */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#60A5FA,#2563EB)' }} />
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Update Regime Output</p>
            </div>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.68rem', color: Math.abs(total-100) < 1 ? '#34D399' : '#F59E0B' }}>
              Total: {Number(total).toFixed(0)}%
            </span>
          </div>
          <form onSubmit={regForm.handleSubmit(onPushRegime)} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {[
              { label:'Accumulation %', field:'accumulation_pct' as const, color:'#378ADD' },
              { label:'Trending %',     field:'trending_pct'     as const, color:'#34D399' },
              { label:'Distribution %', field:'distribution_pct' as const, color:'#FF4757' },
              { label:'Ranging %',      field:'ranging_pct'      as const, color:'#D4AF37' },
            ].map(({ label, field, color }) => {
              const val = Number(regForm.watch(field)) || 0;
              return (
                <div key={field}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <label style={{ fontSize:'.62rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666' }}>{label}</label>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.7rem', color }}>{val}%</span>
                  </div>
                  <input {...regForm.register(field)} type="range" min="0" max="100" step="1"
                    style={{ width:'100%', accentColor:color, cursor:'pointer' }} />
                </div>
              );
            })}
            <button type="submit" disabled={savingReg || Math.abs(total-100) > 5}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', background:'rgba(55,138,221,.12)', border:'1px solid rgba(55,138,221,.3)', color:'#85B7EB', padding:'11px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', opacity:(savingReg||Math.abs(total-100)>5)?.4:1, transition:'opacity .2s' }}>
              {savingReg ? '⏳ Updating...' : '📊 Push Regime Update'}
            </button>
          </form>
        </div>
      </div>

      {/* Signal History Table */}
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .26s ease forwards', opacity:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
          <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#888,#444)' }} />
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Signal History</p>
        </div>
        {loadingH && (
          <div style={{ padding:'3rem', display:'flex', justifyContent:'center' }}>
            <div style={{ width:'18px', height:'18px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
          </div>
        )}
        {!loadingH && history.length === 0 && (
          <div style={{ padding:'3rem', textAlign:'center' }}>
            <p style={{ fontSize:'.78rem', color:'#555' }}>No signals yet. Push one above to get started.</p>
          </div>
        )}
        {!loadingH && history.length > 0 && (
          <div style={{overflowX:'auto'}}>
            <div style={{ display:'grid', gridTemplateColumns:'100px 65px 145px 85px 85px 85px 85px 60px 105px 170px', gap:'.75rem', padding:'.6rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.04)', minWidth:'1120px' }}>
              {['Instrument','Signal','Entry Zone','TP1','TP2','TP3','SL','R:R','Status','Outcome'].map(h => (
                <p key={h} style={{ fontSize:'.55rem', letterSpacing:'2px', textTransform:'uppercase', color:'#444' }}>{h}</p>
              ))}
            </div>
            {history.map(sig => {
              const sc = sig.status==='active' ? '#34D399' : sig.status==='closed_tp' ? '#D4AF37' : sig.status==='closed_sl' ? '#FF4757' : '#555';
              const levels = signalDisplayLevels(sig);
              return (
                <div key={sig.id} className="sig-row"
                  style={{ display:'grid', gridTemplateColumns:'100px 65px 145px 85px 85px 85px 85px 60px 105px 170px', gap:'.75rem', padding:'.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.03)', alignItems:'center', transition:'background .15s', minWidth:'1120px' }}>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.75rem', fontWeight:600 }}>{sig.instrument}</p>
                  <span style={{ fontSize:'.6rem', letterSpacing:'1px', textTransform:'uppercase', fontWeight:700, color: sig.signal_type==='long' ? '#34D399' : '#FF4757' }}>
                    {sig.signal_type==='long' ? 'BUY' : 'SELL'}
                  </span>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#D4AF37' }}>{formatSignalEntryZone(sig.instrument,levels.entryZone)}</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#34D399' }}>{formatSignalPrice(sig.instrument,levels.takeProfits[0])}</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#20C997' }}>{formatSignalPrice(sig.instrument,levels.takeProfits[1])}</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#38BDF8' }}>{formatSignalPrice(sig.instrument,levels.takeProfits[2])}</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#FF4757' }}>{formatSignalPrice(sig.instrument,levels.stopLoss)}</p>
                  <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#888' }}>{sig.rr_ratio?.toFixed(2) ?? '—'}</p>
                  <span style={{ fontSize:'.6rem', letterSpacing:'1px', textTransform:'uppercase', padding:'2px 7px', border:`1px solid ${sc}44`, color:sc, background:`${sc}11` }}>
                    {sig.status.replaceAll('_',' ')}
                  </span>
                  {sig.status === 'active' ? <div style={{display:'flex',gap:'4px'}}>
                    <button onClick={() => closeSignal(sig.id,'closed_tp')} style={{...outcomeBtn,color:'#34D399',borderColor:'rgba(52,211,153,.3)'}}>TP ✓</button>
                    <button onClick={() => closeSignal(sig.id,'closed_sl')} style={{...outcomeBtn,color:'#FF4757',borderColor:'rgba(255,71,87,.3)'}}>SL</button>
                    <button onClick={() => closeSignal(sig.id,'cancelled')} style={outcomeBtn}>Cancel</button>
                  </div>:<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.68rem',color:(sig.result_r??0)>0?'#34D399':(sig.result_r??0)<0?'#FF4757':'#666'}}>{sig.result_r==null?'—':`${sig.result_r>0?'+':''}${Number(sig.result_r).toFixed(2)}R`}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const lblSt: React.CSSProperties = { display:'block', fontSize:'.58rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666', marginBottom:'5px' };
const errSt: React.CSSProperties = { fontSize:'.62rem', color:'#FF4757', marginTop:'3px' };
const outcomeBtn:React.CSSProperties={background:'none',border:'1px solid rgba(255,255,255,.14)',color:'#777',padding:'4px 7px',fontSize:'.56rem',cursor:'pointer',fontFamily:'inherit'};

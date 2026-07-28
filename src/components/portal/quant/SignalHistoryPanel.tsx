import type {QuantSignal} from '@/types';
import {resultR,signalPerformance} from '@/lib/quant/performance';
import {formatSignalEntryZone,formatSignalPrice,signalDisplayLevels} from '@/lib/quant/signalLevels';

export default function SignalHistoryPanel({signals}:{signals:QuantSignal[]}){
  const performance=signalPerformance(signals);const history=signals.filter(s=>s.status!=='active').slice(0,12);
  return <section style={{marginBottom:'2rem',animation:'fadeUp .5s .34s ease forwards',opacity:0}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'10px',marginBottom:'12px'}}>
      {([['Daily',performance.daily],['Weekly',performance.weekly],['Monthly',performance.monthly]] as const).map(([label,m])=><div key={label} style={{background:'#111',border:'1px solid rgba(255,255,255,.07)',padding:'1rem 1.15rem'}}>
        <p style={{fontSize:'.58rem',letterSpacing:'2.5px',textTransform:'uppercase',color:'#666',marginBottom:'9px'}}>{label} Performance</p>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:'8px'}}><strong style={{fontFamily:'Cinzel,serif',fontSize:'1.35rem',color:m.netR>0?'#34D399':m.netR<0?'#FF4757':'#888'}}>{m.netR>0?'+':''}{m.netR.toFixed(2)}R</strong><span style={{fontSize:'.68rem',color:'#777'}}>{m.winRate.toFixed(1)}% win</span></div>
        <p style={{fontSize:'.62rem',color:'#555',marginTop:'6px'}}>{m.trades} trades · {m.wins}W / {m.losses}L</p>
      </div>)}
    </div>
    <div style={{background:'#111',border:'1px solid rgba(255,255,255,.07)',overflowX:'auto'}}>
      <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:'8px'}}><span style={{width:'3px',height:'16px',background:'#D4AF37'}}/><p style={{fontFamily:'Cinzel,serif',fontSize:'.72rem',fontWeight:700}}>Signal History</p></div>
      <div style={{minWidth:'1230px'}}>
        <div style={{display:'grid',gridTemplateColumns:'90px 60px 145px 85px 85px 85px 85px 85px 75px 100px 105px',gap:'10px',padding:'.65rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.04)'}}>{['Instrument','Signal','Entry Zone','TP1','TP2','TP3','SL','Exit','Result','Status','Date'].map(h=><span key={h} style={{fontSize:'.54rem',letterSpacing:'1.4px',textTransform:'uppercase',color:'#444'}}>{h}</span>)}</div>
        {history.length===0?<p style={{padding:'2rem',textAlign:'center',fontSize:'.75rem',color:'#555'}}>Closed signals will appear here when TP, SL, or a manual close is recorded.</p>:history.map(sig=>{const r=resultR(sig);const color=r==null?'#777':r>0?'#34D399':r<0?'#FF4757':'#888';const levels=signalDisplayLevels(sig);return <div key={sig.id} style={{display:'grid',gridTemplateColumns:'90px 60px 145px 85px 85px 85px 85px 85px 75px 100px 105px',gap:'10px',padding:'.72rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.03)',alignItems:'center'}}>
          <strong style={{fontFamily:'JetBrains Mono,monospace',fontSize:'.72rem'}}>{sig.instrument}</strong><span style={{fontSize:'.6rem',fontWeight:700,color:sig.signal_type==='long'?'#34D399':'#FF4757'}}>{sig.signal_type==='long'?'BUY':'SELL'}</span><span style={mono}>{formatSignalEntryZone(sig.instrument,levels.entryZone)}</span><span style={{...mono,color:'#34D399'}}>{formatSignalPrice(sig.instrument,levels.takeProfits[0])}</span><span style={{...mono,color:'#20C997'}}>{formatSignalPrice(sig.instrument,levels.takeProfits[1])}</span><span style={{...mono,color:'#38BDF8'}}>{formatSignalPrice(sig.instrument,levels.takeProfits[2])}</span><span style={{...mono,color:'#FF4757'}}>{formatSignalPrice(sig.instrument,levels.stopLoss)}</span><span style={mono}>{formatSignalPrice(sig.instrument,sig.closed_price==null?null:Number(sig.closed_price))}</span><strong style={{...mono,color}}>{r==null?'—':`${r>0?'+':''}${r.toFixed(2)}R`}</strong><span style={{fontSize:'.58rem',textTransform:'uppercase',color}}>{sig.status.replaceAll('_',' ')}</span><span style={{fontSize:'.62rem',color:'#555'}}>{new Date(sig.closed_at??sig.broadcasted_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})}</span>
        </div>})}
      </div>
    </div>
  </section>;
}
const mono:React.CSSProperties={fontFamily:'JetBrains Mono,monospace',fontSize:'.68rem',color:'#888'};

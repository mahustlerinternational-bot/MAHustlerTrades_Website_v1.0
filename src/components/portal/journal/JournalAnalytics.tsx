'use client';

import {useMemo, useState} from 'react';

import {groupedAnalysis, mistakeAnalysis, periodPerformance, type JournalPeriod} from '@/lib/journal/analytics';
import type {JournalTrade} from '@/types/journal';
import {PanelHead} from './JournalDashboard';

const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

export default function JournalAnalytics({trades}: {trades: JournalTrade[]}) {
  const [period, setPeriod] = useState<JournalPeriod>('daily');
  const periods = useMemo(() => periodPerformance(trades, period).slice(-24), [period, trades]);
  const strategies = groupedAnalysis(trades, 'strategy');
  const setups = groupedAnalysis(trades, 'setup');
  const mistakes = mistakeAnalysis(trades);
  const maximum = Math.max(1, ...periods.map(item => Math.abs(item.netPnl)));

  return (
    <div style={{display: 'grid', gap: '16px'}}>
      <section style={panel}>
        <PanelHead
          label="TIME-BASED PERFORMANCE"
          title="Daily, Weekly & Monthly Analytics"
          action={
            <div style={segmented}>
              {(['daily', 'weekly', 'monthly'] as JournalPeriod[]).map(item => (
                <button key={item} onClick={() => setPeriod(item)} style={{...segment, color: period === item ? '#D4AF37' : '#666', background: period === item ? 'rgba(212,175,55,.07)' : 'transparent'}}>{item.toUpperCase()}</button>
              ))}
            </div>
          }
        />
        {periods.length ? (
          <div style={{padding: '17px'}}>
            <div style={performanceChart}>
              {periods.map(item => {
                const height = Math.max(4, (Math.abs(item.netPnl) / maximum) * 130);
                return (
                  <div key={item.key} style={barColumn} title={`${item.key}: ${usd.format(item.netPnl)}`}>
                    <span style={{fontSize: '.43rem', color: item.netPnl >= 0 ? '#34D399' : '#FF6874'}}>{item.netPnl >= 0 ? '+' : ''}{usd.format(item.netPnl)}</span>
                    <div style={{height: 140, display: 'flex', alignItems: 'flex-end'}}>
                      <div style={{width: '100%', height, background: item.netPnl >= 0 ? 'linear-gradient(180deg,#34D399,#116445)' : 'linear-gradient(180deg,#FF6874,#7A1D2B)', opacity: .85}} />
                    </div>
                    <span style={{fontSize: '.42rem', color: '#555', whiteSpace: 'nowrap'}}>{item.key.slice(period === 'monthly' ? 2 : 5)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '7px', marginTop: '15px'}}>
              <Mini label="Profitable periods" value={String(periods.filter(item => item.netPnl > 0).length)} />
              <Mini label="Losing periods" value={String(periods.filter(item => item.netPnl < 0).length)} />
              <Mini label="Best period" value={usd.format(Math.max(...periods.map(item => item.netPnl)))} />
              <Mini label="Average period" value={usd.format(periods.reduce((sum, item) => sum + item.netPnl, 0) / periods.length)} />
            </div>
          </div>
        ) : <div style={empty}>Closed trades are required before time-based analytics can be calculated.</div>}
      </section>

      <div className="journal-analysis-grid" style={analysisGrid}>
        <AnalysisTable title="Strategy Analysis" label="PROCESS EDGE" items={strategies} />
        <AnalysisTable title="Setup Analysis" label="PATTERN EDGE" items={setups} />
      </div>

      <section style={panel}>
        <PanelHead label="BEHAVIORAL REVIEW" title="Mistake Analysis" />
        {mistakes.length ? (
          <div className="journal-mistake-grid" style={mistakeGrid}>
            {mistakes.map(item => (
              <article key={item.name} style={mistakeCard}>
                <div style={{display: 'flex', justifyContent: 'space-between', gap: '8px'}}>
                  <strong style={{fontFamily: 'Cinzel,serif', fontSize: '.65rem'}}>{item.name}</strong>
                  <span style={{color: '#FF6874', fontFamily: 'JetBrains Mono,monospace', fontSize: '.62rem'}}>{item.count}×</span>
                </div>
                <div style={{height: 3, background: '#1B1B1B', margin: '13px 0 9px'}}><div style={{height: '100%', width: `${(item.losses / item.count) * 100}%`, background: '#FF6874'}} /></div>
                <div style={{display: 'flex', justifyContent: 'space-between', color: '#5B5B5B', fontSize: '.49rem'}}>
                  <span>{item.losses} linked loss{item.losses === 1 ? '' : 'es'}</span>
                  <strong style={{color: item.netPnl >= 0 ? '#34D399' : '#FF6874'}}>{usd.format(item.netPnl)}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : <div style={empty}>Tag mistakes during trade review to expose recurring execution leaks.</div>}
      </section>
    </div>
  );
}

function AnalysisTable({title, label, items}: {title: string; label: string; items: ReturnType<typeof groupedAnalysis>}) {
  return (
    <section style={panel}>
      <PanelHead label={label} title={title} />
      {items.length ? (
        <div style={{overflowX: 'auto'}}>
          <table style={table}>
            <thead><tr><th>Name</th><th>Trades</th><th>Win rate</th><th>PF</th><th>Avg R</th><th>Net P&L</th></tr></thead>
            <tbody>{items.slice(0, 12).map(item => (
              <tr key={item.name}>
                <td><strong>{item.name}</strong></td>
                <td>{item.totalTrades}</td>
                <td>{item.winRate.toFixed(1)}%</td>
                <td>{item.profitFactor === null ? '∞' : item.profitFactor.toFixed(2)}</td>
                <td>{item.averageR == null ? '—' : `${item.averageR.toFixed(2)}R`}</td>
                <td><strong style={{color: item.netPnl >= 0 ? '#34D399' : '#FF6874'}}>{usd.format(item.netPnl)}</strong></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div style={empty}>Add strategy and setup labels to closed trades to reveal performance by playbook.</div>}
    </section>
  );
}

function Mini({label, value}: {label: string; value: string}) {
  return <div style={mini}><span>{label.toUpperCase()}</span><strong>{value}</strong></div>;
}

const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden'};
const segmented: React.CSSProperties = {display: 'flex', border: '1px solid rgba(255,255,255,.07)', background: '#090909'};
const segment: React.CSSProperties = {border: 0, borderRight: '1px solid rgba(255,255,255,.06)', padding: '7px 9px', fontFamily: 'JetBrains Mono,monospace', fontSize: '.47rem', cursor: 'pointer'};
const performanceChart: React.CSSProperties = {display: 'flex', alignItems: 'flex-end', gap: '5px', overflowX: 'auto', minHeight: 190, borderBottom: '1px solid rgba(255,255,255,.05)', paddingBottom: '8px'};
const barColumn: React.CSSProperties = {flex: '1 0 35px', maxWidth: 65, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', textAlign: 'center'};
const mini: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: '5px', background: '#0B0B0B', border: '1px solid rgba(255,255,255,.045)', padding: '10px', color: '#5D5D5D', fontSize: '.46rem'};
const analysisGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'};
const table: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', minWidth: 590, fontSize: '.55rem'};
const mistakeGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', padding: '14px'};
const mistakeCard: React.CSSProperties = {background: '#0C0C0C', border: '1px solid rgba(255,255,255,.05)', padding: '13px'};
const empty: React.CSSProperties = {padding: '55px 20px', textAlign: 'center', color: '#555', fontSize: '.59rem'};


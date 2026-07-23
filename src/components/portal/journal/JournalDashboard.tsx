'use client';

import {Activity, ArrowDownRight, ArrowUpRight, Crosshair, ShieldCheck, Sigma, Target} from 'lucide-react';

import {equityCurve, summarizeJournal} from '@/lib/journal/analytics';
import type {JournalTrade} from '@/types/journal';

const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2});

export default function JournalDashboard({trades}: {trades: JournalTrade[]}) {
  const summary = summarizeJournal(trades);
  const curve = equityCurve(trades);
  const recent = trades.slice(0, 6);

  return (
    <div style={{display: 'grid', gap: '16px'}}>
      <div className="journal-summary-grid" style={summaryGrid}>
        <SummaryCard label="Net P&L" value={usd.format(summary.netPnl)} color={summary.netPnl >= 0 ? '#34D399' : '#FF6874'} icon={<Activity size={15} />} detail={`${summary.totalTrades} closed · ${summary.openTrades} open`} />
        <SummaryCard label="Win Rate" value={`${summary.winRate.toFixed(1)}%`} color="#D4AF37" icon={<Target size={15} />} detail={`${summary.wins}W · ${summary.losses}L · ${summary.breakeven}BE`} />
        <SummaryCard label="Profit Factor" value={summary.profitFactor === null ? '∞' : summary.profitFactor.toFixed(2)} color="#60A5FA" icon={<Sigma size={15} />} detail={`${usd.format(summary.grossProfit)} gross profit`} />
        <SummaryCard label="Average R" value={summary.averageR === null ? '—' : `${summary.averageR >= 0 ? '+' : ''}${summary.averageR.toFixed(2)}R`} color={(summary.averageR ?? 0) >= 0 ? '#34D399' : '#FF6874'} icon={<Crosshair size={15} />} detail={`${usd.format(summary.expectancy)} expectancy`} />
        <SummaryCard label="Plan Adherence" value={summary.planAdherence === null ? '—' : `${summary.planAdherence.toFixed(0)}%`} color="#C084FC" icon={<ShieldCheck size={15} />} detail="Based on reviewed trades" />
      </div>

      <div className="journal-dashboard-grid" style={mainGrid}>
        <section style={panel}>
          <PanelHead label="CUMULATIVE PERFORMANCE" title="Equity Curve" />
          <div style={{padding: '16px'}}>
            <EquityChart trades={trades} />
          </div>
        </section>

        <section style={panel}>
          <PanelHead label="EXECUTION SNAPSHOT" title="Performance Summary" />
          <div style={{padding: '6px 16px 14px'}}>
            {[
              ['Best trade', usd.format(summary.bestTrade), '#34D399'],
              ['Worst trade', usd.format(summary.worstTrade), '#FF6874'],
              ['Current streak', summary.currentStreak.kind === 'none' ? '—' : `${summary.currentStreak.count} ${summary.currentStreak.kind}${summary.currentStreak.count === 1 ? '' : 's'}`, summary.currentStreak.kind === 'win' ? '#34D399' : '#FF6874'],
              ['Longest win streak', String(summary.maxWinStreak), '#34D399'],
              ['Longest loss streak', String(summary.maxLossStreak), '#FF6874'],
              ['Gross loss', usd.format(summary.grossLoss), '#FF6874'],
            ].map(([label, value, color]) => (
              <div key={label} style={metricRow}>
                <span>{label}</span><strong style={{color}}>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={panel}>
        <PanelHead label="LATEST EXECUTIONS" title="Recent Trades" />
        {recent.length === 0 ? (
          <div style={empty}>
            <Crosshair size={28} color="#555" />
            <strong>Your journal is ready</strong>
            <span>Add your first trade or import a CSV to begin performance tracking.</span>
          </div>
        ) : (
          <div className="journal-recent-grid" style={recentGrid}>
            {recent.map(trade => {
              const pnl = Number(trade.net_pnl ?? 0);
              const open = trade.trade_status === 'open';
              const positive = pnl > 0;
              return (
                <article key={trade.id} style={tradeCard}>
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: '8px'}}>
                    <div>
                      <strong style={{fontFamily: 'Cinzel,serif', fontSize: '.72rem'}}>{trade.symbol}</strong>
                      <span style={{...direction, color: trade.direction === 'buy' ? '#34D399' : '#FF6874'}}>{trade.direction.toUpperCase()}</span>
                    </div>
                    <span style={{color: open ? '#60A5FA' : positive ? '#34D399' : pnl < 0 ? '#FF6874' : '#888'}}>
                      {open ? <Activity size={15} /> : positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                    </span>
                  </div>
                  <p style={{fontFamily: 'JetBrains Mono,monospace', fontSize: '.85rem', color: open ? '#60A5FA' : positive ? '#34D399' : pnl < 0 ? '#FF6874' : '#888', marginTop: '16px'}}>
                    {open ? 'OPEN' : `${pnl >= 0 ? '+' : ''}${usd.format(pnl)}`}
                  </p>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '9px', color: '#5B5B5B', fontSize: '.51rem'}}>
                    <span>{new Date(trade.opened_at).toLocaleDateString()}</span>
                    <span>{trade.result_r == null ? '—' : `${trade.result_r >= 0 ? '+' : ''}${Number(trade.result_r).toFixed(2)}R`}</span>
                  </div>
                  <p style={{fontSize: '.52rem', color: '#777', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{trade.setup || trade.strategy || 'Unclassified setup'}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EquityChart({trades}: {trades: JournalTrade[]}) {
  const points = equityCurve(trades);
  if (!points.length) return <div style={{...empty, minHeight: 265}}><Activity size={30} /><span>The equity curve will appear after your first closed trade.</span></div>;
  const values = [0, ...points.map(point => point.equity)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 800;
  const height = 260;
  const pad = 24;
  const coords = values.map((value, index) => ({
    x: pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2),
    y: pad + ((max - value) / range) * (height - pad * 2),
  }));
  const line = coords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${coords.at(-1)!.x} ${height - pad} L ${coords[0].x} ${height - pad} Z`;
  const finalPositive = points.at(-1)!.equity >= 0;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{width: '100%', height: 275, display: 'block'}}>
        <defs>
          <linearGradient id="journalEquityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={finalPositive ? '#34D399' : '#FF6874'} stopOpacity=".2" />
            <stop offset="100%" stopColor={finalPositive ? '#34D399' : '#FF6874'} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[.25, .5, .75].map(value => <line key={value} x1={pad} x2={width - pad} y1={height * value} y2={height * value} stroke="rgba(255,255,255,.045)" strokeWidth="1" />)}
        <path d={area} fill="url(#journalEquityFill)" />
        <path d={line} fill="none" stroke={finalPositive ? '#34D399' : '#FF6874'} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '.52rem'}}>
        <span>{points.length} closed trade{points.length === 1 ? '' : 's'}</span>
        <strong style={{color: finalPositive ? '#34D399' : '#FF6874'}}>Current: {usd.format(points.at(-1)!.equity)}</strong>
      </div>
    </div>
  );
}

function SummaryCard({label, value, color, icon, detail}: {label: string; value: string; color: string; icon: React.ReactNode; detail: string}) {
  return (
    <article style={summaryCard}>
      <div style={{display: 'flex', justifyContent: 'space-between', color: '#666'}}><span style={{fontSize: '.5rem', letterSpacing: '1.5px'}}>{label.toUpperCase()}</span><span style={{color}}>{icon}</span></div>
      <strong style={{display: 'block', fontFamily: 'Cinzel,serif', fontSize: '1.35rem', color, marginTop: '13px'}}>{value}</strong>
      <span style={{display: 'block', color: '#555', fontSize: '.5rem', marginTop: '5px'}}>{detail}</span>
    </article>
  );
}

export function PanelHead({label, title, action}: {label: string; title: string; action?: React.ReactNode}) {
  return (
    <header style={panelHead}>
      <div><p style={{fontSize: '.46rem', letterSpacing: '2.5px', color: '#D4AF37', marginBottom: '4px'}}>{label}</p><h2 style={{fontFamily: 'Cinzel,serif', fontSize: '.82rem'}}>{title}</h2></div>
      {action}
    </header>
  );
}

const summaryGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: '9px'};
const summaryCard: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)', padding: '14px'};
const mainGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0,1.65fr) minmax(280px,.75fr)', gap: '16px'};
const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden'};
const panelHead: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.05)'};
const metricRow: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.04)', color: '#707070', fontSize: '.58rem'};
const empty: React.CSSProperties = {minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '9px', color: '#5B5B5B', fontSize: '.6rem', textAlign: 'center', padding: '24px'};
const recentGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', padding: '14px'};
const tradeCard: React.CSSProperties = {background: '#0C0C0C', border: '1px solid rgba(255,255,255,.05)', padding: '13px'};
const direction: React.CSSProperties = {fontSize: '.46rem', marginLeft: '7px', letterSpacing: '1px'};


'use client';

import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useMemo, useState} from 'react';

import {periodKey, summarizeJournal} from '@/lib/journal/analytics';
import type {JournalTrade} from '@/types/journal';
import {PanelHead} from './JournalDashboard';

const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function JournalCalendar({trades}: {trades: JournalTrade[]}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const firstOffset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dayMap = useMemo(() => {
    const map = new Map<string, JournalTrade[]>();
    for (const trade of trades) {
      const key = periodKey(trade.closed_at ?? trade.opened_at, 'daily');
      map.set(key, [...(map.get(key) ?? []), trade]);
    }
    return map;
  }, [trades]);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(trade => periodKey(trade.closed_at ?? trade.opened_at, 'monthly') === monthKey);
  const summary = summarizeJournal(monthTrades);
  const selectedTrades = selected ? dayMap.get(selected) ?? [] : [];

  function moveMonth(offset: number) {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelected(null);
  }

  return (
    <div className="journal-calendar-layout" style={layout}>
      <section style={panel}>
        <PanelHead
          label="DAILY EXECUTION MAP"
          title={month.toLocaleDateString(undefined, {month: 'long', year: 'numeric'})}
          action={
            <div style={{display: 'flex', gap: '5px'}}>
              <button onClick={() => moveMonth(-1)} style={navButton}><ChevronLeft size={14} /></button>
              <button onClick={() => moveMonth(1)} style={navButton}><ChevronRight size={14} /></button>
            </div>
          }
        />
        <div style={weekHeader}>{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
        <div style={grid}>
          {Array.from({length: firstOffset}).map((_, index) => <div key={`blank-${index}`} style={blankDay} />)}
          {Array.from({length: daysInMonth}).map((_, index) => {
            const day = index + 1;
            const key = `${monthKey}-${String(day).padStart(2, '0')}`;
            const dayTrades = dayMap.get(key) ?? [];
            const daySummary = summarizeJournal(dayTrades);
            const active = selected === key;
            return (
              <button key={key} onClick={() => setSelected(active ? null : key)} style={{...dayCell, borderColor: active ? 'rgba(212,175,55,.45)' : 'rgba(255,255,255,.05)', background: active ? 'rgba(212,175,55,.06)' : '#0C0C0C'}}>
                <span style={{color: dayTrades.length ? '#ddd' : '#555'}}>{day}</span>
                {dayTrades.length > 0 && (
                  <>
                    <strong style={{color: daySummary.netPnl >= 0 ? '#34D399' : '#FF6874'}}>{daySummary.netPnl >= 0 ? '+' : ''}{usd.format(daySummary.netPnl)}</strong>
                    <small>{dayTrades.length} trade{dayTrades.length === 1 ? '' : 's'} · {daySummary.winRate.toFixed(0)}%</small>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside style={panel}>
        <PanelHead label={selected ? 'SELECTED DAY' : 'MONTH SUMMARY'} title={selected ? new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, {weekday: 'long', month: 'short', day: 'numeric'}) : 'Performance'} />
        {selected ? (
          selectedTrades.length ? (
            <div style={{padding: '9px 14px'}}>
              {selectedTrades.map(trade => {
                const pnl = Number(trade.net_pnl ?? 0);
                return (
                  <div key={trade.id} style={tradeRow}>
                    <div><strong>{trade.symbol} · {trade.direction.toUpperCase()}</strong><small>{trade.setup || trade.strategy || 'Unclassified'}</small></div>
                    <strong style={{color: trade.trade_status === 'open' ? '#60A5FA' : pnl >= 0 ? '#34D399' : '#FF6874'}}>{trade.trade_status === 'open' ? 'OPEN' : `${pnl >= 0 ? '+' : ''}${usd.format(pnl)}`}</strong>
                  </div>
                );
              })}
            </div>
          ) : <div style={empty}>No trades recorded on this day.</div>
        ) : (
          <div style={{padding: '8px 16px'}}>
            {[
              ['Net P&L', usd.format(summary.netPnl), summary.netPnl >= 0 ? '#34D399' : '#FF6874'],
              ['Closed trades', String(summary.totalTrades), '#fff'],
              ['Win rate', `${summary.winRate.toFixed(1)}%`, '#D4AF37'],
              ['Profit factor', summary.profitFactor === null ? '∞' : summary.profitFactor.toFixed(2), '#60A5FA'],
              ['Average R', summary.averageR == null ? '—' : `${summary.averageR.toFixed(2)}R`, '#C084FC'],
            ].map(([label, value, color]) => <div key={label} style={metricRow}><span>{label}</span><strong style={{color}}>{value}</strong></div>)}
          </div>
        )}
      </aside>
    </div>
  );
}

const layout: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(270px,.65fr)', gap: '16px'};
const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden'};
const navButton: React.CSSProperties = {width: 29, height: 28, display: 'grid', placeItems: 'center', background: '#090909', border: '1px solid rgba(255,255,255,.08)', color: '#888', cursor: 'pointer'};
const weekHeader: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', color: '#555', fontSize: '.46rem', letterSpacing: '1.5px', padding: '10px 9px 7px'};
const grid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: '5px', padding: '0 9px 10px'};
const blankDay: React.CSSProperties = {minHeight: 91, background: '#0B0B0B', opacity: .35};
const dayCell: React.CSSProperties = {minHeight: 91, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '9px', border: '1px solid', color: '#fff', cursor: 'pointer', textAlign: 'left'};
const tradeRow: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.045)', fontSize: '.58rem'};
const metricRow: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.045)', color: '#666', fontSize: '.58rem'};
const empty: React.CSSProperties = {padding: '60px 20px', textAlign: 'center', color: '#555', fontSize: '.6rem'};

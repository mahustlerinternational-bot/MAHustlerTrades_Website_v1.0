'use client';

import {ChevronLeft, ChevronRight, ImageIcon, Pencil, Search, Trash2} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {JournalTrade} from '@/types/journal';
import {PanelHead} from './JournalDashboard';

const PAGE_SIZE = 20;
const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});

export default function TradeHistory({
  trades,
  onEdit,
  onDelete,
}: {
  trades: JournalTrade[];
  onEdit: (trade: JournalTrade) => void;
  onDelete: (trade: JournalTrade) => void;
}) {
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('all');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return trades.filter(trade => {
      const pnl = Number(trade.net_pnl ?? 0);
      const matchesOutcome =
        outcome === 'all' ||
        (outcome === 'open' && trade.trade_status === 'open') ||
        (outcome === 'win' && trade.trade_status === 'closed' && pnl > 0) ||
        (outcome === 'loss' && trade.trade_status === 'closed' && pnl < 0) ||
        (outcome === 'breakeven' && trade.trade_status === 'closed' && pnl === 0);
      const matchesSearch = !needle || [
        trade.symbol,
        trade.strategy,
        trade.setup,
        trade.session,
        trade.notes,
        ...(trade.tags ?? []),
      ].some(value => String(value ?? '').toLowerCase().includes(needle));
      return matchesOutcome && matchesSearch;
    });
  }, [outcome, search, trades]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section style={panel}>
      <PanelHead
        label="COMPLETE EXECUTION LOG"
        title="Trade History"
        action={<span style={{fontSize: '.53rem', color: '#666'}}>{filtered.length} TRADE{filtered.length === 1 ? '' : 'S'}</span>}
      />
      <div className="journal-history-filters" style={filters}>
        <label style={searchWrap}><Search size={13} /><input value={search} onChange={event => {setSearch(event.target.value); setPage(1);}} placeholder="Search symbol, strategy, setup or notes…" /></label>
        <select value={outcome} onChange={event => {setOutcome(event.target.value); setPage(1);}} style={select}>
          <option value="all">All outcomes</option>
          <option value="open">Open</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
          <option value="breakeven">Breakeven</option>
        </select>
      </div>
      <div style={{overflowX: 'auto'}}>
        <table style={table}>
          <thead>
            <tr>{['Date','Instrument','Direction','Strategy / Setup','Entry → Exit','Size','P&L','Result','Plan','Media',''].map(label => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map(trade => {
              const pnl = Number(trade.net_pnl ?? 0);
              const color = trade.trade_status === 'open' ? '#60A5FA' : pnl > 0 ? '#34D399' : pnl < 0 ? '#FF6874' : '#888';
              return (
                <tr key={trade.id}>
                  <td><strong>{new Date(trade.opened_at).toLocaleDateString()}</strong><small>{new Date(trade.opened_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</small></td>
                  <td><strong style={{fontFamily: 'Cinzel,serif'}}>{trade.symbol}</strong><small>{trade.timeframe || '—'} · {trade.session || '—'}</small></td>
                  <td><span style={{...badge, color: trade.direction === 'buy' ? '#34D399' : '#FF6874', borderColor: trade.direction === 'buy' ? 'rgba(52,211,153,.2)' : 'rgba(255,71,87,.2)'}}>{trade.direction.toUpperCase()}</span></td>
                  <td><strong>{trade.strategy || 'Unclassified'}</strong><small>{trade.setup || 'No setup recorded'}</small></td>
                  <td><strong style={{fontFamily: 'JetBrains Mono,monospace'}}>{Number(trade.entry_price).toFixed(2)} → {trade.exit_price == null ? 'OPEN' : Number(trade.exit_price).toFixed(2)}</strong><small>SL {trade.stop_loss ?? '—'} · TP {trade.take_profit ?? '—'}</small></td>
                  <td>{Number(trade.lot_size).toFixed(2)}</td>
                  <td><strong style={{color}}>{trade.trade_status === 'open' ? 'OPEN' : `${pnl >= 0 ? '+' : ''}${usd.format(pnl)}`}</strong><small>{trade.fees ? `${usd.format(Number(trade.fees))} fees` : 'No fees'}</small></td>
                  <td><strong style={{color}}>{trade.result_r == null ? '—' : `${Number(trade.result_r) >= 0 ? '+' : ''}${Number(trade.result_r).toFixed(2)}R`}</strong></td>
                  <td>{trade.followed_plan == null ? '—' : trade.followed_plan ? <span style={{color: '#34D399'}}>YES</span> : <span style={{color: '#FF6874'}}>NO</span>}</td>
                  <td>{trade.screenshots.length ? <a href={trade.screenshots[0].url} target="_blank" rel="noreferrer" style={mediaLink}><ImageIcon size={12} />{trade.screenshots.length}</a> : '—'}</td>
                  <td>
                    <div style={{display: 'flex', gap: '5px'}}>
                      <button onClick={() => onEdit(trade)} title="Edit trade" style={iconButton}><Pencil size={12} /></button>
                      <button onClick={() => onDelete(trade)} title="Delete trade" style={{...iconButton, color: '#FF6874'}}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!visible.length && <div style={empty}>No trades match the current filters.</div>}
      <footer style={pagination}>
        <span>Page {safePage} of {pages}</span>
        <div style={{display: 'flex', gap: '5px'}}>
          <button disabled={safePage <= 1} onClick={() => setPage(current => Math.max(1, current - 1))} style={pageButton}><ChevronLeft size={13} /></button>
          <button disabled={safePage >= pages} onClick={() => setPage(current => Math.min(pages, current + 1))} style={pageButton}><ChevronRight size={13} /></button>
        </div>
      </footer>
    </section>
  );
}

const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden'};
const filters: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 180px', gap: '8px', padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,.05)'};
const searchWrap: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', background: '#090909', border: '1px solid rgba(255,255,255,.08)', padding: '0 10px', color: '#666'};
const select: React.CSSProperties = {background: '#090909', border: '1px solid rgba(255,255,255,.08)', color: '#aaa', padding: '9px', fontFamily: 'inherit', fontSize: '.58rem'};
const table: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', minWidth: 1180, fontSize: '.58rem'};
const badge: React.CSSProperties = {display: 'inline-block', border: '1px solid', padding: '4px 7px', fontSize: '.47rem', letterSpacing: '1px'};
const mediaLink: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D4AF37', textDecoration: 'none'};
const iconButton: React.CSSProperties = {width: 27, height: 27, display: 'grid', placeItems: 'center', background: '#090909', border: '1px solid rgba(255,255,255,.08)', color: '#888', cursor: 'pointer'};
const empty: React.CSSProperties = {padding: '50px', textAlign: 'center', color: '#555', fontSize: '.62rem'};
const pagination: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', color: '#555', fontSize: '.52rem', borderTop: '1px solid rgba(255,255,255,.05)'};
const pageButton: React.CSSProperties = {width: 28, height: 27, display: 'grid', placeItems: 'center', background: '#090909', border: '1px solid rgba(255,255,255,.08)', color: '#888', cursor: 'pointer'};


'use client';

import {
  BarChart3,
  CalendarDays,
  Download,
  FileUp,
  History,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toast} from 'sonner';

import JournalAnalytics from '@/components/portal/journal/JournalAnalytics';
import JournalCalendar from '@/components/portal/journal/JournalCalendar';
import JournalDashboard from '@/components/portal/journal/JournalDashboard';
import TradeEditorModal from '@/components/portal/journal/TradeEditorModal';
import TradeHistory from '@/components/portal/journal/TradeHistory';
import {authFetch} from '@/lib/utils/authFetch';
import type {JournalTrade} from '@/types/journal';

type JournalTab = 'dashboard' | 'history' | 'calendar' | 'analytics';

const TABS: {id: JournalTab; label: string; icon: React.ReactNode}[] = [
  {id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} />},
  {id: 'history', label: 'Trade History', icon: <History size={14} />},
  {id: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} />},
  {id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} />},
];

export default function TradingJournalPage() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<JournalTab>('dashboard');
  const [editor, setEditor] = useState<{open: boolean; trade: JournalTrade | null}>({open: false, trade: null});
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/me/journal/trades');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Trading journal could not be loaded');
      setTrades(result.trades ?? []);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Trading journal could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteTrade(trade: JournalTrade) {
    if (!confirm(`Permanently delete the ${trade.symbol} trade from ${new Date(trade.opened_at).toLocaleDateString()} and its screenshots?`)) return;
    const response = await authFetch(`/api/me/journal/trades/${trade.id}`, {method: 'DELETE'});
    const result = await response.json();
    if (!response.ok) return toast.error(result.error ?? 'Trade could not be deleted');
    setTrades(current => current.filter(item => item.id !== trade.id));
    toast.success('Trade deleted');
  }

  async function importCsv(file: File | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) return toast.error('CSV import must be no more than 1 MB');
    setImporting(true);
    try {
      const response = await authFetch('/api/me/journal/import', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({csv: await file.text()}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'CSV could not be imported');
      toast.success(`${result.imported} trade${result.imported === 1 ? '' : 's'} imported`);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'CSV could not be imported');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  }

  async function exportCsv() {
    try {
      const response = await authFetch('/api/me/journal/export');
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? 'CSV could not be exported');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mahustler-trading-journal-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Trading journal CSV exported');
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'CSV could not be exported');
    }
  }

  if (loading && !trades.length) {
    return <div style={center}><Loader2 size={30} color="#D4AF37" style={{animation: 'journalSpin .8s linear infinite'}} /><span>Loading your private trading journal…</span></div>;
  }

  if (error && !trades.length) {
    return (
      <div style={center}>
        <BarChart3 size={32} color="#D4AF37" />
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.1rem'}}>Trading Journal Unavailable</h1>
        <p style={{fontSize: '.65rem', color: '#777', maxWidth: 620, textAlign: 'center'}}>{error}</p>
        <button onClick={() => void load()} style={goldButton}><RefreshCw size={13} /> Try Again</button>
      </div>
    );
  }

  return (
    <div className="trading-journal-page" style={page}>
      <style>{`
        @keyframes journalSpin{to{transform:rotate(360deg)}}
        @keyframes journalFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .journal-tab:hover{color:#D4AF37!important;border-color:rgba(212,175,55,.25)!important}
        .journal-field input,.journal-field select,.journal-field textarea{
          width:100%;background:#090909;border:1px solid rgba(255,255,255,.09);color:#ddd;
          padding:9px 10px;font-family:Montserrat,sans-serif;font-size:.62rem;outline:none;border-radius:0
        }
        .journal-field textarea{resize:vertical;line-height:1.6}
        .journal-field input:disabled,.journal-field select:disabled{opacity:.38;cursor:not-allowed}
        .journal-field option{background:#111;color:#ddd}
        .journal-history-filters input{width:100%;background:transparent;border:0;outline:0;color:#ddd;font-family:inherit;font-size:.58rem}
        table th{text-align:left;padding:10px 11px;color:#575757;font-size:.44rem;letter-spacing:1.1px;font-weight:500;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap}
        table td{padding:11px;color:#888;border-bottom:1px solid rgba(255,255,255,.035);vertical-align:middle;white-space:nowrap}
        table td strong{display:block;color:#d2d2d2;font-size:.57rem;font-weight:500}
        table td small{display:block;color:#535353;font-size:.47rem;margin-top:4px}
        table tbody tr:hover{background:rgba(212,175,55,.018)}
        @media(max-width:1100px){
          .journal-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
          .journal-dashboard-grid,.journal-calendar-layout{grid-template-columns:1fr!important}
        }
        @media(max-width:850px){
          .journal-analysis-grid{grid-template-columns:1fr!important}
          .journal-mistake-grid,.journal-recent-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .journal-action-label{display:none}
        }
        @media(max-width:620px){
          .trading-journal-page{padding:1.25rem!important}
          .journal-summary-grid,.journal-mistake-grid,.journal-recent-grid{grid-template-columns:1fr!important}
          .journal-history-filters{grid-template-columns:1fr!important}
          .journal-top-actions{width:100%;justify-content:flex-start!important}
          .journal-tabs{width:100%;overflow-x:auto}
        }
      `}</style>

      <header style={header}>
        <div>
          <p style={eyebrow}>PRIVATE PERFORMANCE LEDGER</p>
          <h1 style={title}>Trading Journal</h1>
          <p style={subtitle}>Record every execution, audit your process and turn trading data into measurable improvement.</p>
        </div>
        <div className="journal-top-actions" style={actions}>
          <span style={privateBadge}><ShieldCheck size={12} /> PRIVATE TO YOUR ACCOUNT</span>
          <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={event => void importCsv(event.target.files?.[0] ?? null)} />
          <button onClick={() => importRef.current?.click()} disabled={importing} style={outlineButton}>
            {importing ? <Loader2 size={13} style={{animation: 'journalSpin .8s linear infinite'}} /> : <FileUp size={13} />}
            <span className="journal-action-label">{importing ? 'Importing…' : 'Import CSV'}</span>
          </button>
          <button onClick={() => void exportCsv()} style={outlineButton}><Download size={13} /><span className="journal-action-label">Export CSV</span></button>
          <button onClick={() => setEditor({open: true, trade: null})} style={goldButton}><Plus size={14} /> Add Trade</button>
        </div>
      </header>

      <nav className="journal-tabs" style={tabs}>
        {TABS.map(item => (
          <button key={item.id} className="journal-tab" onClick={() => setTab(item.id)} style={{...tabButton, color: tab === item.id ? '#D4AF37' : '#777', background: tab === item.id ? 'rgba(212,175,55,.06)' : '#101010', borderColor: tab === item.id ? 'rgba(212,175,55,.3)' : 'rgba(255,255,255,.06)'}}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>

      <main key={tab} style={{animation: 'journalFade .3s ease both'}}>
        {tab === 'dashboard' && <JournalDashboard trades={trades} />}
        {tab === 'history' && <TradeHistory trades={trades} onEdit={trade => setEditor({open: true, trade})} onDelete={trade => void deleteTrade(trade)} />}
        {tab === 'calendar' && <JournalCalendar trades={trades} />}
        {tab === 'analytics' && <JournalAnalytics trades={trades} />}
      </main>

      <footer style={disclaimer}>
        Journal statistics depend on the accuracy and completeness of entered data. P&L is treated as the recorded net result, while R-multiple uses the saved initial risk amount. This workspace is for recordkeeping and education, not financial advice.
      </footer>

      {editor.open && (
        <TradeEditorModal
          trade={editor.trade}
          onClose={() => setEditor({open: false, trade: null})}
          onSaved={load}
        />
      )}
    </div>
  );
}

const page: React.CSSProperties = {padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Montserrat,sans-serif'};
const center: React.CSSProperties = {...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#666', fontSize: '.68rem'};
const header: React.CSSProperties = {display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '22px'};
const eyebrow: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.54rem', letterSpacing: '4px', color: '#D4AF37', marginBottom: '7px'};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '2.15rem', fontWeight: 900, lineHeight: 1};
const subtitle: React.CSSProperties = {fontSize: '.68rem', color: '#646464', lineHeight: 1.6, marginTop: '9px', maxWidth: 660};
const actions: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '7px', flexWrap: 'wrap'};
const privateBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34D399', border: '1px solid rgba(52,211,153,.18)', background: 'rgba(52,211,153,.045)', padding: '8px 9px', fontSize: '.46rem', letterSpacing: '1.2px'};
const outlineButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 11px', background: '#101010', border: '1px solid rgba(255,255,255,.09)', color: '#888', fontFamily: 'inherit', fontSize: '.53rem', cursor: 'pointer'};
const goldButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 14px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', border: 0, color: '#000', fontFamily: 'Cinzel,serif', fontSize: '.54rem', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer'};
const tabs: React.CSSProperties = {display: 'flex', gap: '6px', marginBottom: '16px'};
const tabButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', minWidth: 120, border: '1px solid', padding: '10px 13px', fontFamily: 'Cinzel,serif', fontSize: '.55rem', cursor: 'pointer'};
const disclaimer: React.CSSProperties = {marginTop: '14px', color: '#4E4E4E', fontSize: '.5rem', lineHeight: 1.6};


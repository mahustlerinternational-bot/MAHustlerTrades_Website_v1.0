'use client';

import {ImagePlus, Loader2, Paperclip, Save, Trash2, X} from 'lucide-react';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';

import {supabase} from '@/lib/supabase/client';
import {authFetch} from '@/lib/utils/authFetch';
import type {JournalTrade, JournalTradeStatus} from '@/types/journal';

function localDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

interface Draft {
  symbol: string;
  direction: 'buy' | 'sell';
  trade_status: JournalTradeStatus;
  opened_at: string;
  closed_at: string;
  entry_price: string;
  exit_price: string;
  stop_loss: string;
  take_profit: string;
  lot_size: string;
  net_pnl: string;
  fees: string;
  risk_amount: string;
  result_r: string;
  strategy: string;
  setup: string;
  timeframe: string;
  session: string;
  market_condition: string;
  followed_plan: '' | 'true' | 'false';
  mistakes: string;
  tags: string;
  notes: string;
  rating: string;
  external_ref: string;
}

function initialDraft(trade: JournalTrade | null): Draft {
  return {
    symbol: trade?.symbol ?? 'XAUUSD',
    direction: trade?.direction ?? 'buy',
    trade_status: trade?.trade_status ?? 'closed',
    opened_at: localDateTime(trade?.opened_at),
    closed_at: trade?.closed_at ? localDateTime(trade.closed_at) : localDateTime(),
    entry_price: trade ? String(trade.entry_price) : '',
    exit_price: trade?.exit_price == null ? '' : String(trade.exit_price),
    stop_loss: trade?.stop_loss == null ? '' : String(trade.stop_loss),
    take_profit: trade?.take_profit == null ? '' : String(trade.take_profit),
    lot_size: trade ? String(trade.lot_size) : '0.01',
    net_pnl: trade?.net_pnl == null ? '' : String(trade.net_pnl),
    fees: trade ? String(trade.fees) : '0',
    risk_amount: trade?.risk_amount == null ? '' : String(trade.risk_amount),
    result_r: trade?.result_r == null ? '' : String(trade.result_r),
    strategy: trade?.strategy ?? '',
    setup: trade?.setup ?? '',
    timeframe: trade?.timeframe ?? '',
    session: trade?.session ?? '',
    market_condition: trade?.market_condition ?? '',
    followed_plan: trade?.followed_plan == null ? '' : String(trade.followed_plan) as 'true' | 'false',
    mistakes: trade?.mistakes?.join(', ') ?? '',
    tags: trade?.tags?.join(', ') ?? '',
    notes: trade?.notes ?? '',
    rating: trade?.rating == null ? '' : String(trade.rating),
    external_ref: trade?.external_ref ?? '',
  };
}

export default function TradeEditorModal({
  trade,
  onClose,
  onSaved,
}: {
  trade: JournalTrade | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(trade));
  const [files, setFiles] = useState<File[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState(() => trade?.screenshots ?? []);
  const [saving, setSaving] = useState(false);
  const closed = draft.trade_status === 'closed';
  const computedR = useMemo(() => {
    const pnl = Number(draft.net_pnl);
    const risk = Number(draft.risk_amount);
    return !draft.result_r && Number.isFinite(pnl) && risk > 0 ? pnl / risk : null;
  }, [draft.net_pnl, draft.result_r, draft.risk_amount]);

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(current => ({...current, [field]: value}));
  }

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const allowed = [...selected].filter(file => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast.error(`${file.name} is not a supported image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5 MB`);
        return false;
      }
      return true;
    });
    setFiles(current => [...current, ...allowed].slice(0, 5));
  }

  async function uploadScreenshot(tradeId: string, file: File) {
    const prepare = await authFetch('/api/me/journal/screenshots', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'prepare',
        trade_id: tradeId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      }),
    });
    const prepared = await prepare.json();
    if (!prepare.ok) throw new Error(prepared.error ?? 'Screenshot upload could not be prepared');
    const {error} = await supabase.storage
      .from(prepared.bucket)
      .uploadToSignedUrl(prepared.path, prepared.token, file, {contentType: file.type});
    if (error) throw error;
    const confirm = await authFetch('/api/me/journal/screenshots', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'confirm',
        trade_id: tradeId,
        path: prepared.path,
        file_name: prepared.file_name,
        file_size: prepared.file_size,
        mime_type: prepared.mime_type,
      }),
    });
    const confirmed = await confirm.json();
    if (!confirm.ok) throw new Error(confirmed.error ?? 'Screenshot upload could not be confirmed');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...draft,
        opened_at: new Date(draft.opened_at).toISOString(),
        closed_at: closed && draft.closed_at ? new Date(draft.closed_at).toISOString() : null,
        exit_price: closed ? draft.exit_price : null,
        net_pnl: closed ? draft.net_pnl : null,
        followed_plan: draft.followed_plan === '' ? null : draft.followed_plan === 'true',
        mistakes: draft.mistakes.split(',').map(value => value.trim()).filter(Boolean),
        tags: draft.tags.split(',').map(value => value.trim()).filter(Boolean),
        result_r: closed ? draft.result_r || computedR : null,
      };
      const response = await authFetch(
        trade ? `/api/me/journal/trades/${trade.id}` : '/api/me/journal/trades',
        {
          method: trade ? 'PATCH' : 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        },
      );
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error ?? 'Trade could not be saved');
      let failedUploads = 0;
      for (const file of files) {
        try {
          await uploadScreenshot(saved.id, file);
        } catch {
          failedUploads += 1;
        }
      }
      if (failedUploads) toast.warning(`Trade saved, but ${failedUploads} screenshot upload${failedUploads === 1 ? '' : 's'} failed`);
      else toast.success(trade ? 'Trade updated' : 'Trade added to journal');
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Trade could not be saved');
    } finally {
      setSaving(false);
    }
  }

  async function removeExistingScreenshot(id: string) {
    if (!confirm('Remove this screenshot from the trade?')) return;
    const response = await authFetch(`/api/me/journal/screenshots/${id}`, {method: 'DELETE'});
    const result = await response.json();
    if (!response.ok) return toast.error(result.error ?? 'Screenshot could not be removed');
    setExistingScreenshots(current => current.filter(screenshot => screenshot.id !== id));
    toast.success('Screenshot removed');
    await onSaved();
  }

  return (
    <div style={backdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <form onSubmit={save} style={modal}>
        <style>{`
          .journal-modal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
          .journal-modal-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
          .journal-field input:focus,.journal-field select:focus,.journal-field textarea:focus{border-color:rgba(212,175,55,.45)!important}
          @media(max-width:760px){.journal-modal-grid,.journal-modal-two{grid-template-columns:1fr!important}}
        `}</style>
        <header style={modalHeader}>
          <div>
            <p style={eyebrow}>{trade ? 'UPDATE EXECUTION RECORD' : 'NEW EXECUTION RECORD'}</p>
            <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1.2rem'}}>{trade ? 'Edit Trade' : 'Add Trade'}</h2>
          </div>
          <button type="button" onClick={onClose} style={closeButton}><X size={18} /></button>
        </header>

        <div style={body}>
          <section style={section}>
            <SectionTitle title="Trade Details" />
            <div className="journal-modal-grid">
              <Field label="Symbol"><input value={draft.symbol} onChange={event => update('symbol', event.target.value.toUpperCase())} required /></Field>
              <Field label="Direction">
                <select value={draft.direction} onChange={event => update('direction', event.target.value as 'buy' | 'sell')}>
                  <option value="buy">BUY / LONG</option><option value="sell">SELL / SHORT</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={draft.trade_status} onChange={event => update('trade_status', event.target.value as JournalTradeStatus)}>
                  <option value="closed">Closed</option><option value="open">Open</option><option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Opened at"><input type="datetime-local" value={draft.opened_at} onChange={event => update('opened_at', event.target.value)} required /></Field>
              <Field label="Closed at"><input type="datetime-local" value={draft.closed_at} onChange={event => update('closed_at', event.target.value)} disabled={!closed} required={closed} /></Field>
              <Field label="Lot size"><input type="number" step="0.0001" min="0.0001" value={draft.lot_size} onChange={event => update('lot_size', event.target.value)} required /></Field>
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Prices & Result" />
            <div className="journal-modal-grid">
              <Field label="Entry price"><input type="number" step="0.000001" min="0" value={draft.entry_price} onChange={event => update('entry_price', event.target.value)} required /></Field>
              <Field label="Exit price"><input type="number" step="0.000001" min="0" value={draft.exit_price} onChange={event => update('exit_price', event.target.value)} disabled={!closed} /></Field>
              <Field label="Stop loss"><input type="number" step="0.000001" min="0" value={draft.stop_loss} onChange={event => update('stop_loss', event.target.value)} /></Field>
              <Field label="Take profit"><input type="number" step="0.000001" min="0" value={draft.take_profit} onChange={event => update('take_profit', event.target.value)} /></Field>
              <Field label="Net P&L (USD)"><input type="number" step="0.01" value={draft.net_pnl} onChange={event => update('net_pnl', event.target.value)} disabled={!closed} required={closed} /></Field>
              <Field label="Fees / commission"><input type="number" step="0.01" min="0" value={draft.fees} onChange={event => update('fees', event.target.value)} /></Field>
              <Field label="Initial risk (USD)"><input type="number" step="0.01" min="0" value={draft.risk_amount} onChange={event => update('risk_amount', event.target.value)} /></Field>
              <Field label="Result (R)"><input type="number" step="0.01" value={draft.result_r} onChange={event => update('result_r', event.target.value)} placeholder={computedR == null ? '' : computedR.toFixed(2)} /></Field>
              <Field label="External reference"><input value={draft.external_ref} onChange={event => update('external_ref', event.target.value)} placeholder="MT5 ticket (optional)" /></Field>
            </div>
          </section>

          <section style={section}>
            <SectionTitle title="Execution Context" />
            <div className="journal-modal-grid">
              <Field label="Strategy"><input value={draft.strategy} onChange={event => update('strategy', event.target.value)} placeholder="e.g. London Breakout" /></Field>
              <Field label="Setup"><input value={draft.setup} onChange={event => update('setup', event.target.value)} placeholder="e.g. CRT Sweep" /></Field>
              <Field label="Timeframe"><input value={draft.timeframe} onChange={event => update('timeframe', event.target.value)} placeholder="e.g. M15" /></Field>
              <Field label="Session">
                <select value={draft.session} onChange={event => update('session', event.target.value)}>
                  <option value="">Not specified</option><option>Asia</option><option>London</option><option>New York</option><option>London / New York Overlap</option>
                </select>
              </Field>
              <Field label="Market condition">
                <select value={draft.market_condition} onChange={event => update('market_condition', event.target.value)}>
                  <option value="">Not specified</option><option>Trending Bull</option><option>Trending Bear</option><option>Ranging</option><option>High Volatility</option><option>Low Volatility</option><option>News Event</option>
                </select>
              </Field>
              <Field label="Followed plan?">
                <select value={draft.followed_plan} onChange={event => update('followed_plan', event.target.value as Draft['followed_plan'])}>
                  <option value="">Not reviewed</option><option value="true">Yes</option><option value="false">No</option>
                </select>
              </Field>
              <Field label="Mistakes (comma-separated)"><input value={draft.mistakes} onChange={event => update('mistakes', event.target.value)} placeholder="FOMO, early exit, over-risk" /></Field>
              <Field label="Tags (comma-separated)"><input value={draft.tags} onChange={event => update('tags', event.target.value)} placeholder="gold, news, A-setup" /></Field>
              <Field label="Execution rating">
                <select value={draft.rating} onChange={event => update('rating', event.target.value)}>
                  <option value="">Not rated</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} / 5</option>)}
                </select>
              </Field>
            </div>
            <div style={{marginTop: '12px'}}>
              <Field label="Review notes"><textarea rows={4} value={draft.notes} onChange={event => update('notes', event.target.value)} placeholder="What went well? What must change next time?" /></Field>
            </div>
          </section>

          <section style={{...section, marginBottom: 0}}>
            <SectionTitle title="Screenshot Attachments" />
            {existingScreenshots.length ? (
              <div style={existingGrid}>
                {existingScreenshots.map(screenshot => (
                  <div key={screenshot.id} style={thumbWrap}>
                    {screenshot.url && <img src={screenshot.url} alt={screenshot.file_name} style={thumb} />}
                    <button type="button" onClick={() => void removeExistingScreenshot(screenshot.id)} style={thumbDelete}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            ) : null}
            <label style={uploadZone}>
              <ImagePlus size={20} color="#D4AF37" />
              <span><strong>Attach chart screenshots</strong><small>JPG, PNG, WEBP or GIF · maximum 5 MB each</small></span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={event => addFiles(event.target.files)} />
            </label>
            {files.length > 0 && (
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '9px'}}>
                {files.map((file, index) => (
                  <span key={`${file.name}-${index}`} style={filePill}>
                    <Paperclip size={10} /> {file.name}
                    <button type="button" onClick={() => setFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} style={{background: 'none', border: 0, color: '#888', cursor: 'pointer'}}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer style={footer}>
          <button type="button" onClick={onClose} style={cancelButton}>Cancel</button>
          <button type="submit" disabled={saving} style={{...saveButton, opacity: saving ? .65 : 1}}>
            {saving ? <Loader2 size={14} style={{animation: 'journalSpin .8s linear infinite'}} /> : <Save size={14} />}
            {saving ? 'Saving…' : trade ? 'Update Trade' : 'Save Trade'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="journal-field" style={field}>
      <span>{label.toUpperCase()}</span>{children}
    </label>
  );
}

function SectionTitle({title}: {title: string}) {
  return <h3 style={sectionTitle}><span />{title}</h3>;
}

const backdrop: React.CSSProperties = {position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.84)', backdropFilter: 'blur(5px)', display: 'grid', placeItems: 'center', padding: '22px'};
const modal: React.CSSProperties = {width: 'min(1050px,96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid rgba(212,175,55,.28)', boxShadow: '0 30px 100px rgba(0,0,0,.7)', color: '#fff'};
const modalHeader: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0};
const eyebrow: React.CSSProperties = {fontSize: '.48rem', letterSpacing: '3px', color: '#D4AF37', marginBottom: '5px'};
const closeButton: React.CSSProperties = {width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,.08)', color: '#888', cursor: 'pointer'};
const body: React.CSSProperties = {overflowY: 'auto', padding: '20px 22px'};
const section: React.CSSProperties = {padding: '16px', border: '1px solid rgba(255,255,255,.055)', background: '#101010', marginBottom: '14px'};
const sectionTitle: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Cinzel,serif', fontSize: '.72rem', marginBottom: '14px'};
const field: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: '6px', color: '#666', fontSize: '.48rem', letterSpacing: '1.3px'};
const existingGrid: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px'};
const thumbWrap: React.CSSProperties = {width: 100, height: 70, position: 'relative', border: '1px solid rgba(255,255,255,.1)', background: '#090909'};
const thumb: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};
const thumbDelete: React.CSSProperties = {position: 'absolute', top: 3, right: 3, width: 23, height: 23, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.8)', color: '#FF6874', border: '1px solid rgba(255,71,87,.3)', cursor: 'pointer'};
const uploadZone: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '11px', minHeight: 78, border: '1px dashed rgba(212,175,55,.28)', background: 'rgba(212,175,55,.025)', cursor: 'pointer', textAlign: 'left'};
const filePill: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 7px', background: '#090909', border: '1px solid rgba(255,255,255,.07)', color: '#888', fontSize: '.52rem'};
const footer: React.CSSProperties = {display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0};
const cancelButton: React.CSSProperties = {padding: '10px 17px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: '#777', fontFamily: 'inherit', fontSize: '.6rem', cursor: 'pointer'};
const saveButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', border: 0, color: '#000', fontFamily: 'Cinzel,serif', fontSize: '.6rem', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer'};

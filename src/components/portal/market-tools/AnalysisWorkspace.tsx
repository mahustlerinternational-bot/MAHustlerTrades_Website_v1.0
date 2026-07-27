'use client';

import {BookOpenCheck, Check, CircleAlert, Save, Send, Target} from 'lucide-react';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';

import type {EliteAnalysis, WorkspacePreferences} from '@/lib/market-tools/workspace';
import {authFetch} from '@/lib/utils/authFetch';

const CHECKS = [
  ['higherTimeframe', 'Higher-timeframe structure checked'],
  ['eventRisk', 'High-impact event risk checked'],
  ['riskDefined', 'Risk and invalidation defined'],
  ['rrAcceptable', 'Reward-to-risk is acceptable'],
  ['confirmation', 'Entry confirmation documented'],
] as const;

function parseLevels(value: string) {
  return [...new Set(value.split(/[,\n ]+/).map(Number).filter(item => Number.isFinite(item) && item > 0))].slice(0, 20);
}

function price(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function AnalysisWorkspace({
  analysis,
  interval,
  onAnalysis,
}: {
  analysis: EliteAnalysis;
  interval: WorkspacePreferences['interval'];
  onAnalysis: (update: Partial<EliteAnalysis>) => void;
}) {
  const [sending, setSending] = useState(false);
  const [journalTradeId, setJournalTradeId] = useState<string | null>(null);
  const rewardRisk = useMemo(() => {
    if (!analysis.entry || !analysis.stopLoss || !analysis.takeProfit1) return null;
    const risk = Math.abs(analysis.entry - analysis.stopLoss);
    return risk ? Math.abs(analysis.takeProfit1 - analysis.entry) / risk : null;
  }, [analysis.entry, analysis.stopLoss, analysis.takeProfit1]);

  const directionIssue = analysis.entry && analysis.stopLoss
    ? analysis.direction === 'buy' && analysis.stopLoss >= analysis.entry
      ? 'BUY stop must be below entry.'
      : analysis.direction === 'sell' && analysis.stopLoss <= analysis.entry
        ? 'SELL stop must be above entry.'
        : ''
    : '';
  const requiredReady = Boolean(
    analysis.entry &&
    analysis.stopLoss &&
    analysis.lotSize &&
    analysis.thesis.trim() &&
    !directionIssue,
  );

  async function sendToJournal() {
    if (!requiredReady) {
      toast.error('Complete entry, stop, lot size and analysis thesis first.');
      return;
    }
    setSending(true);
    try {
      const response = await authFetch('/api/me/journal/trades', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          symbol: 'XAUUSD',
          direction: analysis.direction,
          trade_status: 'open',
          opened_at: new Date().toISOString(),
          closed_at: null,
          entry_price: analysis.entry,
          exit_price: null,
          stop_loss: analysis.stopLoss,
          take_profit: analysis.takeProfit1,
          lot_size: analysis.lotSize,
          net_pnl: null,
          fees: 0,
          risk_amount: analysis.riskAmount,
          result_r: null,
          strategy: analysis.strategy,
          setup: analysis.setup,
          timeframe: interval === 'D' ? '1D' : interval === 'W' ? '1W' : `${interval}m`,
          session: analysis.session,
          market_condition: analysis.marketCondition,
          followed_plan: null,
          mistakes: [],
          tags: ['Elite Tools plan', analysis.bias],
          notes: [
            `Bias: ${analysis.bias}`,
            `Thesis: ${analysis.thesis}`,
            analysis.invalidation ? `Invalidation: ${analysis.invalidation}` : '',
            analysis.takeProfit2 ? `TP2: ${analysis.takeProfit2}` : '',
            analysis.takeProfit3 ? `TP3: ${analysis.takeProfit3}` : '',
            analysis.supportLevels.length ? `Support: ${analysis.supportLevels.join(', ')}` : '',
            analysis.resistanceLevels.length ? `Resistance: ${analysis.resistanceLevels.join(', ')}` : '',
          ].filter(Boolean).join('\n'),
          rating: null,
          external_ref: `elite-plan-${Date.now()}`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Trade plan could not be added to the journal');
      setJournalTradeId(result.id);
      toast.success('Trade plan added to My Trading Journal.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Trade plan could not be added');
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={panel}>
      <div style={header}>
        <div>
          <p style={eyebrow}>MEMBER-OWNED WORKSPACE</p>
          <h2 style={heading}><Target size={15} color="#D4AF37" /> Structured XAUUSD Trade Plan</h2>
        </div>
        <div style={saveHint}><Save size={12} /> Changes save automatically</div>
      </div>

      <div className="analysis-workspace-grid" style={layout}>
        <div style={formColumn}>
          <div className="analysis-three-column" style={threeColumn}>
            <Field label="MARKET BIAS">
              <select value={analysis.bias} onChange={event => onAnalysis({bias: event.target.value as EliteAnalysis['bias']})} style={input}>
                <option value="bullish">Bullish</option>
                <option value="neutral">Neutral</option>
                <option value="bearish">Bearish</option>
              </select>
            </Field>
            <Field label="DIRECTION">
              <select value={analysis.direction} onChange={event => onAnalysis({direction: event.target.value as EliteAnalysis['direction']})} style={input}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </Field>
            <Field label="SESSION">
              <input value={analysis.session} maxLength={40} onChange={event => onAnalysis({session: event.target.value})} placeholder="London / New York" style={input} />
            </Field>
            <Field label="STRATEGY">
              <input value={analysis.strategy} maxLength={100} onChange={event => onAnalysis({strategy: event.target.value})} placeholder="Your strategy" style={input} />
            </Field>
            <Field label="SETUP">
              <input value={analysis.setup} maxLength={120} onChange={event => onAnalysis({setup: event.target.value})} placeholder="OB + liquidity sweep" style={input} />
            </Field>
            <Field label="MARKET CONDITION">
              <input value={analysis.marketCondition} maxLength={80} onChange={event => onAnalysis({marketCondition: event.target.value})} placeholder="Trending / ranging" style={input} />
            </Field>
          </div>

          <div className="analysis-price-grid" style={priceGrid}>
            <NumberField label="ENTRY" value={analysis.entry} onChange={value => onAnalysis({entry: value})} />
            <NumberField label="STOP LOSS" value={analysis.stopLoss} onChange={value => onAnalysis({stopLoss: value})} />
            <NumberField label="TP1" value={analysis.takeProfit1} onChange={value => onAnalysis({takeProfit1: value})} />
            <NumberField label="TP2" value={analysis.takeProfit2} onChange={value => onAnalysis({takeProfit2: value})} />
            <NumberField label="TP3" value={analysis.takeProfit3} onChange={value => onAnalysis({takeProfit3: value})} />
            <NumberField label="LOT SIZE" value={analysis.lotSize} onChange={value => onAnalysis({lotSize: value})} />
            <NumberField label="RISK (USD)" value={analysis.riskAmount} onChange={value => onAnalysis({riskAmount: value})} />
          </div>
          {directionIssue && <div style={errorBox}><CircleAlert size={12} /> {directionIssue}</div>}

          <Field label="ANALYSIS THESIS">
            <textarea value={analysis.thesis} maxLength={4000} onChange={event => onAnalysis({thesis: event.target.value})} placeholder="What is the setup, evidence, trigger and expected path?" style={{...input, minHeight: 100, resize: 'vertical'}} />
          </Field>
          <Field label="INVALIDATION / DO-NOT-TRADE CONDITION">
            <textarea value={analysis.invalidation} maxLength={1500} onChange={event => onAnalysis({invalidation: event.target.value})} placeholder="What would invalidate this idea before or after entry?" style={{...input, minHeight: 70, resize: 'vertical'}} />
          </Field>

          <div className="analysis-two-column" style={twoColumn}>
            <LevelsField label="SUPPORT LEVELS (COMMA-SEPARATED)" levels={analysis.supportLevels} placeholder="4088, 4072" onChange={levels => onAnalysis({supportLevels: levels})} />
            <LevelsField label="RESISTANCE LEVELS (COMMA-SEPARATED)" levels={analysis.resistanceLevels} placeholder="4125, 4140" onChange={levels => onAnalysis({resistanceLevels: levels})} />
          </div>
        </div>

        <aside style={checkColumn}>
          <p style={asideTitle}>PRE-TRADE VALIDATION</p>
          <div style={{display: 'grid', gap: 7}}>
            {CHECKS.map(([id, label]) => {
              const checked = Boolean(analysis.checklist[id]);
              return (
                <button
                  key={id}
                  onClick={() => onAnalysis({checklist: {...analysis.checklist, [id]: !checked}})}
                  aria-pressed={checked}
                  style={{...checkRow, color: checked ? '#DADADA' : '#777'}}
                >
                  <span style={{...checkBox, borderColor: checked ? '#34D399' : '#444', background: checked ? 'rgba(52,211,153,.12)' : '#090909'}}>
                    {checked && <Check size={11} color="#34D399" />}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>

          <div style={metricBox}>
            <span>TP1 REWARD : RISK</span>
            <strong>{rewardRisk === null ? '—' : `1 : ${rewardRisk.toFixed(2)}`}</strong>
          </div>
          <div style={metricBox}>
            <span>CHECKLIST</span>
            <strong>{Object.values(analysis.checklist).filter(Boolean).length} / {CHECKS.length}</strong>
          </div>

          <button disabled={sending || !requiredReady} onClick={() => void sendToJournal()} style={{...sendButton, opacity: sending || !requiredReady ? .45 : 1}}>
            <Send size={13} /> {sending ? 'SENDING…' : 'SEND PLAN TO JOURNAL'}
          </button>
          {journalTradeId && (
            <Link href="/portal/trading-journal" style={journalLink}><BookOpenCheck size={13} /> Open My Trading Journal</Link>
          )}
          <p style={asideNote}>
            This creates an <strong>open trade plan</strong>, not an executed or closed trade. Complete the result later inside My Trading Journal.
          </p>
          <p style={asideNote}>
            Chart drawings remain inside TradingView’s iframe and cannot be read by this site. Use the chart’s image button, then attach that screenshot to the journal trade.
          </p>
        </aside>
      </div>
    </section>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label style={{display: 'block', marginBottom: 11}}><span style={fieldLabel}>{label}</span>{children}</label>;
}

function NumberField({label, value, onChange}: {label: string; value: number | null; onChange: (value: number | null) => void}) {
  return (
    <Field label={label}>
      <input type="number" min="0" step="any" inputMode="decimal" value={value ?? ''} onChange={event => onChange(price(event.target.value))} style={input} />
    </Field>
  );
}

function LevelsField({label, levels, placeholder, onChange}: {
  label: string;
  levels: number[];
  placeholder: string;
  onChange: (levels: number[]) => void;
}) {
  const [draft, setDraft] = useState(() => levels.join(', '));
  return (
    <Field label={label}>
      <input
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = parseLevels(draft);
          setDraft(parsed.join(', '));
          onChange(parsed);
        }}
        placeholder={placeholder}
        style={input}
      />
    </Field>
  );
}

const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.065)'};
const header: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '13px 15px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const eyebrow: React.CSSProperties = {fontSize: '.45rem', letterSpacing: '2.4px', color: '#D4AF37', marginBottom: 4};
const heading: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Cinzel,serif', fontSize: '.82rem'};
const saveHint: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 5, color: '#626262', fontSize: '.49rem'};
const layout: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 285px'};
const formColumn: React.CSSProperties = {padding: 16, borderRight: '1px solid rgba(255,255,255,.05)'};
const checkColumn: React.CSSProperties = {padding: 16, background: '#0C0C0C'};
const threeColumn: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '0 9px'};
const priceGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '0 8px'};
const twoColumn: React.CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9};
const fieldLabel: React.CSSProperties = {display: 'block', marginBottom: 5, color: '#666', fontSize: '.45rem', letterSpacing: '1.2px'};
const input: React.CSSProperties = {width: '100%', border: '1px solid rgba(255,255,255,.095)', background: '#090909', color: '#DDD', padding: '9px 10px', fontFamily: 'Montserrat,sans-serif', fontSize: '.6rem', outline: 'none'};
const asideTitle: React.CSSProperties = {fontFamily: 'Cinzel,serif', color: '#D4AF37', fontSize: '.57rem', letterSpacing: '1.6px', marginBottom: 11};
const checkRow: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 7, width: '100%', border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: '.54rem', textAlign: 'left', cursor: 'pointer'};
const checkBox: React.CSSProperties = {width: 19, height: 19, flexShrink: 0, display: 'grid', placeItems: 'center', border: '1px solid'};
const metricBox: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 10, padding: '9px 10px', background: '#090909', border: '1px solid rgba(255,255,255,.05)', color: '#666', fontSize: '.48rem'};
const sendButton: React.CSSProperties = {width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: 10, border: '1px solid #D4AF37', background: '#D4AF37', color: '#080808', fontFamily: 'Cinzel,serif', fontSize: '.53rem', fontWeight: 800, cursor: 'pointer'};
const journalLink: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 7, padding: 8, border: '1px solid rgba(52,211,153,.25)', color: '#34D399', textDecoration: 'none', fontSize: '.5rem'};
const asideNote: React.CSSProperties = {color: '#535353', fontSize: '.49rem', lineHeight: 1.65, marginTop: 11};
const errorBox: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 6, color: '#FF6874', background: 'rgba(255,83,100,.05)', border: '1px solid rgba(255,83,100,.18)', padding: 8, fontSize: '.52rem', marginBottom: 11};

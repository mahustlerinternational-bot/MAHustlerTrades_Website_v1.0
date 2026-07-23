'use client';

import {Calculator, ChevronDown, ShieldAlert} from 'lucide-react';
import {useMemo, useState} from 'react';

import {calculateXauPosition, type TradeDirection} from '@/lib/market-tools/calculations';

function money(value: number) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2}).format(value);
}

function NumericField({label, value, onChange, step = 'any', hint}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  hint?: string;
}) {
  return (
    <label style={{display: 'block'}}>
      <span style={fieldLabel}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={event => onChange(event.target.value)}
        style={input}
      />
      {hint && <small style={{display: 'block', color: '#535353', fontSize: '.5rem', marginTop: '4px'}}>{hint}</small>}
    </label>
  );
}

export default function XauRiskCalculator() {
  const [direction, setDirection] = useState<TradeDirection>('buy');
  const [balance, setBalance] = useState('10000');
  const [risk, setRisk] = useState('1');
  const [entry, setEntry] = useState('4100');
  const [stop, setStop] = useState('4090');
  const [target, setTarget] = useState('4120');
  const [contractSize, setContractSize] = useState('100');
  const [minimumLot, setMinimumLot] = useState('0.01');
  const [lotStep, setLotStep] = useState('0.01');
  const [advanced, setAdvanced] = useState(false);

  const result = useMemo(() => calculateXauPosition({
    balance: Number(balance),
    riskPercent: Number(risk),
    entry: Number(entry),
    stopLoss: Number(stop),
    takeProfit: target ? Number(target) : null,
    contractSize: Number(contractSize),
    minimumLot: Number(minimumLot),
    lotStep: Number(lotStep),
  }), [balance, contractSize, entry, lotStep, minimumLot, risk, stop, target]);

  const directionalError =
    direction === 'buy' && Number(stop) >= Number(entry)
      ? 'For a BUY plan, stop loss should be below entry.'
      : direction === 'sell' && Number(stop) <= Number(entry)
        ? 'For a SELL plan, stop loss should be above entry.'
        : direction === 'buy' && target && Number(target) <= Number(entry)
          ? 'For a BUY plan, take profit should be above entry.'
          : direction === 'sell' && target && Number(target) >= Number(entry)
            ? 'For a SELL plan, take profit should be below entry.'
            : '';
  const warning = directionalError || result.error ||
    (result.belowMinimum ? 'Calculated size is below the broker minimum. Do not round up without accepting more risk.' : '');

  return (
    <section style={panel}>
      <div style={panelHead}>
        <div>
          <p style={eyebrow}>POSITION PLANNING</p>
          <h2 style={heading}><Calculator size={17} color="#D4AF37" /> XAUUSD Risk & Lot-Size Calculator</h2>
        </div>
        <span style={estimateBadge}>ESTIMATE ONLY</span>
      </div>

      <div className="risk-calculator-layout" style={calculatorLayout}>
        <div style={formSide}>
          <div style={directionToggle}>
            {(['buy', 'sell'] as TradeDirection[]).map(option => (
              <button
                key={option}
                onClick={() => {
                  setDirection(option);
                  if (option === 'buy') {
                    if (Number(stop) >= Number(entry)) setStop(String(Number(entry) - 10));
                    if (target && Number(target) <= Number(entry)) setTarget(String(Number(entry) + 20));
                  } else {
                    if (Number(stop) <= Number(entry)) setStop(String(Number(entry) + 10));
                    if (target && Number(target) >= Number(entry)) setTarget(String(Number(entry) - 20));
                  }
                }}
                style={{
                  ...directionButton,
                  color: direction === option ? (option === 'buy' ? '#34D399' : '#FF6874') : '#666',
                  background: direction === option ? (option === 'buy' ? 'rgba(52,211,153,.07)' : 'rgba(255,71,87,.07)') : 'transparent',
                  borderColor: direction === option ? (option === 'buy' ? 'rgba(52,211,153,.28)' : 'rgba(255,71,87,.28)') : 'rgba(255,255,255,.06)',
                }}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="risk-field-grid" style={fieldGrid}>
            <NumericField label="ACCOUNT BALANCE (USD)" value={balance} onChange={setBalance} step="100" />
            <NumericField label="RISK PER TRADE (%)" value={risk} onChange={setRisk} step="0.1" />
            <NumericField label="ENTRY PRICE" value={entry} onChange={setEntry} step="0.01" />
            <NumericField label="STOP LOSS" value={stop} onChange={setStop} step="0.01" />
            <NumericField label="TAKE PROFIT (OPTIONAL)" value={target} onChange={setTarget} step="0.01" />
          </div>

          <button onClick={() => setAdvanced(current => !current)} style={advancedButton}>
            Broker specifications <ChevronDown size={13} style={{transform: advanced ? 'rotate(180deg)' : 'none', transition: 'transform .2s'}} />
          </button>
          {advanced && (
            <div className="risk-advanced-grid" style={advancedGrid}>
              <NumericField label="CONTRACT SIZE" value={contractSize} onChange={setContractSize} hint="Default: 100 troy oz per 1.00 lot" />
              <NumericField label="MINIMUM LOT" value={minimumLot} onChange={setMinimumLot} step="0.01" />
              <NumericField label="LOT STEP" value={lotStep} onChange={setLotStep} step="0.01" />
            </div>
          )}

          {warning && (
            <div style={warningBox}><ShieldAlert size={14} /> {warning}</div>
          )}
          {Number(risk) > 2 && (
            <div style={{...warningBox, color: '#F59E0B', borderColor: 'rgba(245,158,11,.2)', background: 'rgba(245,158,11,.05)'}}>
              <ShieldAlert size={14} /> Selected risk is above 2% of account balance.
            </div>
          )}
        </div>

        <div style={resultSide}>
          <p style={{fontSize: '.52rem', letterSpacing: '2.5px', color: '#777'}}>CALCULATED POSITION</p>
          <div style={primaryResult}>
            <span style={{fontSize: '.58rem', color: '#777'}}>RECOMMENDED SIZE</span>
            <strong style={{fontFamily: 'Cinzel,serif', fontSize: '2.25rem', color: result.recommendedLots > 0 ? '#D4AF37' : '#666'}}>
              {result.recommendedLots.toFixed(Math.min(8, Math.max(2, String(lotStep).split('.')[1]?.length ?? 0)))}
            </strong>
            <span style={{fontSize: '.62rem', letterSpacing: '2px', color: '#888'}}>LOTS</span>
          </div>
          <div style={resultGrid}>
            <Result label="Risk budget" value={money(result.riskBudget)} />
            <Result label="Actual risk" value={`${money(result.actualRisk)} · ${result.actualRiskPercent.toFixed(2)}%`} />
            <Result label="Stop distance" value={`$${result.stopDistance.toFixed(2)} · ${result.stopPoints.toFixed(0)} pts`} />
            <Result label="Gold exposure" value={`${result.exposureOunces.toFixed(2)} oz`} />
            <Result label="Reward : risk" value={result.rewardRiskRatio === null ? '—' : `1 : ${result.rewardRiskRatio.toFixed(2)}`} />
            <Result label="Projected profit" value={result.projectedProfit === null ? '—' : money(result.projectedProfit)} />
          </div>
          <p style={formula}>
            Size = risk budget ÷ (entry-to-stop distance × contract size). The result is rounded down to the selected broker lot step so the target risk is not exceeded.
          </p>
        </div>
      </div>
      <div style={disclaimer}>
        Calculator results are estimates, not financial advice or an order instruction. XAUUSD contract size, tick value, spread, commission, currency conversion and minimum volume vary by broker. Confirm the symbol specification in MT5 before trading.
      </div>
    </section>
  );
}

function Result({label, value}: {label: string; value: string}) {
  return (
    <div style={resultCard}>
      <span style={{fontSize: '.5rem', letterSpacing: '1.3px', color: '#5D5D5D'}}>{label.toUpperCase()}</span>
      <strong style={{fontFamily: 'JetBrains Mono,monospace', fontSize: '.72rem', color: '#D7D7D7', marginTop: '5px'}}>{value}</strong>
    </div>
  );
}

const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)'};
const panelHead: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', flexWrap: 'wrap'};
const eyebrow: React.CSSProperties = {fontSize: '.52rem', letterSpacing: '3px', color: '#D4AF37', marginBottom: '5px'};
const heading: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'};
const estimateBadge: React.CSSProperties = {fontSize: '.48rem', letterSpacing: '1.5px', color: '#777', border: '1px solid rgba(255,255,255,.08)', padding: '5px 8px'};
const calculatorLayout: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(300px,.85fr)'};
const formSide: React.CSSProperties = {padding: '20px', borderRight: '1px solid rgba(255,255,255,.05)'};
const resultSide: React.CSSProperties = {padding: '20px', background: '#0D0D0D'};
const directionToggle: React.CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '16px'};
const directionButton: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.62rem', letterSpacing: '2px', padding: '9px', border: '1px solid', cursor: 'pointer'};
const fieldGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px'};
const fieldLabel: React.CSSProperties = {display: 'block', fontSize: '.5rem', letterSpacing: '1.5px', color: '#777', marginBottom: '6px'};
const input: React.CSSProperties = {width: '100%', background: '#090909', border: '1px solid rgba(255,255,255,.09)', color: '#fff', padding: '10px 11px', fontFamily: 'JetBrains Mono,monospace', fontSize: '.72rem', outline: 'none'};
const advancedButton: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '6px', marginTop: '15px', background: 'none', border: 'none', color: '#777', fontFamily: 'inherit', fontSize: '.58rem', cursor: 'pointer', padding: 0};
const advancedGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '10px', marginTop: '12px', padding: '12px', border: '1px solid rgba(255,255,255,.05)', background: '#0C0C0C'};
const warningBox: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: '7px', marginTop: '12px', border: '1px solid rgba(255,71,87,.2)', background: 'rgba(255,71,87,.05)', color: '#FF6874', padding: '9px 10px', fontSize: '.57rem', lineHeight: 1.5};
const primaryResult: React.CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px', borderBottom: '1px solid rgba(255,255,255,.05)'};
const resultGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginTop: '14px'};
const resultCard: React.CSSProperties = {display: 'flex', flexDirection: 'column', padding: '10px', background: '#090909', border: '1px solid rgba(255,255,255,.045)'};
const formula: React.CSSProperties = {fontSize: '.53rem', color: '#555', lineHeight: 1.65, marginTop: '13px'};
const disclaimer: React.CSSProperties = {padding: '12px 20px', background: 'rgba(212,175,55,.025)', borderTop: '1px solid rgba(212,175,55,.08)', color: '#5C5C5C', fontSize: '.52rem', lineHeight: 1.65};

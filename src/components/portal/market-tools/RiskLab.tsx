'use client';

import {BarChart3, Calculator, Gauge, Layers3, RefreshCcw} from 'lucide-react';
import {useMemo, useState} from 'react';

import {
  calculateDrawdownRecovery,
  calculateExpectancy,
  calculatePortfolioRisk,
  calculateTradeOutcome,
  simulateDrawdownRisk,
  type TradeDirection,
} from '@/lib/market-tools/calculations';
import type {WorkspacePreferences} from '@/lib/market-tools/workspace';

import XauRiskCalculator from './XauRiskCalculator';

function number(value: string) {
  return Number(value);
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2}).format(value);
}

export default function RiskLab({
  riskSettings,
  onRiskSettings,
}: {
  riskSettings: WorkspacePreferences['risk'];
  onRiskSettings: (settings: WorkspacePreferences['risk']) => void;
}) {
  return (
    <div style={{display: 'grid', gap: 12}}>
      <XauRiskCalculator initialSettings={riskSettings} onSettingsChange={onRiskSettings} />
      <div className="risk-lab-grid" style={grid}>
        <OutcomeCalculator />
        <RecoveryCalculator />
        <ExpectancyCalculator />
        <PortfolioCalculator />
        <AtrCalculator />
      </div>
      <div style={disclaimer}>
        Risk Lab outputs are educational estimates. Monte Carlo results are simulations—not forecasts—and depend entirely on the assumptions entered. Broker contract size, conversion, commission, swap, slippage and correlated exposure can materially change real results.
      </div>
    </div>
  );
}

function OutcomeCalculator() {
  const [direction, setDirection] = useState<TradeDirection>('buy');
  const [entry, setEntry] = useState('4100');
  const [exit, setExit] = useState('4120');
  const [lots, setLots] = useState('0.10');
  const [costs, setCosts] = useState('2');
  const result = useMemo(() => calculateTradeOutcome({
    direction,
    entry: number(entry),
    exit: number(exit),
    lotSize: number(lots),
    costs: number(costs),
  }), [costs, direction, entry, exit, lots]);
  return (
    <ToolCard icon={<Calculator size={14} />} eyebrow="TRADE OUTCOME" title="Profit / Loss">
      <div style={two}>
        <SelectField label="DIRECTION" value={direction} onChange={value => setDirection(value as TradeDirection)} options={['buy', 'sell']} />
        <InputField label="LOT SIZE" value={lots} onChange={setLots} />
        <InputField label="ENTRY" value={entry} onChange={setEntry} />
        <InputField label="EXIT" value={exit} onChange={setExit} />
        <InputField label="COSTS (USD)" value={costs} onChange={setCosts} />
      </div>
      <Metrics values={[
        ['Gross P&L', result ? money(result.gross) : '—'],
        ['Net P&L', result ? money(result.net) : '—'],
        ['Price move', result ? result.priceMove.toFixed(2) : '—'],
      ]} />
    </ToolCard>
  );
}

function RecoveryCalculator() {
  const [drawdown, setDrawdown] = useState('20');
  const recovery = calculateDrawdownRecovery(number(drawdown));
  return (
    <ToolCard icon={<RefreshCcw size={14} />} eyebrow="CAPITAL RECOVERY" title="Drawdown Recovery">
      <InputField label="DRAWDOWN (%)" value={drawdown} onChange={setDrawdown} />
      <div style={heroMetric}>
        <span>GAIN REQUIRED TO RECOVER</span>
        <strong>{recovery === null ? '—' : `${recovery.toFixed(2)}%`}</strong>
      </div>
      <p style={note}>A 50% loss requires a 100% gain to return to the starting balance.</p>
    </ToolCard>
  );
}

function ExpectancyCalculator() {
  const [winRate, setWinRate] = useState('55');
  const [avgWin, setAvgWin] = useState('1.5');
  const [avgLoss, setAvgLoss] = useState('1');
  const [risk, setRisk] = useState('1');
  const [trades, setTrades] = useState('100');
  const [limit, setLimit] = useState('20');
  const expectancy = calculateExpectancy({
    winRatePercent: number(winRate),
    averageWinR: number(avgWin),
    averageLossR: number(avgLoss),
  });
  const simulation = simulateDrawdownRisk({
    winRatePercent: number(winRate),
    averageWinR: number(avgWin),
    averageLossR: number(avgLoss),
    riskPercent: number(risk),
    trades: number(trades),
    drawdownLimitPercent: number(limit),
  });
  return (
    <ToolCard wide icon={<BarChart3 size={14} />} eyebrow="EXPECTANCY & SIMULATION" title="Risk of Drawdown">
      <div className="simulation-fields" style={three}>
        <InputField label="WIN RATE (%)" value={winRate} onChange={setWinRate} />
        <InputField label="AVERAGE WIN (R)" value={avgWin} onChange={setAvgWin} />
        <InputField label="AVERAGE LOSS (R)" value={avgLoss} onChange={setAvgLoss} />
        <InputField label="RISK / TRADE (%)" value={risk} onChange={setRisk} />
        <InputField label="TRADES" value={trades} onChange={setTrades} />
        <InputField label="DRAWDOWN LIMIT (%)" value={limit} onChange={setLimit} />
      </div>
      <Metrics values={[
        ['Expectancy', expectancy ? `${expectancy.expectancyR >= 0 ? '+' : ''}${expectancy.expectancyR.toFixed(3)}R` : '—'],
        ['Break-even win rate', expectancy ? `${expectancy.breakevenWinRate.toFixed(2)}%` : '—'],
        ['Limit breach chance', simulation ? `${simulation.breachProbability.toFixed(1)}%` : '—'],
        ['Median ending index', simulation ? simulation.medianEndingBalance.toFixed(1) : '—'],
      ]} />
      <p style={note}>Deterministic 4,000-path Monte Carlo model over the entered number of trades. “Ending index” starts at 100.</p>
    </ToolCard>
  );
}

function PortfolioCalculator() {
  const [risks, setRisks] = useState('1, 0.5, 1');
  const parsed = risks.split(',').map(item => Number(item.trim()));
  const result = calculatePortfolioRisk(parsed);
  return (
    <ToolCard icon={<Layers3 size={14} />} eyebrow="COMBINED EXPOSURE" title="Portfolio Risk">
      <label style={{display: 'block'}}>
        <span style={fieldLabel}>OPEN-TRADE RISKS % (COMMA-SEPARATED)</span>
        <input value={risks} onChange={event => setRisks(event.target.value)} style={input} />
      </label>
      <Metrics values={[
        ['Worst-case combined', result ? `${result.maximumCombinedRisk.toFixed(2)}%` : '—'],
        ['Independent estimate', result ? `${result.independentRiskEstimate.toFixed(2)}%` : '—'],
      ]} />
      <p style={note}>Use worst-case risk when positions may be correlated. The independent estimate is not appropriate for trades driven by the same USD or risk factor.</p>
    </ToolCard>
  );
}

function AtrCalculator() {
  const [price, setPrice] = useState('4100');
  const [atr, setAtr] = useState('25');
  const [used, setUsed] = useState('40');
  const remaining = Math.max(0, number(atr) * (1 - number(used) / 100));
  return (
    <ToolCard icon={<Gauge size={14} />} eyebrow="EXPECTED RANGE" title="ATR Planner">
      <div style={two}>
        <InputField label="CURRENT PRICE" value={price} onChange={setPrice} />
        <InputField label="DAILY ATR ($)" value={atr} onChange={setAtr} />
        <InputField label="RANGE USED (%)" value={used} onChange={setUsed} />
      </div>
      <Metrics values={[
        ['ATR upper reference', Number.isFinite(number(price) + number(atr)) ? (number(price) + number(atr)).toFixed(2) : '—'],
        ['ATR lower reference', Number.isFinite(number(price) - number(atr)) ? (number(price) - number(atr)).toFixed(2) : '—'],
        ['Unconsumed range', Number.isFinite(remaining) ? `$${remaining.toFixed(2)}` : '—'],
      ]} />
      <p style={note}>ATR describes historical range, not direction or a guaranteed boundary.</p>
    </ToolCard>
  );
}

function ToolCard({icon, eyebrow, title, wide = false, children}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={{...card, gridColumn: wide ? 'span 2' : undefined}}>
      <div style={cardHeader}>
        <span style={cardIcon}>{icon}</span>
        <div><p style={eyebrowStyle}>{eyebrow}</p><h3 style={cardTitle}>{title}</h3></div>
      </div>
      <div style={{padding: 14}}>{children}</div>
    </section>
  );
}

function InputField({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  return (
    <label style={{display: 'block'}}>
      <span style={fieldLabel}>{label}</span>
      <input type="number" inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} style={input} />
    </label>
  );
}

function SelectField({label, value, options, onChange}: {label: string; value: string; options: string[]; onChange: (value: string) => void}) {
  return (
    <label style={{display: 'block'}}>
      <span style={fieldLabel}>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={input}>
        {options.map(option => <option key={option} value={option}>{option.toUpperCase()}</option>)}
      </select>
    </label>
  );
}

function Metrics({values}: {values: [string, string][]}) {
  return (
    <div style={metricGrid}>
      {values.map(([label, value]) => (
        <div key={label} style={metric}>
          <span>{label.toUpperCase()}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

const grid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12};
const card: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.065)', minWidth: 0};
const cardHeader: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,.05)'};
const cardIcon: React.CSSProperties = {display: 'grid', placeItems: 'center', width: 28, height: 28, border: '1px solid rgba(212,175,55,.2)', color: '#D4AF37'};
const eyebrowStyle: React.CSSProperties = {fontSize: '.4rem', letterSpacing: '1.8px', color: '#777', marginBottom: 2};
const cardTitle: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.68rem'};
const two: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8};
const three: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8};
const fieldLabel: React.CSSProperties = {display: 'block', color: '#5F5F5F', fontSize: '.43rem', letterSpacing: '1px', marginBottom: 4};
const input: React.CSSProperties = {width: '100%', background: '#090909', border: '1px solid rgba(255,255,255,.09)', color: '#DDD', padding: '8px 9px', fontFamily: 'JetBrains Mono,monospace', fontSize: '.58rem', outline: 'none'};
const metricGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6, marginTop: 11};
const metric: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 4, background: '#090909', border: '1px solid rgba(255,255,255,.05)', padding: 8, color: '#5B5B5B', fontSize: '.42rem'};
const heroMetric: React.CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, marginTop: 10, background: '#090909', color: '#666', fontSize: '.45rem'};
const note: React.CSSProperties = {color: '#505050', fontSize: '.47rem', lineHeight: 1.6, marginTop: 10};
const disclaimer: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: 7, border: '1px solid rgba(212,175,55,.1)', background: 'rgba(212,175,55,.025)', color: '#5C5C5C', padding: 10, fontSize: '.5rem', lineHeight: 1.65};

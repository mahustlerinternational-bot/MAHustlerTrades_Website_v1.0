'use client';

import {Activity, Flame, Network, Radar} from 'lucide-react';
import {useEffect, useState} from 'react';

import type {WorkspacePreferences} from '@/lib/market-tools/workspace';
import {authFetch} from '@/lib/utils/authFetch';

import ForexHeatmap from './ForexHeatmap';
import TradingViewWidget from './TradingViewWidget';

type Regime = {
  active_regime?: string;
  recorded_at?: string;
  accumulation_pct?: number | string;
  trending_pct?: number | string;
  distribution_pct?: number | string;
  ranging_pct?: number | string;
  source?: string;
};

const RELATIONSHIPS = [
  {driver: 'US Dollar Index', symbol: 'DXY', usual: 'Often inverse', caveat: 'Can strengthen together during acute risk aversion'},
  {driver: 'US 10Y Yield', symbol: 'US10Y', usual: 'Often inverse', caveat: 'Nominal yield is not the same as real yield'},
  {driver: 'Silver', symbol: 'XAGUSD', usual: 'Often positive', caveat: 'Industrial-demand sensitivity can cause divergence'},
  {driver: 'S&P 500', symbol: 'SPX', usual: 'Regime-dependent', caveat: 'Risk-on/off relationship changes over time'},
  {driver: 'Bitcoin', symbol: 'BTCUSD', usual: 'Unstable', caveat: 'Do not assume a persistent safe-haven relationship'},
] as const;

export default function MarketIntelligence({
  preferences,
  onPreferences,
}: {
  preferences: WorkspacePreferences;
  onPreferences: (update: Partial<WorkspacePreferences>) => void;
}) {
  const [regime, setRegime] = useState<Regime | null>(null);
  const [regimeError, setRegimeError] = useState(false);

  useEffect(() => {
    authFetch('/api/quant/regime')
      .then(async response => {
        if (!response.ok) throw new Error('Regime unavailable');
        setRegime(await response.json());
      })
      .catch(() => setRegimeError(true));
  }, []);

  return (
    <div style={{display: 'grid', gap: 12}}>
      <div className="intelligence-top-grid" style={topGrid}>
        <section style={panel}>
          <PanelHeader eyebrow="MAHUSTLER QUANT FEED" title="Market Regime" icon={<Radar size={15} />} />
          <div style={{padding: 14}}>
            {regime ? (
              <>
                <div style={regimeHeadline}>
                  <span>ACTIVE CLASSIFICATION</span>
                  <strong>{regime.active_regime ?? 'Unknown'}</strong>
                </div>
                {[
                  ['Accumulation', regime.accumulation_pct, '#8FAFE8'],
                  ['Trending', regime.trending_pct, '#34D399'],
                  ['Distribution', regime.distribution_pct, '#FF6874'],
                  ['Ranging', regime.ranging_pct, '#D4AF37'],
                ].map(([label, raw, color]) => {
                  const value = Math.max(0, Math.min(100, Number(raw) || 0));
                  return (
                    <div key={String(label)} style={{marginTop: 9}}>
                      <div style={barLabel}><span>{label}</span><strong style={{color: String(color)}}>{value.toFixed(1)}%</strong></div>
                      <div style={barTrack}><div style={{height: '100%', width: `${value}%`, background: String(color)}} /></div>
                    </div>
                  );
                })}
                <p style={finePrint}>Source: {regime.source ?? 'system'} · {regime.recorded_at ? new Date(regime.recorded_at).toLocaleString() : 'timestamp unavailable'}</p>
              </>
            ) : (
              <div style={empty}>{regimeError ? 'Regime feed unavailable.' : 'No verified regime update has been published.'}</div>
            )}
          </div>
        </section>

        <section style={panel}>
          <PanelHeader eyebrow="RELATIONSHIP REFERENCE" title="Gold Driver Matrix" icon={<Network size={15} />} />
          <div style={{overflowX: 'auto'}}>
            <table style={matrixTable}>
              <thead><tr><th style={th}>DRIVER</th><th style={th}>COMMON PATTERN</th><th style={th}>IMPORTANT LIMIT</th></tr></thead>
              <tbody>
                {RELATIONSHIPS.map(item => (
                  <tr key={item.symbol} style={tr}>
                    <td style={td}><strong style={{color: '#DDD'}}>{item.symbol}</strong><span style={{display: 'block', color: '#555', marginTop: 2}}>{item.driver}</span></td>
                    <td style={{...td, color: item.usual === 'Often inverse' ? '#FF9A75' : item.usual === 'Often positive' ? '#63D9A5' : '#D4AF37'}}>{item.usual}</td>
                    <td style={td}>{item.caveat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={matrixNote}>This is a relationship guide—not a live correlation coefficient. Correlations change by sample period and regime; confirm them on the live comparison chart.</p>
        </section>
      </div>

      <section style={panel}>
        <div style={headerWithActions}>
          <PanelHeader eyebrow="CROSS-MARKET STRENGTH" title="Market Heatmaps" icon={<Flame size={15} />} embedded />
          <div style={segments} role="group" aria-label="Heatmap market">
            {(['forex', 'stocks', 'crypto'] as const).map(item => (
              <button
                key={item}
                onClick={() => onPreferences({heatmap: item})}
                aria-pressed={preferences.heatmap === item}
                style={{...segment, ...(preferences.heatmap === item ? segmentActive : {})}}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {preferences.heatmap === 'forex' && <ForexHeatmap />}
        {preferences.heatmap === 'stocks' && (
          <TradingViewWidget
            scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
            config={{
              dataSource: 'SPX500',
              blockSize: 'market_cap_basic',
              blockColor: 'change',
              grouping: 'sector',
              locale: 'en',
              colorTheme: 'dark',
              hasTopBar: true,
              isDataSetEnabled: true,
              isZoomEnabled: true,
              hasSymbolTooltip: true,
              width: '100%',
              height: '100%',
            }}
            label="Stock Heatmap"
            attributionUrl="https://www.tradingview.com/heatmap/stock/"
            height={600}
          />
        )}
        {preferences.heatmap === 'crypto' && (
          <TradingViewWidget
            scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js"
            config={{
              dataSource: 'Crypto',
              blockSize: 'market_cap_calc',
              blockColor: '24h_close_change|5',
              locale: 'en',
              colorTheme: 'dark',
              hasTopBar: true,
              isDataSetEnabled: true,
              isZoomEnabled: true,
              hasSymbolTooltip: true,
              width: '100%',
              height: '100%',
            }}
            label="Crypto Heatmap"
            attributionUrl="https://www.tradingview.com/heatmap/crypto/"
            height={600}
          />
        )}
      </section>

      <section style={panel}>
        <PanelHeader eyebrow="MULTI-TIMEFRAME SNAPSHOT" title="XAUUSD Technical Summary" icon={<Activity size={15} />} />
        <TradingViewWidget
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
          config={{
            interval: '1h',
            width: '100%',
            isTransparent: true,
            height: '100%',
            symbol: 'OANDA:XAUUSD',
            showIntervalTabs: true,
            displayMode: 'multiple',
            locale: 'en',
            colorTheme: 'dark',
          }}
          label="XAUUSD Technical Analysis"
          attributionUrl="https://www.tradingview.com/symbols/XAUUSD/technicals/"
          height={500}
        />
        <p style={matrixNote}>Indicator summaries are mechanical readings, not MAHustler signals or financial advice. Validate market structure, event risk and your own plan.</p>
      </section>
    </div>
  );
}

function PanelHeader({eyebrow, title, icon, embedded = false}: {eyebrow: string; title: string; icon: React.ReactNode; embedded?: boolean}) {
  return (
    <div style={{...panelHeader, borderBottom: embedded ? 0 : panelHeader.borderBottom}}>
      <div>
        <p style={eyebrowStyle}>{eyebrow}</p>
        <h2 style={heading}><span style={{color: '#D4AF37'}}>{icon}</span>{title}</h2>
      </div>
    </div>
  );
}

const topGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(280px,.75fr) minmax(0,1.25fr)', gap: 12};
const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.065)', minWidth: 0};
const panelHeader: React.CSSProperties = {padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const eyebrowStyle: React.CSSProperties = {fontSize: '.44rem', letterSpacing: '2.2px', color: '#D4AF37', marginBottom: 4};
const heading: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Cinzel,serif', fontSize: '.78rem'};
const regimeHeadline: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: '#666', fontSize: '.46rem', letterSpacing: '1px', marginBottom: 12};
const barLabel: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', color: '#777', fontSize: '.52rem', marginBottom: 4};
const barTrack: React.CSSProperties = {height: 4, background: '#080808', overflow: 'hidden'};
const finePrint: React.CSSProperties = {marginTop: 13, color: '#505050', fontSize: '.47rem', lineHeight: 1.5};
const empty: React.CSSProperties = {display: 'grid', placeItems: 'center', minHeight: 170, color: '#5B5B5B', fontSize: '.57rem'};
const matrixTable: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', fontSize: '.52rem'};
const th: React.CSSProperties = {textAlign: 'left', padding: '8px 10px', color: '#555', fontSize: '.43rem', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,.05)'};
const tr: React.CSSProperties = {borderBottom: '1px solid rgba(255,255,255,.04)'};
const td: React.CSSProperties = {padding: '8px 10px', color: '#777', lineHeight: 1.45};
const matrixNote: React.CSSProperties = {padding: '9px 12px', color: '#555', fontSize: '.49rem', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,.04)'};
const headerWithActions: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.055)'};
const segments: React.CSSProperties = {display: 'flex', gap: 3, marginRight: 12};
const segment: React.CSSProperties = {border: '1px solid transparent', background: 'transparent', color: '#666', padding: '6px 8px', fontFamily: 'inherit', fontSize: '.48rem', cursor: 'pointer'};
const segmentActive: React.CSSProperties = {borderColor: 'rgba(212,175,55,.25)', background: 'rgba(212,175,55,.06)', color: '#D4AF37'};

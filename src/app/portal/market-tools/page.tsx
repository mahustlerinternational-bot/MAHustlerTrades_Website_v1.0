'use client';

import {
  BarChart3,
  CalendarDays,
  Calculator,
  CandlestickChart,
  Flame,
  Globe2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';

import ForexHeatmap from '@/components/portal/market-tools/ForexHeatmap';
import MarketSessionClock from '@/components/portal/market-tools/MarketSessionClock';
import TradingViewWidget from '@/components/portal/market-tools/TradingViewWidget';
import XauRiskCalculator from '@/components/portal/market-tools/XauRiskCalculator';
import {authFetch} from '@/lib/utils/authFetch';

type ToolTab = 'chart' | 'calendar' | 'heatmaps' | 'sessions-risk';
type HeatmapTab = 'forex' | 'stocks' | 'crypto';

const TOOL_TABS: {id: ToolTab; label: string; description: string; icon: React.ReactNode}[] = [
  {id: 'chart', label: 'XAUUSD Chart', description: 'Live charting workspace', icon: <CandlestickChart size={15} />},
  {id: 'calendar', label: 'Economic Calendar', description: 'Macro event schedule', icon: <CalendarDays size={15} />},
  {id: 'heatmaps', label: 'Market Heatmaps', description: 'Cross-market strength', icon: <Flame size={15} />},
  {id: 'sessions-risk', label: 'Sessions & Risk', description: 'Timing and position size', icon: <Calculator size={15} />},
];

const INTERVALS = [
  {label: '15M', value: '15'},
  {label: '1H', value: '60'},
  {label: '4H', value: '240'},
  {label: '1D', value: 'D'},
];

export default function MarketToolsPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ToolTab>('chart');
  const [heatmapTab, setHeatmapTab] = useState<HeatmapTab>('forex');
  const [interval, setIntervalValue] = useState('15');

  const verifyAccess = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/me/market-tools');
      const result = await response.json();
      if (response.status === 403) {
        setDenied(true);
        setError('');
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Elite Tools could not be loaded');
      setDenied(false);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Elite Tools could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void verifyAccess();
  }, [verifyAccess]);

  if (loading) {
    return (
      <div style={centerPage}>
        <Loader2 size={30} color="#D4AF37" style={{animation: 'marketToolSpin .8s linear infinite'}} />
        <p>Preparing Elite Tools…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div style={centerPage}>
        <div style={lockedSeal}><LockKeyhole size={31} /></div>
        <p style={eyebrow}>ELITE MARKET WORKSPACE</p>
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.55rem'}}>Elite Tools Access Required</h1>
        <p style={{fontSize: '.72rem', color: '#777', lineHeight: 1.75, maxWidth: '560px', textAlign: 'center'}}>
          Interactive charts, market heatmaps, the session clock and position-risk tools are available with an active membership or approved Elite access.
        </p>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <Link href="/portal/ib" style={goldLink}>Apply for Elite Access</Link>
          <Link href="/portal/packages" style={outlineLink}>View Memberships</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centerPage}>
        <BarChart3 size={32} color="#D4AF37" />
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.1rem'}}>Elite Tools Temporarily Unavailable</h1>
        <p style={{fontSize: '.7rem', color: '#777'}}>{error}</p>
        <button onClick={() => void verifyAccess()} style={goldButton}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        @keyframes marketToolFade{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
        @keyframes marketToolSpin{to{transform:rotate(360deg)}}
        .market-tool-tab:hover{border-color:rgba(212,175,55,.26)!important;color:#D4AF37!important}
        @media(max-width:900px){
          .market-tool-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .market-session-grid{grid-template-columns:1fr!important}
          .risk-calculator-layout{grid-template-columns:1fr!important}
          .risk-calculator-layout>div:first-child{border-right:0!important;border-bottom:1px solid rgba(255,255,255,.05)}
        }
        @media(max-width:600px){
          .market-tools-page{padding:1.25rem!important}
          .market-tool-tabs{grid-template-columns:1fr!important}
          .risk-field-grid,.risk-advanced-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      <header style={header}>
        <div>
          <p style={eyebrow}>MARKET INTELLIGENCE</p>
          <h1 style={title}>Elite Tools</h1>
          <p style={subtitle}>Your all-in-one XAUUSD analysis, macro timing and disciplined position-planning workspace.</p>
        </div>
        <div style={accessBadge}><ShieldCheck size={13} /> ELITE MEMBER ACCESS</div>
      </header>

      <nav className="market-tool-tabs" style={tabs}>
        {TOOL_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="market-tool-tab"
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...tabButton,
                color: active ? '#D4AF37' : '#888',
                background: active ? 'rgba(212,175,55,.06)' : '#101010',
                borderColor: active ? 'rgba(212,175,55,.3)' : 'rgba(255,255,255,.06)',
              }}
            >
              <span style={{...tabIcon, borderColor: active ? 'rgba(212,175,55,.25)' : 'rgba(255,255,255,.07)'}}>{tab.icon}</span>
              <span>
                <strong style={{display: 'block', fontFamily: 'Cinzel,serif', fontSize: '.66rem'}}>{tab.label}</strong>
                <small style={{display: 'block', color: '#555', fontSize: '.5rem', marginTop: '3px'}}>{tab.description}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <main style={{animation: 'marketToolFade .35s ease both'}}>
        {activeTab === 'chart' && (
          <ToolPanel
            eyebrow="PRECIOUS METALS DESK"
            title="Interactive XAUUSD Chart"
            icon={<CandlestickChart size={16} />}
            actions={
              <div style={segmented}>
                {INTERVALS.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setIntervalValue(item.value)}
                    style={{...segmentButton, color: interval === item.value ? '#D4AF37' : '#666', background: interval === item.value ? 'rgba(212,175,55,.08)' : 'transparent'}}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <TradingViewWidget
              key={interval}
              scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
              config={{
                autosize: true,
                symbol: 'OANDA:XAUUSD',
                interval,
                timezone: 'Etc/UTC',
                theme: 'dark',
                style: '1',
                locale: 'en',
                backgroundColor: '#0D0D0D',
                gridColor: 'rgba(212,175,55,0.06)',
                allow_symbol_change: true,
                calendar: false,
                details: true,
                hide_side_toolbar: false,
                hide_top_toolbar: false,
                hide_legend: false,
                hide_volume: false,
                save_image: true,
                withdateranges: true,
                studies: ['STD;EMA', 'STD;RSI'],
                support_host: 'https://www.tradingview.com',
              }}
              label="XAUUSD Chart"
              attributionUrl="https://www.tradingview.com/symbols/XAUUSD/"
              height={680}
            />
          </ToolPanel>
        )}

        {activeTab === 'calendar' && (
          <ToolPanel
            eyebrow="MACRO EVENT RISK"
            title="Economic Calendar"
            icon={<CalendarDays size={16} />}
            note="Use the calendar to identify scheduled volatility risk. High-impact events can create spread expansion and slippage around XAUUSD."
          >
            <TradingViewWidget
              scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
              config={{
                colorTheme: 'dark',
                isTransparent: true,
                locale: 'en',
                countryFilter: 'us,eu,gb,cn,jp,au,nz,ca,ch',
                importanceFilter: '-1,0,1',
                width: '100%',
                height: '100%',
              }}
              label="Economic Calendar"
              attributionUrl="https://www.tradingview.com/economic-calendar/"
              height={680}
            />
          </ToolPanel>
        )}

        {activeTab === 'heatmaps' && (
          <ToolPanel
            eyebrow="CROSS-MARKET PULSE"
            title="Market Heatmaps"
            icon={<Flame size={16} />}
            actions={
              <div style={segmented}>
                {(['forex', 'stocks', 'crypto'] as HeatmapTab[]).map(item => (
                  <button
                    key={item}
                    onClick={() => setHeatmapTab(item)}
                    style={{...segmentButton, color: heatmapTab === item ? '#D4AF37' : '#666', background: heatmapTab === item ? 'rgba(212,175,55,.08)' : 'transparent'}}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            }
            note="Heatmaps are context tools. Cross-market strength does not by itself constitute an XAUUSD entry signal."
          >
            {heatmapTab === 'forex' && <ForexHeatmap />}
            {heatmapTab === 'stocks' && (
              <TradingViewWidget
                scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
                config={{
                  dataSource: 'SPX500',
                  blockSize: 'market_cap_basic',
                  blockColor: 'change',
                  grouping: 'sector',
                  locale: 'en',
                  symbolUrl: '',
                  colorTheme: 'dark',
                  exchanges: [],
                  hasTopBar: true,
                  isDataSetEnabled: true,
                  isZoomEnabled: true,
                  hasSymbolTooltip: true,
                  isMonoSize: false,
                  width: '100%',
                  height: '100%',
                }}
                label="Stock Heatmap"
                attributionUrl="https://www.tradingview.com/heatmap/stock/"
                height={650}
              />
            )}
            {heatmapTab === 'crypto' && (
              <TradingViewWidget
                scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js"
                config={{
                  dataSource: 'Crypto',
                  blockSize: 'market_cap_calc',
                  blockColor: '24h_close_change|5',
                  locale: 'en',
                  symbolUrl: '',
                  colorTheme: 'dark',
                  hasTopBar: true,
                  isDataSetEnabled: true,
                  isZoomEnabled: true,
                  hasSymbolTooltip: true,
                  isMonoSize: false,
                  width: '100%',
                  height: '100%',
                }}
                label="Crypto Heatmap"
                attributionUrl="https://www.tradingview.com/heatmap/crypto/"
                height={650}
              />
            )}
          </ToolPanel>
        )}

        {activeTab === 'sessions-risk' && (
          <div style={{display: 'grid', gap: '16px'}}>
            <MarketSessionClock />
            <XauRiskCalculator />
          </div>
        )}
      </main>

      <footer style={footerNote}>
        <Globe2 size={13} />
        Market data and widgets are supplied by third parties and may be delayed according to the exchange or data plan. These tools support analysis and education; they do not execute trades or provide financial advice.
      </footer>
    </div>
  );
}

function ToolPanel({eyebrow: panelEyebrow, title: panelTitle, icon, actions, note, children}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={panel}>
      <div style={panelHead}>
        <div>
          <p style={{...eyebrow, fontSize: '.48rem', marginBottom: '5px'}}>{panelEyebrow}</p>
          <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '.95rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{color: '#D4AF37'}}>{icon}</span> {panelTitle}
          </h2>
        </div>
        {actions}
      </div>
      {note && <div style={panelNote}>{note}</div>}
      {children}
    </section>
  );
}

const page: React.CSSProperties = {padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', fontFamily: 'Montserrat,sans-serif', color: '#fff'};
const centerPage: React.CSSProperties = {...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '13px'};
const header: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', marginBottom: '24px'};
const eyebrow: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.56rem', letterSpacing: '4px', color: '#D4AF37', marginBottom: '7px'};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '2.15rem', fontWeight: 900, lineHeight: 1};
const subtitle: React.CSSProperties = {fontSize: '.7rem', color: '#666', lineHeight: 1.65, marginTop: '9px', maxWidth: '660px'};
const accessBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', border: '1px solid rgba(52,211,153,.22)', background: 'rgba(52,211,153,.05)', color: '#34D399', padding: '7px 10px', fontSize: '.5rem', letterSpacing: '1.5px'};
const tabs: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '8px', marginBottom: '16px'};
const tabButton: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid', padding: '12px', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', transition: 'all .2s'};
const tabIcon: React.CSSProperties = {width: 31, height: 31, display: 'grid', placeItems: 'center', border: '1px solid', color: '#D4AF37', flexShrink: 0};
const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden'};
const panelHead: React.CSSProperties = {minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '13px 17px', borderBottom: '1px solid rgba(255,255,255,.05)', flexWrap: 'wrap'};
const panelNote: React.CSSProperties = {padding: '9px 17px', background: 'rgba(212,175,55,.025)', borderBottom: '1px solid rgba(212,175,55,.07)', color: '#666', fontSize: '.55rem', lineHeight: 1.55};
const segmented: React.CSSProperties = {display: 'flex', border: '1px solid rgba(255,255,255,.07)', background: '#090909'};
const segmentButton: React.CSSProperties = {border: 0, borderRight: '1px solid rgba(255,255,255,.06)', padding: '7px 10px', fontFamily: 'JetBrains Mono,monospace', fontSize: '.52rem', cursor: 'pointer'};
const footerNote: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '14px', color: '#4F4F4F', fontSize: '.52rem', lineHeight: 1.6};
const lockedSeal: React.CSSProperties = {width: 65, height: 65, borderRadius: '50%', border: '1px solid rgba(212,175,55,.3)', background: 'rgba(212,175,55,.05)', color: '#D4AF37', display: 'grid', placeItems: 'center'};
const goldLink: React.CSSProperties = {background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', textDecoration: 'none', padding: '11px 18px', fontFamily: 'Cinzel,serif', fontSize: '.59rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase'};
const outlineLink: React.CSSProperties = {border: '1px solid rgba(212,175,55,.3)', color: '#D4AF37', textDecoration: 'none', padding: '10px 18px', fontFamily: 'Cinzel,serif', fontSize: '.59rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase'};
const goldButton: React.CSSProperties = {...goldLink, border: 0, cursor: 'pointer'};

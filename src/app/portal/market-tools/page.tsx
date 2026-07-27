'use client';

import {
  BarChart3,
  CalendarDays,
  CandlestickChart,
  Gauge,
  Globe2,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Radar,
  Save,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';

import AnalysisWorkspace from '@/components/portal/market-tools/AnalysisWorkspace';
import EconomicCalendarTable from '@/components/portal/market-tools/EconomicCalendarTable';
import MarketDashboard from '@/components/portal/market-tools/MarketDashboard';
import MarketIntelligence from '@/components/portal/market-tools/MarketIntelligence';
import MarketSessionClock from '@/components/portal/market-tools/MarketSessionClock';
import RiskLab from '@/components/portal/market-tools/RiskLab';
import TradingViewWidget from '@/components/portal/market-tools/TradingViewWidget';
import {useEliteWorkspace} from '@/components/portal/market-tools/useEliteWorkspace';
import {useMarketCalendar} from '@/components/portal/market-tools/useMarketCalendar';
import {usePortalTheme} from '@/components/theme/PortalThemeProvider';
import type {WorkspacePreferences} from '@/lib/market-tools/workspace';
import {authFetch} from '@/lib/utils/authFetch';

type ToolTab = WorkspacePreferences['activeTab'];

const TOOL_TABS: {
  id: ToolTab;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {id: 'dashboard', label: 'Dashboard', description: 'Gold market command desk', icon: <LayoutDashboard size={15} />},
  {id: 'chart', label: 'Chart & Plan', description: 'Analysis and journal handoff', icon: <CandlestickChart size={15} />},
  {id: 'calendar', label: 'Calendar', description: 'Compact macro event table', icon: <CalendarDays size={15} />},
  {id: 'intelligence', label: 'Intelligence', description: 'Drivers, regime and heatmaps', icon: <Radar size={15} />},
  {id: 'risk', label: 'Risk Lab', description: 'Sessions and calculators', icon: <Gauge size={15} />},
];

const INTERVALS = [
  {label: '5M', value: '5'},
  {label: '15M', value: '15'},
  {label: '1H', value: '60'},
  {label: '4H', value: '240'},
  {label: '1D', value: 'D'},
  {label: '1W', value: 'W'},
] as const;

export default function MarketToolsPage() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [accessError, setAccessError] = useState('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const {theme} = usePortalTheme();
  const {workspace, status, message, updatePreferences, updateAnalysis} = useEliteWorkspace();
  const calendar = useMarketCalendar(!accessLoading && !denied && !accessError);

  const verifyAccess = useCallback(async () => {
    setAccessLoading(true);
    try {
      const response = await authFetch('/api/me/market-tools');
      const result = await response.json();
      if (response.status === 403) {
        setDenied(true);
        setAccessError('');
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Elite Tools could not be loaded');
      setDenied(false);
      setAccessError('');
    } catch (reason) {
      setAccessError(reason instanceof Error ? reason.message : 'Elite Tools could not be loaded');
    } finally {
      setAccessLoading(false);
    }
  }, []);

  useEffect(() => {
    void verifyAccess();
  }, [verifyAccess]);

  const setActiveTab = useCallback((tab: ToolTab) => updatePreferences({activeTab: tab}), [updatePreferences]);
  const updateRiskSettings = useCallback(
    (risk: WorkspacePreferences['risk']) => updatePreferences(current => ({...current, risk})),
    [updatePreferences],
  );
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const last = TOOL_TABS.length - 1;
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowRight'
          ? (index + 1) % TOOL_TABS.length
          : (index - 1 + TOOL_TABS.length) % TOOL_TABS.length;
    setActiveTab(TOOL_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  if (accessLoading || status === 'loading') {
    return (
      <div style={centerPage}>
        <Loader2 size={30} color="#D4AF37" style={{animation: 'marketToolSpin .8s linear infinite'}} />
        <p>Restoring your Elite Tools workspace…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div style={centerPage}>
        <div style={lockedSeal}><LockKeyhole size={31} /></div>
        <p style={eyebrow}>ELITE MARKET WORKSPACE</p>
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.55rem'}}>Elite Tools Access Required</h1>
        <p style={{fontSize: '.72rem', color: '#777', lineHeight: 1.75, maxWidth: 560, textAlign: 'center'}}>
          The live workstation, saved XAUUSD analysis, economic calendar, market intelligence and risk lab require an active membership or approved Elite access.
        </p>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center'}}>
          <Link href="/portal/ib" style={goldLink}>Apply for Elite Access</Link>
          <Link href="/portal/packages" style={outlineLink}>View Memberships</Link>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div style={centerPage}>
        <BarChart3 size={32} color="#D4AF37" />
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.1rem'}}>Elite Tools Temporarily Unavailable</h1>
        <p style={{fontSize: '.7rem', color: '#777'}}>{accessError}</p>
        <button onClick={() => void verifyAccess()} style={goldButton}>Try Again</button>
      </div>
    );
  }

  const {preferences, analysis} = workspace;
  return (
    <div className="market-tools-page" style={page}>
      <style>{`
        @keyframes marketToolFade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
        @keyframes marketToolSpin{to{transform:rotate(360deg)}}
        .market-tool-tab:hover{border-color:rgba(212,175,55,.3)!important;color:#D4AF37!important;background:rgba(212,175,55,.04)!important}
        .market-tool-tab:focus-visible,.market-tools-page button:focus-visible,.market-tools-page input:focus-visible,.market-tools-page select:focus-visible,.market-tools-page textarea:focus-visible{outline:2px solid #D4AF37!important;outline-offset:2px}
        .market-tools-page input:focus,.market-tools-page select:focus,.market-tools-page textarea:focus{border-color:rgba(212,175,55,.38)!important}
        @media(max-width:1100px){
          .market-dashboard-strip{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .intelligence-top-grid{grid-template-columns:1fr!important}
          .analysis-workspace-grid{grid-template-columns:1fr!important}
          .analysis-workspace-grid>div:first-child{border-right:0!important;border-bottom:1px solid rgba(255,255,255,.05)}
        }
        @media(max-width:900px){
          .market-tool-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .market-session-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .risk-calculator-layout{grid-template-columns:1fr!important}
          .risk-calculator-layout>div:first-child{border-right:0!important;border-bottom:1px solid rgba(255,255,255,.05)}
          .risk-lab-grid{grid-template-columns:1fr!important}
          .risk-lab-grid>section{grid-column:auto!important}
        }
        @media(max-width:650px){
          .market-tools-page{padding:1.1rem!important}
          .market-tool-tabs,.market-dashboard-strip,.market-session-grid{grid-template-columns:1fr!important}
          .analysis-three-column,.analysis-price-grid,.analysis-two-column,.simulation-fields,.risk-field-grid,.risk-advanced-grid{grid-template-columns:1fr!important}
          .market-tools-title{font-size:1.65rem!important}
        }
      `}</style>

      <header style={header}>
        <div>
          <p style={eyebrow}>XAUUSD TRADING WORKSTATION</p>
          <h1 className="market-tools-title" style={title}>Elite Tools</h1>
          <p style={subtitle}>Plan with context, define risk, preserve your analysis and transfer validated trade plans directly into My Trading Journal.</p>
        </div>
        <div style={{display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
          <div
            title={message}
            style={{
              ...saveBadge,
              color: status === 'saved' ? '#34D399' : status === 'saving' ? '#D4AF37' : '#F5A524',
              borderColor: status === 'saved' ? 'rgba(52,211,153,.2)' : 'rgba(245,165,36,.22)',
            }}
          >
            {status === 'local' ? <WifiOff size={12} /> : status === 'saving' ? <Loader2 size={12} style={{animation: 'marketToolSpin .8s linear infinite'}} /> : <Save size={12} />}
            {status === 'saved' ? 'CLOUD SAVED' : status === 'saving' ? 'SAVING' : 'BROWSER BACKUP'}
          </div>
          <div style={accessBadge}><ShieldCheck size={13} /> ELITE MEMBER ACCESS</div>
        </div>
      </header>

      <nav className="market-tool-tabs" style={tabs} role="tablist" aria-label="Elite Tools sections">
        {TOOL_TABS.map((tab, index) => {
          const active = preferences.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={element => {tabRefs.current[index] = element;}}
              id={`elite-tab-${tab.id}`}
              role="tab"
              aria-selected={active}
              aria-controls={`elite-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              className="market-tool-tab"
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={event => onTabKeyDown(event, index)}
              style={{
                ...tabButton,
                color: active ? '#D4AF37' : '#888',
                background: active ? 'rgba(212,175,55,.065)' : '#101010',
                borderColor: active ? 'rgba(212,175,55,.34)' : 'rgba(255,255,255,.06)',
              }}
            >
              <span style={{...tabIcon, borderColor: active ? 'rgba(212,175,55,.3)' : 'rgba(255,255,255,.07)'}}>{tab.icon}</span>
              <span>
                <strong style={{display: 'block', fontFamily: 'Cinzel,serif', fontSize: '.62rem'}}>{tab.label}</strong>
                <small style={{display: 'block', color: '#555', fontSize: '.47rem', marginTop: 3}}>{tab.description}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <main
        key={preferences.activeTab}
        id={`elite-panel-${preferences.activeTab}`}
        role="tabpanel"
        aria-labelledby={`elite-tab-${preferences.activeTab}`}
        tabIndex={0}
        style={{animation: 'marketToolFade .28s ease both'}}
      >
        {preferences.activeTab === 'dashboard' && (
          <MarketDashboard
            events={calendar.events}
            preferences={preferences}
            analysis={analysis}
            onOpenTab={setActiveTab}
          />
        )}

        {preferences.activeTab === 'chart' && (
          <div style={{display: 'grid', gap: 12}}>
            <ToolPanel
              eyebrow="PRECIOUS METALS DESK"
              title="Interactive XAUUSD Chart"
              icon={<CandlestickChart size={16} />}
              actions={
                <div style={segmented} role="group" aria-label="Chart timeframe">
                  {INTERVALS.map(item => (
                    <button
                      key={item.value}
                      onClick={() => updatePreferences({interval: item.value})}
                      aria-pressed={preferences.interval === item.value}
                      style={{...segmentButton, color: preferences.interval === item.value ? '#D4AF37' : '#666', background: preferences.interval === item.value ? 'rgba(212,175,55,.08)' : 'transparent'}}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              }
              note="The symbol is fixed to XAUUSD so your saved plan and journal handoff always match this workspace. Use TradingView’s image button to capture chart drawings."
            >
              <TradingViewWidget
                key={preferences.interval}
                scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                config={{
                  autosize: true,
                  symbol: 'OANDA:XAUUSD',
                  interval: preferences.interval,
                  timezone: preferences.timezone,
                  theme,
                  style: '1',
                  locale: 'en',
                  backgroundColor: theme === 'light' ? '#FAF7F0' : '#0D0D0D',
                  gridColor: 'rgba(212,175,55,0.055)',
                  allow_symbol_change: false,
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
            <AnalysisWorkspace analysis={analysis} interval={preferences.interval} onAnalysis={updateAnalysis} />
          </div>
        )}

        {preferences.activeTab === 'calendar' && (
          <div style={{display: 'grid', gap: 10}}>
            <div style={contextBar}>
              <CalendarDays size={14} color="#D4AF37" />
              <span><strong style={{color: '#C9C9C9'}}>Economic Calendar</strong> · Compact event-risk view with saved impact, currency and timezone filters.</span>
            </div>
            <EconomicCalendarTable
              events={calendar.events}
              loading={calendar.loading}
              error={calendar.error}
              fetchedAt={calendar.fetchedAt}
              limitations={calendar.limitations}
              preferences={preferences}
              onPreferences={updatePreferences}
              onRefresh={() => void calendar.refresh()}
            />
          </div>
        )}

        {preferences.activeTab === 'intelligence' && (
          <MarketIntelligence preferences={preferences} onPreferences={updatePreferences} />
        )}

        {preferences.activeTab === 'risk' && (
          <div style={{display: 'grid', gap: 12}}>
            <MarketSessionClock />
            <RiskLab
              riskSettings={preferences.risk}
              onRiskSettings={updateRiskSettings}
            />
          </div>
        )}
      </main>

      <footer style={footerNote}>
        <Globe2 size={13} />
        Third-party market data may be delayed according to the source, exchange or plan. Calendar times are converted to your selected timezone. Elite Tools supports analysis and education; it does not execute trades or provide financial advice.
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
          <p style={{...eyebrow, fontSize: '.46rem', marginBottom: 5}}>{panelEyebrow}</p>
          <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 8}}>
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

const page: React.CSSProperties = {padding: '2rem', minHeight: '100vh', background: '#0A0A0A', fontFamily: 'Montserrat,sans-serif', color: '#fff'};
const centerPage: React.CSSProperties = {...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 13};
const header: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 18};
const eyebrow: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.52rem', letterSpacing: '3.5px', color: '#D4AF37', marginBottom: 6};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '2rem', fontWeight: 900, lineHeight: 1};
const subtitle: React.CSSProperties = {fontSize: '.65rem', color: '#666', lineHeight: 1.65, marginTop: 8, maxWidth: 700};
const accessBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid rgba(52,211,153,.22)', background: 'rgba(52,211,153,.05)', color: '#34D399', padding: '6px 9px', fontSize: '.47rem', letterSpacing: '1.3px'};
const saveBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid', background: '#0E0E0E', padding: '6px 9px', fontSize: '.47rem', letterSpacing: '1.2px'};
const tabs: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6, marginBottom: 12};
const tabButton: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, border: '1px solid', padding: '10px', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', transition: 'all .2s'};
const tabIcon: React.CSSProperties = {width: 29, height: 29, display: 'grid', placeItems: 'center', border: '1px solid', color: '#D4AF37', flexShrink: 0};
const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.065)', overflow: 'hidden'};
const panelHead: React.CSSProperties = {minHeight: 57, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 15px', borderBottom: '1px solid rgba(255,255,255,.05)', flexWrap: 'wrap'};
const panelNote: React.CSSProperties = {padding: '8px 15px', background: 'rgba(212,175,55,.025)', borderBottom: '1px solid rgba(212,175,55,.07)', color: '#666', fontSize: '.52rem', lineHeight: 1.55};
const segmented: React.CSSProperties = {display: 'flex', border: '1px solid rgba(255,255,255,.07)', background: '#090909'};
const segmentButton: React.CSSProperties = {border: 0, borderRight: '1px solid rgba(255,255,255,.06)', padding: '6px 9px', fontFamily: 'JetBrains Mono,monospace', fontSize: '.49rem', cursor: 'pointer'};
const contextBar: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,.065)', background: '#111', color: '#666', fontSize: '.53rem'};
const footerNote: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, color: '#4F4F4F', fontSize: '.49rem', lineHeight: 1.6};
const lockedSeal: React.CSSProperties = {width: 65, height: 65, borderRadius: '50%', border: '1px solid rgba(212,175,55,.3)', background: 'rgba(212,175,55,.05)', color: '#D4AF37', display: 'grid', placeItems: 'center'};
const goldLink: React.CSSProperties = {background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', textDecoration: 'none', padding: '11px 18px', fontFamily: 'Cinzel,serif', fontSize: '.59rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase'};
const outlineLink: React.CSSProperties = {border: '1px solid rgba(212,175,55,.3)', color: '#D4AF37', textDecoration: 'none', padding: '10px 18px', fontFamily: 'Cinzel,serif', fontSize: '.59rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase'};
const goldButton: React.CSSProperties = {...goldLink, border: 0, cursor: 'pointer'};

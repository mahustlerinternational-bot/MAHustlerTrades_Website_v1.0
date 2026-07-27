'use client';

import {Activity, CalendarClock, Clock3, Radar, ShieldCheck} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

import {MARKET_SESSIONS, isMarketSessionOpen} from '@/lib/market-tools/calculations';
import type {MarketCalendarEvent} from '@/lib/market-tools/calendar';
import type {EliteAnalysis, WorkspacePreferences} from '@/lib/market-tools/workspace';
import {authFetch} from '@/lib/utils/authFetch';
import {usePortalTheme} from '@/components/theme/PortalThemeProvider';

import TradingViewWidget from './TradingViewWidget';

type Regime = {
  active_regime?: string;
  recorded_at?: string;
  accumulation_pct?: number;
  trending_pct?: number;
  distribution_pct?: number;
  ranging_pct?: number;
};

function eventTime(event: MarketCalendarEvent, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(event.date));
}

function timeUntil(date: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(date) - now) / 1000));
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 86_400)}d ${Math.floor(seconds % 86_400 / 3600)}h`;
}

export default function MarketDashboard({
  events,
  preferences,
  analysis,
  onOpenTab,
}: {
  events: MarketCalendarEvent[];
  preferences: WorkspacePreferences;
  analysis: EliteAnalysis;
  onOpenTab: (tab: WorkspacePreferences['activeTab']) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [regime, setRegime] = useState<Regime | null>(null);
  const {theme} = usePortalTheme();

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    authFetch('/api/quant/regime')
      .then(response => response.ok ? response.json() : null)
      .then(value => setRegime(value))
      .catch(() => setRegime(null));
    return () => window.clearInterval(clock);
  }, []);

  const openSessions = MARKET_SESSIONS.filter(session => isMarketSessionOpen(new Date(now), session));
  const nextEvent = useMemo(() => events.find(event =>
    event.impact === 'High' &&
    preferences.calendarCurrencies.includes(event.country) &&
    Date.parse(event.date) >= now,
  ), [events, now, preferences.calendarCurrencies]);
  const planComplete = Boolean(analysis.entry && analysis.stopLoss && analysis.takeProfit1 && analysis.thesis);

  return (
    <div style={{display: 'grid', gap: 12}}>
      <div className="market-dashboard-strip" style={strip}>
        <SummaryCard
          icon={<Activity size={15} />}
          label="MARKET SESSIONS"
          value={openSessions.length ? openSessions.map(item => item.city).join(' · ') : 'Inter-session'}
          detail={`${openSessions.length} primary session${openSessions.length === 1 ? '' : 's'} open`}
          tone={openSessions.length ? '#34D399' : '#888'}
        />
        <SummaryCard
          icon={<CalendarClock size={15} />}
          label="NEXT HIGH IMPACT"
          value={nextEvent ? `${nextEvent.country} · ${nextEvent.title}` : 'No matching event'}
          detail={nextEvent ? `${eventTime(nextEvent, preferences.timezone)} · in ${timeUntil(nextEvent.date, now)}` : 'Check calendar filters'}
          tone="#FF6874"
          onClick={() => onOpenTab('calendar')}
        />
        <SummaryCard
          icon={<Radar size={15} />}
          label="QUANT REGIME"
          value={regime?.active_regime ?? 'No live regime'}
          detail={regime?.recorded_at ? `Updated ${new Date(regime.recorded_at).toLocaleString()}` : 'Awaiting a verified regime update'}
          tone="#8FAFE8"
          onClick={() => onOpenTab('intelligence')}
        />
        <SummaryCard
          icon={<ShieldCheck size={15} />}
          label="TRADE PLAN"
          value={planComplete ? 'Plan ready' : 'Draft incomplete'}
          detail={analysis.updatedAt ? `Last edited ${new Date(analysis.updatedAt).toLocaleString()}` : 'No saved analysis yet'}
          tone={planComplete ? '#34D399' : '#D4AF37'}
          onClick={() => onOpenTab('chart')}
        />
      </div>

      <section style={panel}>
        <div style={panelHeader}>
          <div>
            <p style={eyebrow}>LIVE CROSS-MARKET BOARD</p>
            <h2 style={heading}>Gold & Macro Drivers</h2>
          </div>
          <span style={sourceBadge}>LIVE WIDGET · THIRD-PARTY DATA</span>
        </div>
        <TradingViewWidget
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
          config={{
            colorTheme: theme,
            dateRange: '1D',
            showChart: true,
            locale: 'en',
            largeChartUrl: '',
            isTransparent: true,
            showSymbolLogo: true,
            showFloatingTooltip: true,
            width: '100%',
            height: '100%',
            plotLineColorGrowing: 'rgba(52,211,153,1)',
            plotLineColorFalling: 'rgba(255,83,100,1)',
            gridLineColor: 'rgba(255,255,255,.04)',
            scaleFontColor: 'rgba(145,145,145,1)',
            belowLineFillColorGrowing: 'rgba(52,211,153,.08)',
            belowLineFillColorFalling: 'rgba(255,83,100,.08)',
            tabs: [{
              title: 'Gold Drivers',
              symbols: [
                {s: 'OANDA:XAUUSD', d: 'Gold / USD'},
                {s: 'TVC:DXY', d: 'US Dollar Index'},
                {s: 'TVC:US10Y', d: 'US 10Y Yield'},
                {s: 'OANDA:XAGUSD', d: 'Silver / USD'},
                {s: 'FOREXCOM:SPXUSD', d: 'S&P 500'},
                {s: 'BITSTAMP:BTCUSD', d: 'Bitcoin / USD'},
              ],
              originalTitle: 'Gold Drivers',
            }],
          }}
          label="Gold Driver Dashboard"
          attributionUrl="https://www.tradingview.com/markets/"
          height={510}
        />
      </section>

      <div style={notice}>
        <Clock3 size={13} />
        Driver movements provide context, not a guaranteed inverse or positive relationship. Confirm the timestamp, data source and XAUUSD price action before making a decision.
      </div>
    </div>
  );
}

function SummaryCard({icon, label, value, detail, tone, onClick}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: tone}}>
        <span style={labelStyle}>{label}</span>{icon}
      </div>
      <strong style={summaryValue}>{value}</strong>
      <span style={summaryDetail}>{detail}</span>
    </>
  );
  return onClick ? <button onClick={onClick} style={{...summaryCard, cursor: 'pointer', textAlign: 'left'}}>{content}</button> : <article style={summaryCard}>{content}</article>;
}

const strip: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8};
const summaryCard: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 7, minHeight: 116, background: '#101010', border: '1px solid rgba(255,255,255,.065)', padding: 13, fontFamily: 'inherit', color: '#fff'};
const labelStyle: React.CSSProperties = {fontSize: '.47rem', letterSpacing: '1.3px'};
const summaryValue: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.72rem', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis'};
const summaryDetail: React.CSSProperties = {fontSize: '.5rem', color: '#616161', lineHeight: 1.5};
const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.065)'};
const panelHeader: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '13px 15px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const eyebrow: React.CSSProperties = {fontSize: '.46rem', letterSpacing: '2.5px', color: '#D4AF37', marginBottom: 4};
const heading: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.86rem'};
const sourceBadge: React.CSSProperties = {fontSize: '.43rem', letterSpacing: '1.2px', color: '#676767', border: '1px solid rgba(255,255,255,.08)', padding: '5px 7px'};
const notice: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: 7, color: '#5C5C5C', fontSize: '.52rem', lineHeight: 1.6, padding: '8px 10px', border: '1px solid rgba(212,175,55,.08)', background: 'rgba(212,175,55,.025)'};

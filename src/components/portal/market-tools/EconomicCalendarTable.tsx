'use client';

import {
  BellPlus,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

import type {CalendarImpact, MarketCalendarEvent} from '@/lib/market-tools/calendar';
import type {WorkspacePreferences} from '@/lib/market-tools/workspace';

const IMPACTS: CalendarImpact[] = ['High', 'Medium', 'Low', 'Holiday'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
const ZONES = [
  ['Asia/Dubai', 'Dubai (GST)'],
  ['Etc/UTC', 'UTC'],
  ['Europe/London', 'London'],
  ['America/New_York', 'New York'],
  ['Asia/Singapore', 'Singapore'],
  ['Asia/Manila', 'Manila'],
  ['Australia/Sydney', 'Sydney'],
] as const;

function dateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function formatEventDate(date: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
}

function formatEventTime(date: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(date));
}

function countdown(date: string, now: number) {
  const seconds = Math.floor((Date.parse(date) - now) / 1000);
  if (seconds <= 0) return 'Released';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
  return `${Math.floor(seconds / 86_400)}d ${Math.floor(seconds % 86_400 / 3600)}h`;
}

function downloadReminder(event: MarketCalendarEvent) {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + 30 * 60_000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (value: string) => value.replace(/[\\,;]/g, match => `\\${match}`).replace(/\n/g, '\\n');
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MAHustler Trades//Elite Tools//EN',
    'BEGIN:VEVENT',
    `UID:${escape(event.id)}@mahustlertrades`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`${event.country} ${event.title}`)}`,
    `DESCRIPTION:${escape(`${event.impact} impact economic event. Forecast: ${event.forecast}; Previous: ${event.previous}. Verify release data at Forex Factory.`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(`${event.country} ${event.title} in 15 minutes`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([calendar], {type: 'text/calendar;charset=utf-8'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${event.country}-${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function EconomicCalendarTable({
  events,
  loading,
  error,
  fetchedAt,
  limitations,
  preferences,
  onPreferences,
  onRefresh,
}: {
  events: MarketCalendarEvent[];
  loading: boolean;
  error: string;
  fetchedAt: string | null;
  limitations: string;
  preferences: WorkspacePreferences;
  onPreferences: (update: Partial<WorkspacePreferences>) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = dateKey(new Date(now), preferences.timezone);
  const tomorrow = dateKey(addDays(new Date(now), 1), preferences.timezone);

  const filtered = useMemo(() => {
    const eligible = events.filter(event =>
      preferences.calendarImpacts.includes(event.impact) &&
      preferences.calendarCurrencies.includes(event.country),
    );
    if (preferences.calendarRange === 'today') {
      return eligible.filter(event => dateKey(new Date(event.date), preferences.timezone) === today);
    }
    if (preferences.calendarRange === 'tomorrow') {
      return eligible.filter(event => dateKey(new Date(event.date), preferences.timezone) === tomorrow);
    }
    if (preferences.calendarRange === 'up-next') {
      return eligible.filter(event => Date.parse(event.date) >= now).slice(0, 12);
    }
    return eligible;
  }, [
    events,
    now,
    preferences.calendarCurrencies,
    preferences.calendarImpacts,
    preferences.calendarRange,
    preferences.timezone,
    today,
    tomorrow,
  ]);

  const toggleImpact = (impact: CalendarImpact) => onPreferences({
    calendarImpacts: preferences.calendarImpacts.includes(impact)
      ? preferences.calendarImpacts.filter(item => item !== impact)
      : [...preferences.calendarImpacts, impact],
  });
  const toggleCurrency = (currency: string) => onPreferences({
    calendarCurrencies: preferences.calendarCurrencies.includes(currency)
      ? preferences.calendarCurrencies.filter(item => item !== currency)
      : [...preferences.calendarCurrencies, currency],
  });

  return (
    <section style={panel}>
      <div style={toolbar}>
        <div style={rangeTabs} role="group" aria-label="Calendar date range">
          {([
            ['today', 'Today'],
            ['tomorrow', 'Tomorrow'],
            ['week', 'This Week'],
            ['up-next', 'Up Next'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onPreferences({calendarRange: value})}
              style={{...filterButton, ...(preferences.calendarRange === value ? activeFilter : {})}}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap'}}>
          <label style={selectLabel}>
            TIMEZONE
            <select
              aria-label="Calendar timezone"
              value={preferences.timezone}
              onChange={event => onPreferences({timezone: event.target.value})}
              style={select}
            >
              {ZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button onClick={onRefresh} aria-label="Refresh calendar" title="Refresh calendar" style={iconButton}>
            <RefreshCcw size={13} />
          </button>
        </div>
      </div>

      <div style={filterStrip}>
        <span style={filterCaption}><Filter size={11} /> IMPACT</span>
        {IMPACTS.map(impact => (
          <button
            key={impact}
            onClick={() => toggleImpact(impact)}
            aria-pressed={preferences.calendarImpacts.includes(impact)}
            style={{
              ...chip,
              opacity: preferences.calendarImpacts.includes(impact) ? 1 : .38,
              borderColor: impactColor(impact),
            }}
          >
            <span style={{...impactDot, background: impactColor(impact)}} /> {impact}
          </button>
        ))}
        <span style={{...filterCaption, marginLeft: 8}}>CURRENCY</span>
        {CURRENCIES.map(currency => (
          <button
            key={currency}
            onClick={() => toggleCurrency(currency)}
            aria-pressed={preferences.calendarCurrencies.includes(currency)}
            style={{...chip, opacity: preferences.calendarCurrencies.includes(currency) ? 1 : .35}}
          >
            {currency}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={empty}><Loader2 size={20} style={{animation: 'marketToolSpin .8s linear infinite'}} /> Loading weekly events…</div>
      ) : error ? (
        <div style={empty}>
          <CalendarDays size={22} color="#D4AF37" />
          <strong>Calendar feed unavailable</strong>
          <span>{error}</span>
          <button onClick={onRefresh} style={retryButton}>Try again</button>
        </div>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>DATE</th>
                <th style={th}>TIME</th>
                <th style={th}>CUR</th>
                <th style={th}>IMPACT</th>
                <th style={{...th, minWidth: 260}}>EVENT</th>
                <th style={th}>ACTUAL</th>
                <th style={th}>FORECAST</th>
                <th style={th}>PREVIOUS</th>
                <th style={th}>NEXT</th>
                <th style={{...th, width: 38}}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(event => (
                <EventRows
                  key={event.id}
                  event={event}
                  now={now}
                  timezone={preferences.timezone}
                  expanded={expanded === event.id}
                  onExpand={() => setExpanded(current => current === event.id ? null : event.id)}
                />
              ))}
            </tbody>
          </table>
          {!filtered.length && <div style={empty}>No events match the current filters.</div>}
        </div>
      )}

      <div style={sourceBar}>
        <span>
          Source: <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer" style={sourceLink}>
            Forex Factory weekly export <ExternalLink size={10} />
          </a>
          {fetchedAt && ` · refreshed ${new Intl.DateTimeFormat('en-GB', {timeStyle: 'short'}).format(new Date(fetchedAt))}`}
        </span>
        <span>{limitations || 'Scheduled events can change. Verify at source before trading.'}</span>
      </div>
    </section>
  );
}

function EventRows({event, now, timezone, expanded, onExpand}: {
  event: MarketCalendarEvent;
  now: number;
  timezone: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const occurred = Date.parse(event.date) < now;
  return (
    <>
      <tr
        style={{
          ...row,
          background: event.goldRelevance === 'high' ? 'rgba(212,175,55,.045)' : '#0D0D0D',
          opacity: occurred ? .68 : 1,
        }}
      >
        <td style={td}>{formatEventDate(event.date, timezone)}</td>
        <td style={{...td, fontFamily: 'JetBrains Mono,monospace', color: '#DADADA'}}>{formatEventTime(event.date, timezone)}</td>
        <td style={{...td, fontWeight: 700, color: event.country === 'USD' ? '#D4AF37' : '#B7B7B7'}}>{event.country}</td>
        <td style={td}><span style={impactPill(event.impact)}><span style={{...impactDot, background: impactColor(event.impact)}} />{event.impact}</span></td>
        <td style={{...td, color: '#E2E2E2'}}>
          <button onClick={onExpand} aria-expanded={expanded} style={eventButton}>
            {event.title}
            {event.goldRelevance === 'high' && <span style={goldTag}>GOLD FOCUS</span>}
            <ChevronDown size={12} style={{marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : 'none'}} />
          </button>
        </td>
        <td style={{...td, color: event.actual !== '—' ? '#fff' : '#555'}}>{event.actual}</td>
        <td style={td}>{event.forecast}</td>
        <td style={td}>{event.previous}</td>
        <td style={{...td, color: occurred ? '#555' : '#D4AF37', whiteSpace: 'nowrap'}}>{countdown(event.date, now)}</td>
        <td style={td}>
          <button onClick={() => downloadReminder(event)} title="Download calendar reminder" aria-label={`Add reminder for ${event.title}`} style={smallIconButton}>
            <BellPlus size={13} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={10} style={detailCell}>
            <strong style={{color: '#D4AF37'}}>Why it is highlighted:</strong>{' '}
            {event.goldRelevance === 'high'
              ? 'This USD release is commonly monitored by gold traders. It does not predict direction.'
              : event.goldRelevance === 'medium'
                ? 'USD data can affect the macro environment around gold. Confirm the release and price reaction.'
                : 'This event provides broader market context.'}
            <button onClick={() => downloadReminder(event)} style={reminderButton}><BellPlus size={12} /> Download 15-minute reminder</button>
          </td>
        </tr>
      )}
    </>
  );
}

function impactColor(impact: CalendarImpact) {
  if (impact === 'High') return '#FF5364';
  if (impact === 'Medium') return '#F5A524';
  if (impact === 'Low') return '#F4D35E';
  return '#8A8A8A';
}

function impactPill(impact: CalendarImpact): React.CSSProperties {
  return {display: 'inline-flex', alignItems: 'center', gap: 5, color: impactColor(impact), fontSize: '.55rem'};
}

const panel: React.CSSProperties = {background: '#0D0D0D', border: '1px solid rgba(255,255,255,.07)'};
const toolbar: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.06)', background: '#111'};
const rangeTabs: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap'};
const filterButton: React.CSSProperties = {border: '1px solid transparent', background: 'transparent', color: '#737373', fontFamily: 'inherit', fontSize: '.56rem', padding: '7px 10px', cursor: 'pointer'};
const activeFilter: React.CSSProperties = {borderColor: 'rgba(212,175,55,.3)', color: '#D4AF37', background: 'rgba(212,175,55,.06)'};
const selectLabel: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 7, color: '#666', fontSize: '.48rem', letterSpacing: '1px'};
const select: React.CSSProperties = {background: '#080808', border: '1px solid rgba(255,255,255,.1)', color: '#BDBDBD', fontFamily: 'inherit', fontSize: '.56rem', padding: '7px 26px 7px 8px'};
const iconButton: React.CSSProperties = {display: 'grid', placeItems: 'center', width: 30, height: 30, border: '1px solid rgba(255,255,255,.1)', background: '#090909', color: '#888', cursor: 'pointer'};
const filterStrip: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.05)'};
const filterCaption: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 4, color: '#555', fontSize: '.47rem', letterSpacing: '1px'};
const chip: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(255,255,255,.09)', background: '#111', color: '#AAA', padding: '4px 7px', fontSize: '.5rem', cursor: 'pointer'};
const impactDot: React.CSSProperties = {display: 'inline-block', width: 6, height: 6, borderRadius: '50%'};
const table: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', fontSize: '.58rem'};
const th: React.CSSProperties = {padding: '8px 9px', textAlign: 'left', color: '#585858', fontSize: '.46rem', letterSpacing: '1px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,.07)', whiteSpace: 'nowrap'};
const row: React.CSSProperties = {borderBottom: '1px solid rgba(255,255,255,.045)'};
const td: React.CSSProperties = {padding: '8px 9px', color: '#888', verticalAlign: 'middle'};
const eventButton: React.CSSProperties = {width: '100%', display: 'flex', alignItems: 'center', gap: 7, border: 0, padding: 0, background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left', cursor: 'pointer'};
const goldTag: React.CSSProperties = {fontSize: '.4rem', letterSpacing: '1px', color: '#D4AF37', border: '1px solid rgba(212,175,55,.2)', padding: '2px 4px', whiteSpace: 'nowrap'};
const smallIconButton: React.CSSProperties = {border: 0, background: 'transparent', color: '#777', cursor: 'pointer', padding: 3};
const detailCell: React.CSSProperties = {padding: '10px 14px 12px 100px', background: '#10100E', color: '#777', lineHeight: 1.7, fontSize: '.55rem'};
const reminderButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 12, border: '1px solid rgba(212,175,55,.2)', background: 'rgba(212,175,55,.04)', color: '#D4AF37', padding: '5px 8px', fontFamily: 'inherit', fontSize: '.5rem', cursor: 'pointer'};
const empty: React.CSSProperties = {minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 9, color: '#666', fontSize: '.6rem', textAlign: 'center', padding: 20};
const retryButton: React.CSSProperties = {border: '1px solid rgba(212,175,55,.25)', background: 'rgba(212,175,55,.06)', color: '#D4AF37', padding: '7px 11px', cursor: 'pointer'};
const sourceBar: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px', borderTop: '1px solid rgba(255,255,255,.05)', color: '#505050', fontSize: '.48rem', lineHeight: 1.5};
const sourceLink: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 3, color: '#8FAFE8', textDecoration: 'none'};

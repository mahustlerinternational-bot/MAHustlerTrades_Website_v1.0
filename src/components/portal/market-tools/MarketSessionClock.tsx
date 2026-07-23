'use client';

import {Clock3, Globe2} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

import {
  MARKET_SESSIONS,
  findNextSessionTransition,
  getSessionLocalTime,
  isMarketSessionOpen,
} from '@/lib/market-tools/calculations';

function clockIn(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function countdown(target: Date | null, now: Date) {
  if (!target) return '—';
  const seconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return [
    days ? `${days}d` : '',
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(remainder).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ');
}

export default function MarketSessionClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const minuteKey = Math.floor(now.getTime() / 60_000);
  const states = useMemo(() => MARKET_SESSIONS.map(session => {
    const open = isMarketSessionOpen(now, session);
    return {
      session,
      open,
      transition: findNextSessionTransition(now, session),
    };
    // Recalculate expensive transition scanning once per minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [minuteKey]);
  const londonOpen = states.find(state => state.session.id === 'london')?.open;
  const newYorkOpen = states.find(state => state.session.id === 'new-york')?.open;

  return (
    <section style={panel}>
      <div style={panelHead}>
        <div>
          <p style={eyebrow}>GLOBAL LIQUIDITY</p>
          <h2 style={heading}><Clock3 size={17} color="#D4AF37" /> Market Session Clock</h2>
        </div>
        <div style={worldClocks}>
          <span><b>UTC</b> {clockIn(now, 'Etc/UTC')}</span>
          <span><b>DUBAI</b> {clockIn(now, 'Asia/Dubai')}</span>
        </div>
      </div>

      {londonOpen && newYorkOpen && (
        <div style={overlap}>
          <span style={{width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 12px #34D399'}} />
          LONDON / NEW YORK OVERLAP · TYPICALLY HIGHER LIQUIDITY
        </div>
      )}

      <div className="market-session-grid" style={sessionGrid}>
        {states.map(({session, open, transition}) => (
          <article key={session.id} style={{...sessionCard, borderColor: open ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.06)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start'}}>
              <div>
                <p style={{fontFamily: 'Cinzel,serif', fontSize: '.78rem', fontWeight: 700}}>{session.name}</p>
                <p style={{fontSize: '.58rem', color: '#666', marginTop: '4px'}}>{session.city} · {String(session.openMinute / 60).padStart(2, '0')}:00–{String(session.closeMinute / 60).padStart(2, '0')}:00 local</p>
              </div>
              <span style={{...status, color: open ? '#34D399' : '#777', borderColor: open ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.1)'}}>
                <span style={{width: 5, height: 5, borderRadius: '50%', background: open ? '#34D399' : '#555'}} />
                {open ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <p style={localTime}>{getSessionLocalTime(now, session)}</p>
            <div style={transitionRow}>
              <span>{open ? 'Closes in' : 'Opens in'}</span>
              <strong>{countdown(transition, now)}</strong>
            </div>
          </article>
        ))}
      </div>
      <div style={note}>
        <Globe2 size={13} />
        Session times automatically follow London and New York daylight-saving changes. Times are a forex market guide and do not account for every public holiday or broker schedule.
      </div>
    </section>
  );
}

const panel: React.CSSProperties = {background: '#111', border: '1px solid rgba(255,255,255,.06)'};
const panelHead: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', flexWrap: 'wrap'};
const eyebrow: React.CSSProperties = {fontSize: '.52rem', letterSpacing: '3px', color: '#D4AF37', marginBottom: '5px'};
const heading: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'};
const worldClocks: React.CSSProperties = {display: 'flex', gap: '14px', flexWrap: 'wrap', fontFamily: 'JetBrains Mono,monospace', fontSize: '.6rem', color: '#999'};
const overlap: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px', background: 'rgba(52,211,153,.05)', borderBottom: '1px solid rgba(52,211,153,.12)', color: '#34D399', fontSize: '.56rem', letterSpacing: '1.5px'};
const sessionGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '10px', padding: '16px'};
const sessionCard: React.CSSProperties = {background: '#0C0C0C', border: '1px solid', padding: '15px', minWidth: 0};
const status: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid', padding: '4px 7px', fontSize: '.48rem', letterSpacing: '1.3px', flexShrink: 0};
const localTime: React.CSSProperties = {fontFamily: 'JetBrains Mono,monospace', fontSize: '1.05rem', color: '#fff', marginTop: '18px'};
const transitionRow: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#666', fontSize: '.56rem', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.04)'};
const note: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#595959', fontSize: '.56rem', lineHeight: 1.6, padding: '0 18px 17px'};


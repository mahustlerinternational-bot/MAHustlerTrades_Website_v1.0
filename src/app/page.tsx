'use client';
// src/app/page.tsx — Root home page with full navigation
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ── Ticker data ── */
const ASSETS = [
  { sym: 'EURUSD', price: 1.0847,  up: true  },
  { sym: 'XAUUSD', price: 3241.5,  up: true  },
  { sym: 'BTCUSD', price: 98420,   up: false },
  { sym: 'NQ',     price: 22318,   up: true  },
  { sym: 'SPX',    price: 5847,    up: true  },
  { sym: 'GBPUSD', price: 1.2634,  up: false },
  { sym: 'ETHUSD', price: 3782,    up: true  },
  { sym: 'DXY',    price: 104.21,  up: false },
  { sym: 'USDJPY', price: 157.43,  up: true  },
  { sym: 'OIL',    price: 79.64,   up: false },
];

const WHY = [
  { icon: '⚡', title: 'Real-Time AI Signals',   body: 'Institutional-grade signals and live trade setups delivered to your dashboard via our Quant AI system before the masses react.' },
  { icon: '🎓', title: 'Elite Curriculum',        body: 'From foundational technicals to advanced order flow — our structured learning path creates confident, consistent traders.' },
  { icon: '🤝', title: 'Inner Circle Community',  body: 'Network with verified profitable traders. Share setups and collaborate in an exclusive environment for serious professionals.' },
  { icon: '📊', title: 'Live Trading Rooms',       body: 'Watch seasoned traders execute live. See exactly how institutional strategies are applied when it counts most.' },
  { icon: '🛡️', title: 'Risk Management First',   body: 'Every lesson is built on capital preservation. Protect your downside before chasing the upside.' },
  { icon: '🌐', title: 'Multi-Market Coverage',   body: 'Forex, Crypto, Indices, Stocks, Options — expertise across all major markets with instrument-specific frameworks.' },
];

const TESTIMONIALS = [
  { initials: 'AK', name: 'Ahmed K.',  role: 'Forex Trader · Dubai',   text: 'Within 90 days I went from break-even to consistently pulling 8–12% monthly returns. The ICT concepts here completely rewired how I see price action.' },
  { initials: 'SM', name: 'Sarah M.',  role: 'Options Trader · London', text: 'The live trading rooms are worth the entire membership alone. Watching professionals navigate volatile markets in real time is education you cannot find in any textbook.' },
  { initials: 'JR', name: 'James R.',  role: 'Crypto Trader · New York', text: 'Nothing compares to the depth and accountability inside this community. My trading journal and performance transformed completely within the first month.' },
];

const NAV_LINKS = [
  { label: 'Home',      href: '/'          },
  { label: 'Academy',   href: '/academy'   },
  { label: 'Quant AI',  href: '/quant-ai', isNew: true },
  { label: 'Events',    href: '/events'    },
  { label: 'Members',   href: '/portal/dashboard' },
];

export default function HomePage() {
  const router  = useRouter();
  const tickerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin-editable content from Site Settings — falls back to the defaults
  // below if nothing has been saved yet, or if the fetch fails.
  const [hero, setHero] = useState({
    badge_text:  'The Premier Trading Collective',
    headline:    'Master The Markets.',
    subheadline: 'Dominate Your Future.',
    sub_copy:    'Join an elite community of professional traders. Access institutional strategies, live AI-powered signals, and exclusive market intelligence.',
  });
  const [stats, setStats] = useState({
    members: '12,400+', volume: '$4.2B', satisfaction: '94%', instructors: '38', courses: '200+',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data?.hero)  setHero(h => ({ ...h, ...data.hero }));
        if (data?.stats) setStats(s => ({ ...s, ...data.stats }));
      })
      .catch(() => {}); // keep defaults on any failure
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Build live ticker
  useEffect(() => {
    let assets = ASSETS.map(a => ({ ...a, pct: '+0.00%' }));

    function render() {
      if (!tickerRef.current) return;
      const doubled = [...assets, ...assets];
      tickerRef.current.innerHTML = doubled.map(a => {
        const p = a.price > 100
          ? a.price.toLocaleString('en-US', { maximumFractionDigits: 2 })
          : a.price.toFixed(4);
        return `<div style="display:flex;gap:10px;align-items:center;flex-shrink:0">
          <span style="font-family:'Cinzel',serif;font-size:.75rem;color:#D4AF37;letter-spacing:1px">${a.sym}</span>
          <span style="font-size:.75rem;font-family:'JetBrains Mono',monospace">${p}</span>
          <span style="font-size:.72rem;font-family:'JetBrains Mono',monospace;color:${a.up ? '#00D084' : '#FF4757'}">${a.pct}</span>
        </div>`;
      }).join('');
    }
    render();

    const id = setInterval(() => {
      assets = assets.map(a => {
        const delta = (Math.random() - 0.48) * 0.002;
        return { ...a, price: a.price * (1 + delta), up: delta >= 0, pct: `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(2)}%` };
      });
      render();
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: '#0A0A0A', color: '#fff', fontFamily: 'Montserrat, sans-serif', minHeight: '100vh' }}>

      {/* ── NAVIGATION ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(10,10,10,0.97)' : 'rgba(10,10,10,0.88)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,175,55,0.18)',
        padding: '0 5%', transition: 'background .3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '2px', background: 'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MAHustler</div>
            <div style={{ fontSize: '.55rem', letterSpacing: '5px', color: 'rgba(212,175,55,0.6)', fontFamily: 'Cinzel,serif', marginTop: '-2px' }}>TRADES</div>
          </Link>

          {/* Desktop nav */}
          <ul style={{ display: 'flex', gap: '0.25rem', listStyle: 'none', alignItems: 'center' }}>
            {NAV_LINKS.map(({ label, href, isNew }) => (
              <li key={href}>
                <Link href={href} style={{
                  position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', color: '#B0B0B0', textDecoration: 'none',
                  fontSize: '.72rem', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase',
                  transition: 'color .25s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#B0B0B0')}
                >
                  {label}
                  {isNew && (
                    <span style={{ fontSize: '.48rem', letterSpacing: '1.5px', padding: '2px 5px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', fontWeight: 700, fontFamily: 'Cinzel,serif' }}>NEW</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link href="/portal" style={{
              background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', textDecoration: 'none',
              padding: '10px 22px', fontFamily: 'Cinzel,serif', fontSize: '.7rem', fontWeight: 700,
              letterSpacing: '2px', textTransform: 'uppercase',
            }}>
              Join the Elite
            </Link>
            <Link href="/admin/dashboard" style={{
              border: '1px solid rgba(255,255,255,0.12)', color: '#555', textDecoration: 'none',
              padding: '9px 16px', fontSize: '.65rem', letterSpacing: '1.5px', textTransform: 'uppercase',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070707', overflow: 'hidden', paddingTop: '72px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(212,175,55,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.04) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', width: '640px', height: '640px', background: 'radial-gradient(circle,rgba(212,175,55,0.11) 0%,transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'pulse 4s ease-in-out infinite' }} />
        <style>{`@keyframes pulse{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}}`}</style>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 5%', maxWidth: '900px' }}>
          <div style={{ display: 'inline-block', border: '1px solid rgba(212,175,55,.3)', padding: '6px 20px', fontFamily: 'Cinzel,serif', fontSize: '.65rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '2rem' }}>
            {hero.badge_text}
          </div>
          <h1 style={{ fontFamily: 'Cinzel,serif', fontSize: 'clamp(2.4rem,6vw,5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem' }}>
            {hero.headline}<br />
            <span style={{ background: 'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{hero.subheadline}</span>
          </h1>
          <p style={{ fontSize: '.95rem', color: '#B0B0B0', maxWidth: '620px', margin: '0 auto 2.5rem', lineHeight: 1.8, fontWeight: 300 }}>
            {hero.sub_copy}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/academy" style={{ background: 'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', color: '#000', textDecoration: 'none', padding: '15px 38px', fontFamily: 'Cinzel,serif', fontSize: '.8rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
              Explore the Academy
            </Link>
            <Link href="/portal" style={{ background: 'transparent', color: '#D4AF37', textDecoration: 'none', border: '1px solid rgba(212,175,55,.35)', padding: '14px 38px', fontFamily: 'Cinzel,serif', fontSize: '.8rem', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
              Members Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background: '#0D0D0D', borderTop: '1px solid rgba(212,175,55,.18)', borderBottom: '1px solid rgba(212,175,55,.18)', padding: '10px 0', overflow: 'hidden' }}>
        <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
        <div ref={tickerRef} style={{ display: 'flex', gap: '3rem', animation: 'ticker 30s linear infinite', whiteSpace: 'nowrap' }} />
      </div>

      {/* ── STATS ── */}
      <div style={{ background: 'linear-gradient(135deg,#0F0F0F,#1A1500)', borderBottom: '1px solid rgba(212,175,55,.18)', padding: '3rem 5%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '2rem', textAlign: 'center' }}>
        {[
          { num: stats.members,      lbl: 'Active Members'      },
          { num: stats.volume,       lbl: 'Total Member Volume' },
          { num: stats.satisfaction, lbl: 'Satisfaction Rate'   },
          { num: stats.instructors,  lbl: 'Expert Instructors'  },
          { num: stats.courses,      lbl: 'Courses & Sessions'  },
        ].map(({ num, lbl }) => (
          <div key={lbl}>
            <p style={{ fontFamily: 'Cinzel,serif', fontSize: '2.2rem', fontWeight: 700, background: 'linear-gradient(135deg,#FFD700,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{num}</p>
            <p style={{ fontSize: '.62rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#555', marginTop: '6px' }}>{lbl}</p>
          </div>
        ))}
      </div>

      {/* ── WHY ── */}
      <section style={{ padding: '88px 5%', background: '#0A0A0A' }}>
        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '.62rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '10px' }}>Why MAHustler</p>
        <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: '10px' }}>An Edge No One<br />Can Take From You</h2>
        <div style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg,#B8860B,#FFD700)', margin: '16px 0 40px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.5px', background: 'rgba(212,175,55,.15)' }}>
          {WHY.map(c => (
            <div key={c.title} style={{ background: '#1A1A1A', padding: '2.5rem 2rem', borderTop: '2px solid transparent', transition: 'all .3s', cursor: 'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#1F1F1F'; (e.currentTarget as HTMLDivElement).style.borderTopColor = '#D4AF37'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#1A1A1A'; (e.currentTarget as HTMLDivElement).style.borderTopColor = 'transparent'; }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1.25rem' }}>{c.icon}</div>
              <h3 style={{ fontFamily: 'Cinzel,serif', fontSize: '.95rem', fontWeight: 600, color: '#FFD700', marginBottom: '.6rem', letterSpacing: '.5px' }}>{c.title}</h3>
              <p style={{ fontSize: '.8rem', color: '#B0B0B0', lineHeight: 1.7, fontWeight: 300 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUANT AI CALLOUT ── */}
      <section style={{ padding: '80px 5%', background: '#0D0D0D', borderTop: '1px solid rgba(212,175,55,.1)', borderBottom: '1px solid rgba(212,175,55,.1)' }}>
        <div style={{ maxWidth: '900px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: 'Cinzel,serif', fontSize: '.62rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '10px' }}>Quant AI System</p>
            <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: '16px' }}>
              Institutional Intelligence.<br />
              <span style={{ background: 'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Quantized. Live.</span>
            </h2>
            <p style={{ fontSize: '.84rem', color: '#B0B0B0', lineHeight: 1.8, fontWeight: 300, marginBottom: '24px' }}>Our dual-engine AI system combines hard-coded algorithmic execution with locally-deployed quantized models — delivering live signals, regime probability output, and dynamic caution zone alerts.</p>
            <Link href="/quant-ai" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', textDecoration: 'none', padding: '12px 28px', fontFamily: 'Cinzel,serif', fontSize: '.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Explore Quant AI →
            </Link>
          </div>
          <div style={{ background: '#111', border: '1px solid rgba(212,175,55,.2)', padding: '24px' }}>
            {[
              { lbl: 'TP',    val: '3,285.00', col: '#00D084', bg: 'rgba(0,208,132,.06)', bl: '#00D084' },
              { lbl: 'ENTRY', val: '3,241.50', col: '#FFD700', bg: 'rgba(212,175,55,.07)', bl: '#D4AF37' },
              { lbl: 'SL',    val: '3,225.00', col: '#FF4757', bg: 'rgba(255,71,87,.06)',  bl: '#FF4757' },
            ].map(r => (
              <div key={r.lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: r.bg, borderLeft: `3px solid ${r.bl}`, marginBottom: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ fontSize: '.58rem', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700, color: r.col }}>{r.lbl}</span>
                <span style={{ fontSize: '.9rem', fontWeight: 600, color: r.col }}>{r.val}</span>
              </div>
            ))}
            <p style={{ fontSize: '.7rem', color: '#555', marginTop: '12px', textAlign: 'center', letterSpacing: '1px' }}>XAUUSD · LONG · R:R 1:1.8</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '88px 5%', background: '#0A0A0A' }}>
        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '.62rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '10px' }}>Success Stories</p>
        <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: '10px' }}>Members Who Changed<br />Their Financial Destiny</h2>
        <div style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg,#B8860B,#FFD700)', margin: '16px 0 40px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: '1.5rem' }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: '#1E1E1E', border: '1px solid rgba(212,175,55,.2)', padding: '2rem', position: 'relative' }}>
              <span style={{ fontFamily: 'Cinzel,serif', fontSize: '5rem', color: '#B8860B', position: 'absolute', top: '-10px', left: '15px', lineHeight: 1, opacity: .35 }}>&ldquo;</span>
              <div style={{ fontSize: '.85rem', color: '#FFD700', marginBottom: '.75rem' }}>★★★★★</div>
              <p style={{ fontSize: '.85rem', color: '#B0B0B0', lineHeight: 1.8, marginBottom: '1.5rem', paddingTop: '1rem', fontWeight: 300 }}>{t.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel,serif', fontSize: '.78rem', fontWeight: 700, color: '#000', flexShrink: 0 }}>{t.initials}</div>
                <div>
                  <p style={{ fontSize: '.85rem', fontWeight: 600 }}>{t.name}</p>
                  <p style={{ fontSize: '.7rem', color: '#D4AF37', letterSpacing: '1px', marginTop: '2px' }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section style={{ padding: '80px 5%', background: '#070707', textAlign: 'center', borderTop: '1px solid rgba(212,175,55,.15)' }}>
        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '.65rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '16px' }}>Ready to Begin</p>
        <h2 style={{ fontFamily: 'Cinzel,serif', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, marginBottom: '14px' }}>Join the Elite Today</h2>
        <p style={{ fontSize: '.87rem', color: '#B0B0B0', maxWidth: '480px', margin: '0 auto 36px', lineHeight: 1.8, fontWeight: 300 }}>Get access to live AI signals, institutional-grade courses, and an exclusive community of serious traders.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/portal" style={{ background: 'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', color: '#000', textDecoration: 'none', padding: '16px 40px', fontFamily: 'Cinzel,serif', fontSize: '.8rem', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            Join the Elite
          </Link>
          <Link href="/portal/ib" style={{ background: 'transparent', color: '#D4AF37', textDecoration: 'none', border: '1px solid rgba(212,175,55,.35)', padding: '15px 40px', fontFamily: 'Cinzel,serif', fontSize: '.8rem', fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            Free via IB Access
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#070707', borderTop: '1px solid rgba(212,175,55,.25)', padding: '4rem 5% 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <p style={{ fontFamily: 'Cinzel,serif', fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>MAHustler Trades</p>
            <p style={{ fontSize: '.8rem', color: '#555', lineHeight: 1.7, maxWidth: '280px', fontWeight: 300 }}>The premier destination for serious traders who demand institutional-grade education and AI-powered intelligence.</p>
          </div>
          {[
            { heading: 'Platform', links: [['Academy', '/academy'], ['Quant AI', '/quant-ai'], ['Events', '/events'], ['Members', '/portal/dashboard']] },
            { heading: 'Portal', links: [['Login', '/portal'], ['My Courses', '/portal/courses'], ['My Events', '/portal/events'], ['IB Access', '/portal/ib']] },
            { heading: 'Admin', links: [['Dashboard', '/admin/dashboard'], ['Members', '/admin/members'], ['Courses', '/admin/courses'], ['Settings', '/admin/settings']] },
          ].map(col => (
            <div key={col.heading}>
              <h4 style={{ fontFamily: 'Cinzel,serif', fontSize: '.62rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '1.25rem' }}>{col.heading}</h4>
              {col.links.map(([label, href]) => (
                <Link key={label} href={href} style={{ display: 'block', fontSize: '.78rem', color: '#555', textDecoration: 'none', marginBottom: '.6rem', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.7rem', color: '#444', flexWrap: 'wrap', gap: '1rem' }}>
          <span>© 2026 MAHustler Trades. All rights reserved. Trading involves substantial risk of loss.</span>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: '.6rem', letterSpacing: '4px', color: 'rgba(212,175,55,0.5)' }}>ELITE · EDUCATED · EMPOWERED</span>
        </div>
      </footer>

    </div>
  );
}

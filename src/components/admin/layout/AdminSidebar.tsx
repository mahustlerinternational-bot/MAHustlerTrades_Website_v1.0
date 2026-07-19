'use client';
// src/components/admin/layout/AdminSidebar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/store';

const NAV = [
  { label: 'Dashboard',       href: '/admin/dashboard',         emoji: '📊' },
  { label: 'Members',         href: '/admin/members',           emoji: '👥' },
  { label: 'Membership',      href: '/admin/packages',          emoji: '💳' },
  { label: 'Courses',         href: '/admin/courses',           emoji: '📚' },
  { label: 'Coupons',         href: '/admin/coupons',           emoji: '🏷️' },
  { label: 'Events',          href: '/admin/events',            emoji: '📅' },
  { label: 'Quant AI',        href: '/admin/quant',             emoji: '⚡' },
  { label: 'IB Applications', href: '/admin/ib-registrations',  emoji: '🔗' },
  { label: 'IB Brokers',      href: '/admin/brokers',           emoji: '🏦' },
  { label: 'Site Settings',   href: '/admin/settings',          emoji: '⚙️' },
  { label: 'AI Support',      href: '/admin/support',           emoji: '🤖' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      window.location.replace('/portal?tab=login');
    }
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, height: '100%', width: '256px',
      background: '#0D0D0D', borderRight: '1px solid rgba(212,175,55,0.15)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px', background: 'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MAHustler</p>
        <p style={{ fontSize: '0.55rem', letterSpacing: '4px', color: 'rgba(212,175,55,0.5)', fontFamily: 'Cinzel,serif', marginTop: '2px' }}>ADMIN PANEL</p>
      </div>

      {/* Admin user */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'Cinzel,serif', color: '#000', flexShrink: 0 }}>
            {user?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name ?? 'Admin'}</p>
            <p style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#D4AF37' }}>Administrator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        <p style={{ fontSize: '0.6rem', letterSpacing: '3px', color: '#444', textTransform: 'uppercase', padding: '4px 12px', marginBottom: '8px' }}>Management</p>
        {NAV.map(({ label, href, emoji }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', marginBottom: '2px',
              fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.3px',
              textDecoration: 'none', borderRadius: '2px',
              borderLeft: active ? '2px solid #D4AF37' : '2px solid transparent',
              background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
              color: active ? '#D4AF37' : '#888',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = '#D4AF37'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(212,175,55,0.04)'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = '#888'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; } }}
            >
              <span style={{ fontSize: '14px' }}>{emoji}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', fontSize: '0.75rem', color: '#888', textDecoration: 'none', marginBottom: '4px' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
          onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
          <span>🌐</span> View Site
        </Link>
        <button onClick={handleLogout} disabled={loggingOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', fontSize: '0.75rem', color: '#888', background: 'none', border: 'none', cursor:loggingOut?'wait':'pointer', textAlign: 'left', opacity:loggingOut?.65:1 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FF4757')}
          onMouseLeave={e => (e.currentTarget.style.color = '#888')}>
          <span>🚪</span> {loggingOut ? 'Signing Out…' : 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}

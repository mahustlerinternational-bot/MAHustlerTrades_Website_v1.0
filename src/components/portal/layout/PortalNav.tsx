'use client';
// src/components/portal/layout/PortalNav.tsx
// Top navigation bar that sits above the portal sidebar
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function PortalNav() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, height: '72px',
      background: scrolled ? 'rgba(10,10,10,0.97)' : 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(212,175,55,0.18)',
      padding: '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'background .3s',
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{ fontFamily: 'Cinzel,serif', fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '2px' }}>MAHustler</div>
        <div style={{ fontFamily: 'Cinzel,serif', fontSize: '0.52rem', letterSpacing: '4px', color: 'rgba(212,175,55,0.5)', marginTop: '-2px' }}>MEMBERS PORTAL</div>
      </Link>

      {/* Quick nav links */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {[
          ['/', 'Home'],
          ['/academy', 'Academy'],
          ['/quant-ai', 'Quant AI'],
          ['/events', 'Events'],
        ].map(([href, label]) => (
          <Link key={href} href={href} style={{
            color: '#888', textDecoration: 'none',
            fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500,
            transition: 'color .2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
            onMouseLeave={e => (e.currentTarget.style.color = '#888')}
          >{label}</Link>
        ))}
      </div>

      {/* User info + sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ThemeToggle compact />
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel,serif', fontSize: '0.75rem', fontWeight: 700, color: '#000', overflow: 'hidden', flexShrink: 0 }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div style={{ lineHeight: 1 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{user.full_name ?? 'Member'}</p>
              <p style={{ fontSize: '0.58rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#D4AF37', marginTop: '2px' }}>
                {(user as any)?.package?.name ?? 'Member'}
              </p>
            </div>
          </div>
        )}
        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.08)',
          color: '#555', padding: '7px 16px', fontSize: '0.65rem',
          letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,71,87,.4)'; (e.currentTarget as HTMLButtonElement).style.color = '#FF4757'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

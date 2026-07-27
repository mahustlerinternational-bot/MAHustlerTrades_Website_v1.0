'use client';
// src/components/admin/layout/AdminNav.tsx
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/store';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme/ThemeToggle';

export default function AdminNav() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: '256px', right: 0, zIndex: 100, height: '64px',
      background: 'rgba(13,13,13,0.97)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(212,175,55,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 2rem',
    }}>
      {/* Left: breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#555' }}>MAHustler Trades</span>
        <span style={{ color: '#333', fontSize: '0.7rem' }}>/</span>
        <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#D4AF37' }}>Admin</span>
      </div>

      {/* Right: user + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ThemeToggle />
        <Link href="/" style={{ fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#555', textDecoration: 'none', transition: 'color .2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#D4AF37')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}>
          View Site →
        </Link>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel,serif', fontSize: '0.7rem', fontWeight: 700, color: '#000' }}>
              {user.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#888' }}>{user.full_name ?? 'Admin'}</span>
          </div>
        )}
        <button onClick={handleLogout} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: '#555',
          padding: '6px 14px', fontSize: '0.62rem', letterSpacing: '1.5px',
          textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all .2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF4757'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,71,87,.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.06)'; }}>
          Sign Out
        </button>
      </div>
    </header>
  );
}

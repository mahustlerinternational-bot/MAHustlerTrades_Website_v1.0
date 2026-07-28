'use client';
// src/components/portal/layout/PortalNav.tsx
// Top navigation bar that sits above the portal sidebar
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/store';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import styles from './PortalNav.module.css';

export default function PortalNav() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
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
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`} aria-label="Member portal header">
      <Link href="/portal/dashboard" className={styles.brand} aria-label="Member portal dashboard">
        <div className={styles.brandName}>MAHustler</div>
        <div className={styles.brandLabel}>MEMBERS PORTAL</div>
      </Link>

      <div className={styles.actions}>
        <ThemeToggle compact />
        {user && (
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" />
                : user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className={styles.identityText}>
              <p className={styles.memberName}>{user.full_name ?? 'Member'}</p>
              <p className={styles.memberTier}>
                {(user as any)?.package?.name ?? 'Member'}
              </p>
            </div>
          </div>
        )}
        {user?.role === 'admin' && (
          <Link href="/admin/dashboard" className={styles.adminLink}>
            <span className={styles.adminText}>Admin Panel</span>
          </Link>
        )}
        <button onClick={handleLogout} className={styles.signOut}>
          <span className={styles.signOutText}>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

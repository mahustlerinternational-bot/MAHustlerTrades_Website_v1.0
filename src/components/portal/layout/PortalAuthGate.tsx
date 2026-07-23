'use client';
// src/components/portal/layout/PortalAuthGate.tsx
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter }    from 'next/navigation';
import { useAuthStore, useAuthInit }     from '@/lib/auth/store';
import AuthModal                         from '@/components/portal/layout/AuthModal';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#555' }}>Loading Portal...</p>
      </div>
    </div>
  );
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const initAuth            = useAuthInit();
  const searchParams        = useSearchParams();
  const router              = useRouter();
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    initAuth().finally(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading while initialising
  if (!ready || isLoading) return <LoadingScreen />;

  // Not authenticated → show auth modal
  if (!user) {
    const rawReturn = searchParams.get('returnTo') ?? '/portal/dashboard';
    const returnTo  = rawReturn === '/portal' ? '/portal/dashboard' : rawReturn;
    const tab       = searchParams.get('tab') ?? 'login';
    const notice    = searchParams.get('notice') ?? undefined;
    return (
      <AuthModal
        defaultTab={tab as 'login' | 'register'}
        returnTo={returnTo}
        notice={notice}
      />
    );
  }

  // Authenticated → render children
  return <>{children}</>;
}

export default function PortalAuthGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthGateInner>{children}</AuthGateInner>
    </Suspense>
  );
}

'use client';
// src/app/error.tsx — Global error boundary
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0A', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Montserrat, sans-serif', padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '24px' }}>⚠️</div>
        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '0.6rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#FF4757', marginBottom: '12px' }}>Runtime Error</p>
        <h1 style={{ fontFamily: 'Cinzel,serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: '12px' }}>Something went wrong</h1>
        <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, marginBottom: '8px' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.7rem', color: '#555', fontFamily: 'JetBrains Mono, monospace', marginBottom: '24px' }}>
            Error ID: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 'none', padding: '12px 28px', fontFamily: 'Cinzel,serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Try Again
          </button>
          <Link href="/" style={{ background: 'transparent', color: '#D4AF37', textDecoration: 'none', border: '1px solid rgba(212,175,55,0.35)', padding: '11px 28px', fontFamily: 'Cinzel,serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('Admin error:', error); }, [error]);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat,sans-serif', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <p style={{ fontFamily: 'Cinzel,serif', fontSize: '0.6rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#FF4757', marginBottom: '12px' }}>Admin Error</p>
        <h1 style={{ fontFamily: 'Cinzel,serif', fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px' }}>Page Failed to Load</h1>
        <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.7, marginBottom: '24px', background: 'rgba(255,71,87,0.05)', border: '1px solid rgba(255,71,87,0.2)', padding: '12px', borderRadius: '2px', fontFamily: 'JetBrains Mono,monospace' }}>
          {error.message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={reset} style={{ background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 'none', padding: '10px 24px', fontFamily: 'Cinzel,serif', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Retry</button>
          <Link href="/admin/dashboard" style={{ color: '#D4AF37', textDecoration: 'none', border: '1px solid rgba(212,175,55,0.35)', padding: '9px 24px', fontFamily: 'Cinzel,serif', fontSize: '0.7rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Dashboard</Link>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#444', marginTop: '16px' }}>
          Tip: Check that your <code style={{ color: '#D4AF37' }}>.env.local</code> Supabase keys are configured correctly.
        </p>
      </div>
    </div>
  );
}

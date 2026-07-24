'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {CheckCircle2, Loader2, MailCheck, RefreshCw, ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';

import {useAuthStore} from '@/lib/auth/store';
import {supabase} from '@/lib/supabase/client';
import {authFetch} from '@/lib/utils/authFetch';

export type PendingEmailVerification = {
  email: string;
  fullName: string;
};

const PENDING_KEY = 'mahustler-pending-email-verification';

export function savePendingEmailVerification(value: PendingEmailVerification | null) {
  if (typeof window === 'undefined') return;
  if (value) window.localStorage.setItem(PENDING_KEY, JSON.stringify(value));
  else window.localStorage.removeItem(PENDING_KEY);
}

export function readPendingEmailVerification(): PendingEmailVerification | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? 'null');
    if (!value || typeof value.email !== 'string') return null;
    return {
      email: value.email,
      fullName: typeof value.fullName === 'string' ? value.fullName : '',
    };
  } catch {
    return null;
  }
}

export default function EmailVerificationPanel({
  pending,
  returnTo,
  onChangeEmail,
}: {
  pending: PendingEmailVerification;
  returnTo: string;
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const {setUser} = useAuthStore();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown(current => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function confirmationRedirect() {
    const url = new URL('/auth/confirm', window.location.origin);
    url.searchParams.set('next', returnTo);
    return url.toString();
  }

  async function activateProfile() {
    const response = await authFetch('/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({full_name: pending.fullName}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Profile activation failed');
    setUser(result.profile);
  }

  async function verify() {
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) {
      toast.error('Enter the complete six-digit verification code');
      return;
    }
    setVerifying(true);
    try {
      const {data, error} = await supabase.auth.verifyOtp({
        email: pending.email,
        token,
        type: 'email',
      });
      if (error || !data.session) throw error ?? new Error('Verification did not create a session');
      await activateProfile();
      savePendingEmailVerification(null);
      toast.success('Email verified. Welcome to MAHustler Trades!');
      router.refresh();
      router.push(returnTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Email verification failed');
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      const {error} = await supabase.auth.resend({
        type: 'signup',
        email: pending.email,
        options: {emailRedirectTo: confirmationRedirect()},
      });
      if (error) throw error;
      setCooldown(60);
      toast.success('A new verification email has been sent');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification email could not be resent';
      toast.error(/rate|limit|seconds/i.test(message) ? 'Please wait before requesting another email' : message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{textAlign: 'center'}}>
      <div style={mailSeal}><MailCheck size={29} /></div>
      <p style={eyebrow}>ONE SECURE STEP REMAINS</p>
      <h2 style={title}>Check Your Email</h2>
      <p style={copy}>
        Thank you for joining MAHustler Trades. We sent a verification message to
      </p>
      <p style={email}>{pending.email}</p>

      <div style={codePanel}>
        <label style={codeLabel}>ENTER YOUR 6-DIGIT CODE</label>
        <input
          value={code}
          onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={event => {
            if (event.key === 'Enter') void verify();
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          aria-label="Six-digit email verification code"
          style={codeInput}
        />
        <button onClick={() => void verify()} disabled={verifying} style={{...verifyButton, opacity: verifying ? 0.6 : 1}}>
          {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {verifying ? 'Verifying…' : 'Verify & Enter Portal'}
        </button>
      </div>

      <p style={linkHint}>
        You can also click <strong>Verify My Email Address</strong> inside the email.
        Check Spam or Promotions if it is not in your inbox.
      </p>

      <div style={actions}>
        <button onClick={() => void resend()} disabled={resending || cooldown > 0} style={textButton}>
          {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </button>
        <button onClick={onChangeEmail} style={textButton}>Use a different email</button>
      </div>

      <div style={security}>
        <ShieldCheck size={17} />
        <span>Never share your password or verification code with anyone.</span>
      </div>
    </div>
  );
}

const mailSeal: React.CSSProperties = {width: 64, height: 64, margin: '0 auto 16px', display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#D4AF37', border: '1px solid rgba(212,175,55,.4)', background: 'radial-gradient(circle,rgba(212,175,55,.14),rgba(212,175,55,.03))', boxShadow: '0 0 35px rgba(212,175,55,.1)'};
const eyebrow: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.52rem', letterSpacing: '3px', color: '#D4AF37'};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1.35rem', marginTop: '8px'};
const copy: React.CSSProperties = {fontSize: '.7rem', color: '#777', lineHeight: 1.65, marginTop: '10px'};
const email: React.CSSProperties = {fontFamily: 'JetBrains Mono,monospace', color: '#D4AF37', fontSize: '.72rem', overflowWrap: 'anywhere', marginTop: '5px'};
const codePanel: React.CSSProperties = {marginTop: '20px', padding: '17px', border: '1px solid rgba(212,175,55,.2)', background: 'linear-gradient(135deg,rgba(212,175,55,.055),rgba(255,255,255,.012))'};
const codeLabel: React.CSSProperties = {display: 'block', color: '#777', fontSize: '.5rem', letterSpacing: '2px', marginBottom: '9px'};
const codeInput: React.CSSProperties = {width: '100%', padding: '12px', border: '1px solid rgba(212,175,55,.34)', outline: 'none', background: '#090909', color: '#FFD75A', fontFamily: 'JetBrains Mono,monospace', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', letterSpacing: '10px'};
const verifyButton: React.CSSProperties = {width: '100%', marginTop: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', border: 0, cursor: 'pointer', color: '#050505', background: 'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', fontFamily: 'Cinzel,serif', fontSize: '.62rem', fontWeight: 800, letterSpacing: '1.2px'};
const linkHint: React.CSSProperties = {marginTop: '15px', color: '#5F5F5F', fontSize: '.6rem', lineHeight: 1.65};
const actions: React.CSSProperties = {display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '15px'};
const textButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '5px', padding: 0, border: 0, background: 'none', color: '#A68C3C', fontFamily: 'inherit', fontSize: '.58rem', cursor: 'pointer'};
const security: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginTop: '19px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.05)', color: '#557166', fontSize: '.55rem'};

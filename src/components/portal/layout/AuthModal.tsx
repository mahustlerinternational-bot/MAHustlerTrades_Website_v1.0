'use client';
// src/components/portal/layout/AuthModal.tsx
import { useEffect, useState } from 'react';
import { useRouter }      from 'next/navigation';
import { useForm }        from 'react-hook-form';
import { zodResolver }    from '@hookform/resolvers/zod';
import { z }              from 'zod';
import { toast }          from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore }   from '@/lib/auth/store';
import EmailVerificationPanel, {
  readPendingEmailVerification,
  savePendingEmailVerification,
  type PendingEmailVerification,
} from '@/components/portal/layout/EmailVerificationPanel';
import {authFetch} from '@/lib/utils/authFetch';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
const registerSchema = z.object({
  full_name: z.string().min(2, 'At least 2 characters'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'At least 8 characters'),
  confirm:   z.string(),
}).refine(d => d.password === d.confirm, { message:'Passwords do not match', path:['confirm'] });

type LoginForm    = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

interface Props {
  defaultTab: 'login' | 'register';
  returnTo: string;
  notice?: string;
}

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Error && value.message) return value.message;
  if (value && typeof value === 'object') {
    const candidate = value as { message?: unknown; error?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
    if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
  }
  return fallback;
}

const iS: React.CSSProperties = {
  width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)',
  color:'#fff', fontSize:'.82rem', padding:'11px 14px', outline:'none',
  fontFamily:'inherit', transition:'border-color .25s, background .25s', boxSizing:'border-box',
};

export default function AuthModal({ defaultTab, returnTo, notice }: Props) {
  const router    = useRouter();
  const { setUser } = useAuthStore();
  const [tab, setTab]       = useState<'login'|'register'>(defaultTab);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] =
    useState<PendingEmailVerification | null>(null);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const regForm   = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const safeReturn =
    returnTo.startsWith('/portal') && !returnTo.startsWith('//') && returnTo !== '/portal'
      ? returnTo
      : '/portal/dashboard';

  useEffect(() => {
    setPendingVerification(readPendingEmailVerification());
  }, []);

  async function onLogin(values: LoginForm) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        const normalized = error.message.toLowerCase();
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Load failed')) {
          toast.error('Cannot reach authentication server. Check your Supabase URL in .env.local and restart the server.');
        } else if (normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed')) {
          const pending = {email: values.email.trim().toLowerCase(), fullName: ''};
          savePendingEmailVerification(pending);
          setPendingVerification(pending);
          toast.error('Verify your email address before signing in.');
        } else if (error.message.includes('Invalid login')) {
          toast.error('Invalid email or password.');
        } else { toast.error(error.message); }
        return;
      }
      // .maybeSingle() instead of .single() — older accounts created before the
      // profile-creation fix may not have a profiles row yet. Don't hard-fail login.
      let { data: profile } = await supabase.from('profiles').select('*, package:packages(name,slug)').eq('id', data.user!.id).maybeSingle();
      if (!profile) {
        const completion = await authFetch('/api/auth/register', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            full_name: String(data.user?.user_metadata?.full_name ?? ''),
          }),
        });
        const result = await completion.json();
        if (!completion.ok) throw new Error(result.error ?? 'Profile activation failed');
        profile = result.profile;
      }
      setUser(profile as any);
      savePendingEmailVerification(null);
      toast.success('Welcome back!');
      setTimeout(() => { router.refresh(); router.push(safeReturn); }, 150);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to sign in. Please check your connection and try again.'));
    } finally { setLoading(false); }
  }

  async function onRegister(values: RegisterForm) {
    setLoading(true);
    try {
      const email = values.email.trim().toLowerCase();
      const fullName = values.full_name.trim();
      const redirect = new URL('/auth/confirm', window.location.origin);
      redirect.searchParams.set('next', safeReturn);
      const {data, error} = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {full_name: fullName},
          emailRedirectTo: redirect.toString(),
        },
      });
      if (error) throw error;
      if (data.session) {
        await supabase.auth.signOut({scope: 'local'});
        throw new Error(
          'Email confirmation is not enforced in Supabase. Enable Confirm Email before accepting registrations.',
        );
      }
      const pending = {email, fullName};
      savePendingEmailVerification(pending);
      setPendingVerification(pending);
      toast.success('Account created. Check your email to verify your address.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to create your account. Please check your connection and try again.'));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#070707', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', fontFamily:'Montserrat,sans-serif', position:'relative', overflow:'hidden' }}>
      {/* Background grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(212,175,55,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.03) 1px,transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />
      {/* Gold glow */}
      <div style={{ position:'absolute', width:'500px', height:'500px', background:'radial-gradient(circle,rgba(212,175,55,0.06) 0%,transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:2, width:'100%', maxWidth:'420px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'1.4rem', fontWeight:700, background:'linear-gradient(135deg,#FFD700,#D4AF37,#B8860B)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'3px' }}>MAHustler</p>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.55rem', letterSpacing:'6px', color:'rgba(212,175,55,.4)', marginTop:'2px' }}>MEMBERS PORTAL</p>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(17,17,17,.95)', border:'1px solid rgba(212,175,55,.2)', backdropFilter:'blur(20px)' }}>
          {!pendingVerification && (
            <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              {(['login','register'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex:1, padding:'14px', background:'none', border:'none', cursor:'pointer',
                  fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'3px', textTransform:'uppercase',
                  color: tab===t ? '#D4AF37' : '#555',
                  borderBottom: tab===t ? '2px solid #D4AF37' : '2px solid transparent',
                  marginBottom:'-1px', transition:'all .2s',
                }}>{t === 'login' ? 'Sign In' : 'Register'}</button>
              ))}
            </div>
          )}

          <div style={{ padding:'2rem' }}>
            {notice === 'admin-session' && (
              <div style={{ marginBottom:'1.2rem', padding:'11px 13px', background:'rgba(212,175,55,.06)', border:'1px solid rgba(212,175,55,.22)', color:'#C8AA55', fontSize:'.68rem', lineHeight:1.6 }}>
                Your browser switched to a member session. Sign in again with your administrator
                account to continue. Use a separate browser or private window when testing admin
                and member accounts at the same time.
              </div>
            )}
            {notice === 'email-verification-failed' && !pendingVerification && (
              <div style={{ marginBottom:'1.2rem', padding:'11px 13px', background:'rgba(255,71,87,.06)', border:'1px solid rgba(255,71,87,.22)', color:'#D98289', fontSize:'.68rem', lineHeight:1.6 }}>
                The verification link is invalid or expired. Sign in to request a new email, or
                register again using the same address.
              </div>
            )}
            {pendingVerification && (
              <EmailVerificationPanel
                pending={pendingVerification}
                returnTo={safeReturn}
                onChangeEmail={() => {
                  savePendingEmailVerification(null);
                  setPendingVerification(null);
                  setTab('register');
                }}
              />
            )}
            {/* ── Login ── */}
            {!pendingVerification && tab === 'login' && (
              <form onSubmit={loginForm.handleSubmit(onLogin)} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div>
                  <label style={lblS}>Email Address</label>
                  <input {...loginForm.register('email')} type="email" placeholder="your@email.com" style={iS}
                    onFocus={e => { e.currentTarget.style.borderColor='rgba(212,175,55,.5)'; e.currentTarget.style.background='rgba(212,175,55,.04)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.background='rgba(255,255,255,.04)'; }} />
                  {loginForm.formState.errors.email && <p style={errS}>{loginForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label style={lblS}>Password</label>
                  <div style={{ position:'relative' }}>
                    <input {...loginForm.register('password')} type={showPw ? 'text' : 'password'} placeholder="Your password" style={{ ...iS, paddingRight:'40px' }}
                      onFocus={e => { e.currentTarget.style.borderColor='rgba(212,175,55,.5)'; e.currentTarget.style.background='rgba(212,175,55,.04)'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.background='rgba(255,255,255,.04)'; }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#555', fontSize:'13px', padding:0 }}
                      onMouseEnter={e => (e.currentTarget.style.color='#D4AF37')} onMouseLeave={e => (e.currentTarget.style.color='#555')}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && <p style={errS}>{loginForm.formState.errors.password.message}</p>}
                </div>
                <button type="submit" disabled={loading} style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', color:'#000', border:'none', padding:'13px', fontFamily:'Cinzel,serif', fontSize:'.75rem', fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase', cursor:'pointer', opacity:loading?.6:1, transition:'opacity .2s', marginTop:'4px' }}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
                <p style={{ textAlign:'center', fontSize:'.72rem', color:'#555' }}>
                  No account?{' '}
                  <button type="button" onClick={() => setTab('register')} style={{ background:'none', border:'none', color:'#D4AF37', cursor:'pointer', fontSize:'.72rem', fontFamily:'inherit' }}>Register free →</button>
                </p>
              </form>
            )}

            {/* ── Register ── */}
            {!pendingVerification && tab === 'register' && (
              <form onSubmit={regForm.handleSubmit(onRegister)} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label style={lblS}>Full Name</label>
                  <input {...regForm.register('full_name')} placeholder="Your full name" style={iS}
                    onFocus={e => { e.currentTarget.style.borderColor='rgba(212,175,55,.5)'; e.currentTarget.style.background='rgba(212,175,55,.04)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.background='rgba(255,255,255,.04)'; }} />
                  {regForm.formState.errors.full_name && <p style={errS}>{regForm.formState.errors.full_name.message}</p>}
                </div>
                <div>
                  <label style={lblS}>Email Address</label>
                  <input {...regForm.register('email')} type="email" placeholder="your@email.com" style={iS}
                    onFocus={e => { e.currentTarget.style.borderColor='rgba(212,175,55,.5)'; e.currentTarget.style.background='rgba(212,175,55,.04)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.background='rgba(255,255,255,.04)'; }} />
                  {regForm.formState.errors.email && <p style={errS}>{regForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label style={lblS}>Password</label>
                  <div style={{ position:'relative' }}>
                    <input {...regForm.register('password')} type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" style={{ ...iS, paddingRight:'40px' }}
                      onFocus={e => { e.currentTarget.style.borderColor='rgba(212,175,55,.5)'; e.currentTarget.style.background='rgba(212,175,55,.04)'; }}
                      onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.background='rgba(255,255,255,.04)'; }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#555', fontSize:'13px', padding:0 }}>{showPw ? '🙈' : '👁️'}</button>
                  </div>
                  {regForm.formState.errors.password && <p style={errS}>{regForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label style={lblS}>Confirm Password</label>
                  <input {...regForm.register('confirm')} type="password" placeholder="Repeat password" style={iS}
                    onFocus={e => { e.currentTarget.style.borderColor='rgba(212,175,55,.5)'; e.currentTarget.style.background='rgba(212,175,55,.04)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.background='rgba(255,255,255,.04)'; }} />
                  {regForm.formState.errors.confirm && <p style={errS}>{regForm.formState.errors.confirm.message}</p>}
                </div>
                <button type="submit" disabled={loading} style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', color:'#000', border:'none', padding:'13px', fontFamily:'Cinzel,serif', fontSize:'.75rem', fontWeight:700, letterSpacing:'2.5px', textTransform:'uppercase', cursor:'pointer', opacity:loading?.6:1, transition:'opacity .2s', marginTop:'4px' }}>
                  {loading ? 'Creating Account...' : 'Create My Account'}
                </button>
                <p style={{ textAlign:'center', fontSize:'.72rem', color:'#555' }}>
                  Have an account?{' '}
                  <button type="button" onClick={() => setTab('login')} style={{ background:'none', border:'none', color:'#D4AF37', cursor:'pointer', fontSize:'.72rem', fontFamily:'inherit' }}>Sign In →</button>
                </p>
              </form>
            )}

            {/* IB access note */}
            {!pendingVerification && <div style={{ marginTop:'1.5rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,.04)', textAlign:'center' }}>
              <p style={{ fontSize:'.68rem', color:'#444' }}>
                Get access without a subscription via{' '}
                <a href="/portal/ib" style={{ color:'#D4AF37', textDecoration:'none' }}>Elite Access Registration →</a>
              </p>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const lblS: React.CSSProperties = { display:'block', fontSize:'.6rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'#666', marginBottom:'7px' };
const errS: React.CSSProperties = { fontSize:'.65rem', color:'#FF4757', marginTop:'5px' };

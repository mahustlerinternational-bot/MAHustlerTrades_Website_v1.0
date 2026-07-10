'use client';
// src/components/portal/layout/AuthModal.tsx
import { useState }       from 'react';
import { useRouter }      from 'next/navigation';
import { useForm }        from 'react-hook-form';
import { zodResolver }    from '@hookform/resolvers/zod';
import { z }              from 'zod';
import { toast }          from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthStore }   from '@/lib/auth/store';

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

interface Props { defaultTab: 'login' | 'register'; returnTo: string; }

const iS: React.CSSProperties = {
  width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)',
  color:'#fff', fontSize:'.82rem', padding:'11px 14px', outline:'none',
  fontFamily:'inherit', transition:'border-color .25s, background .25s', boxSizing:'border-box',
};

export default function AuthModal({ defaultTab, returnTo }: Props) {
  const router    = useRouter();
  const { setUser } = useAuthStore();
  const [tab, setTab]       = useState<'login'|'register'>(defaultTab);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const regForm   = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const safeReturn = returnTo === '/portal' ? '/portal/dashboard' : returnTo;

  async function onLogin(values: LoginForm) {
    setLoading(true);
    try {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Load failed')) {
          toast.error('Cannot reach authentication server. Check your Supabase URL in .env.local and restart the server.');
        } else if (error.message.includes('Invalid login')) {
          toast.error('Invalid email or password.');
        } else { toast.error(error.message); }
        return;
      }
      // .maybeSingle() instead of .single() — older accounts created before the
      // profile-creation fix may not have a profiles row yet. Don't hard-fail login.
      const { data: profile } = await supabase.from('profiles').select('*, package:packages(name,slug)').eq('id', data.user!.id).maybeSingle();
      if (!profile) {
        toast.error('Your account is missing profile data. Contact support to resolve this.');
        await supabase.auth.signOut();
        return;
      }
      setUser(profile as any);
      toast.success('Welcome back!');
      setTimeout(() => { router.refresh(); router.push(safeReturn); }, 150);
    } finally { setLoading(false); }
  }

  async function onRegister(values: RegisterForm) {
    setLoading(true);
    try {
      // Server-side route creates BOTH the auth user and the matching profiles
      // row in one request — we no longer depend on the database trigger,
      // which has proven unreliable on this Supabase project.
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password, full_name: values.full_name }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error(body.error ?? 'Failed to create account');
        return;
      }

      // Account + profile now exist server-side. Sign in client-side to set the session.
      const supabase = createClientComponentClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        toast.error('Account created, but automatic sign-in failed. Please sign in manually.');
        setTab('login');
        return;
      }
      if (data.session) {
        const { data: profile } = await supabase.from('profiles').select('*, package:packages(name,slug)').eq('id', data.user!.id).maybeSingle();
        setUser(profile as any);
        toast.success('Account created! Welcome to MAHustler Trades.');
        setTimeout(() => { router.refresh(); router.push(safeReturn); }, 150);
      }
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
          {/* Tabs */}
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

          <div style={{ padding:'2rem' }}>
            {/* ── Login ── */}
            {tab === 'login' && (
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
            {tab === 'register' && (
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
            <div style={{ marginTop:'1.5rem', paddingTop:'1.25rem', borderTop:'1px solid rgba(255,255,255,.04)', textAlign:'center' }}>
              <p style={{ fontSize:'.68rem', color:'#444' }}>
                Get access without a subscription via{' '}
                <a href="/portal/ib" style={{ color:'#D4AF37', textDecoration:'none' }}>IB Elite Registration →</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const lblS: React.CSSProperties = { display:'block', fontSize:'.6rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'#666', marginBottom:'7px' };
const errS: React.CSSProperties = { fontSize:'.65rem', color:'#FF4757', marginTop:'5px' };

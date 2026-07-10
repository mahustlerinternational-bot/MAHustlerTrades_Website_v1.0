'use client';
// src/components/portal/ib/IBRegistrationWizard.tsx
import { useState } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver }from '@hookform/resolvers/zod';
import { z }          from 'zod';
import { CheckCircle, Copy, ExternalLink, Loader2, ChevronRight, ChevronLeft, Clock, Shield } from 'lucide-react';
import { toast }      from 'sonner';
import type { IbRegistration } from '@/types';

interface IBGuideStep { title: string; body: string; }
interface IBGuide {
  steps:         IBGuideStep[];
  broker_name:   string;
  referral_link: string;
  min_deposit:   number;
}

const formSchema = z.object({
  broker_name:    z.string().min(2, 'Broker name required'),
  account_number: z.string().min(3, 'Account number required'),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  guide:       IBGuide;
  existing:    IbRegistration | null;
}

const STEP_ICONS  = ['🏛️', '💰', '📋', '✅'];
const STEP_LABELS = ['IB Access', 'Open Account', 'Submit Details', 'Confirmation'];

export default function IBRegistrationWizard({ guide, existing }: Props) {
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(!!existing);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      broker_name:    existing?.broker_name    ?? guide.broker_name,
      account_number: existing?.account_number ?? '',
    },
  });

  async function onSubmit(values: FormData) {
    setLoading(true);
    try {
      const res = await fetch('/api/me/ib', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(values),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error); return; }
      setSubmitted(true);
      setStep(3);
      toast.success('IB registration submitted! We\'ll review within 24-48 hours.');
    } finally { setLoading(false); }
  }

  function copyLink() {
    navigator.clipboard.writeText(guide.referral_link);
    toast.success('Referral link copied!');
  }

  // ── Already submitted ──────────────────────────────────────
  if (existing && existing.status !== 'pending') {
    const isApproved = existing.status === 'approved';
    return (
      <div style={{
        border: `1px solid ${isApproved ? 'rgba(52,211,153,.2)' : 'rgba(255,71,87,.2)'}`,
        background: isApproved ? 'rgba(52,211,153,.05)' : 'rgba(255,71,87,.05)',
        padding: '1.5rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.9rem', marginBottom: '.75rem' }}>{isApproved ? '✅' : '❌'}</div>
        <p style={{ fontFamily: 'Cinzel,serif', fontWeight: 700, color: '#fff', fontSize: '1.05rem', marginBottom: '.5rem' }}>
          {isApproved ? 'IB Access Granted' : 'Application Rejected'}
        </p>
        <p style={{ fontSize: '.75rem', color: '#888' }}>
          {isApproved
            ? 'Your IB Elite membership is now active. Enjoy full access to all premium features.'
            : `Your application was not approved. ${existing.admin_notes ?? 'Please contact support for more details.'}`}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        {STEP_LABELS.map((label, i) => {
          const done   = i < step;
          const active = i === step;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                  border: `2px solid ${done ? '#D4AF37' : active ? '#D4AF37' : 'rgba(255,255,255,.1)'}`,
                  background: done ? '#D4AF37' : active ? 'rgba(212,175,55,.1)' : '#111',
                  color: done ? '#000' : active ? '#D4AF37' : '#555',
                  transition: 'all .2s',
                }}>
                  {done ? <CheckCircle size={16} /> : STEP_ICONS[i]}
                </div>
                <p style={{
                  fontSize: '.55rem', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '6px',
                  whiteSpace: 'nowrap', color: active ? '#D4AF37' : done ? '#34D399' : '#555',
                }}>
                  {label}
                </p>
              </div>
              {i < 3 && (
                <div style={{ flex: 1, height: '1px', margin: '0 8px 20px', background: i < step ? '#D4AF37' : 'rgba(255,255,255,.07)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 0: Introduction ───────────────────────── */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(212,175,55,.05),transparent)', border: '1px solid rgba(212,175,55,.2)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '.75rem' }}>
              <Shield size={18} style={{ color: '#D4AF37' }} />
              <h3 style={{ fontFamily: 'Cinzel,serif', fontWeight: 700, color: '#fff' }}>IB Elite Access</h3>
            </div>
            <p style={{ fontSize: '.78rem', color: '#B0B0B0', lineHeight: 1.7, marginBottom: '1rem' }}>
              The IB (Introducing Broker) programme gives you <strong style={{ color: '#D4AF37' }}>full Elite membership at zero monthly cost</strong> by partnering with our approved broker. As long as your trading account remains active, your access continues automatically.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: '📡', label: 'Live AI Signals',     desc: 'Full Telegram signal feed' },
                { icon: '🛡',  label: 'Caution Zone Alerts', desc: 'Real-time risk updates'   },
                { icon: '🎓', label: 'All Academy Courses', desc: 'Complete course library'   },
                { icon: '🏆', label: 'VIP Event Access',    desc: 'Priority registration'     },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', padding: '12px' }}>
                  <span style={{ fontSize: '1rem' }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: '.75rem', fontWeight: 600, color: '#fff' }}>{label}</p>
                    <p style={{ fontSize: '.62rem', color: '#555', marginTop: '2px' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(1)} style={nextBtnS}>
            Get Started <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Step 1: Open Broker Account ────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'Cinzel,serif', fontWeight: 700, color: '#fff' }}>Open Your Broker Account</h3>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '4px' }}>Approved Broker</p>
              <p style={{ color: '#fff', fontWeight: 600 }}>{guide.broker_name}</p>
            </div>
            <div>
              <p style={{ fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>Minimum Deposit</p>
              <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.5rem', fontWeight: 700, color: '#D4AF37' }}>${guide.min_deposit.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>Your Referral Link</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, background: '#0A0A0A', border: '1px solid rgba(255,255,255,.08)', padding: '8px 12px', fontSize: '.72rem', color: '#D4AF37', fontFamily: 'JetBrains Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {guide.referral_link}
                </div>
                <button onClick={copyLink} style={iconBtnS}><Copy size={13} /></button>
                <a href={guide.referral_link} target="_blank" rel="noopener noreferrer" style={iconBtnS}><ExternalLink size={13} /></a>
              </div>
              <p style={{ fontSize: '.62rem', color: '#555', marginTop: '8px' }}>⚠️ You MUST use this link to qualify for IB access.</p>
            </div>
            <div style={{ background: 'rgba(212,175,55,.04)', border: '1px solid rgba(212,175,55,.15)', padding: '10px' }}>
              <p style={{ fontSize: '.7rem', color: '#B0B0B0', lineHeight: 1.6 }}>{guide.steps[1]?.body}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(0)} style={backBtnS}><ChevronLeft size={13} /> Back</button>
            <button onClick={() => setStep(2)} style={nextBtnFlexS}>Account Opened — Next <ChevronRight size={13} /></button>
          </div>
        </div>
      )}

      {/* ── Step 2: Submit Details ─────────────────────── */}
      {step === 2 && !submitted && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'Cinzel,serif', fontWeight: 700, color: '#fff' }}>Submit Your Account Details</h3>
          <p style={{ fontSize: '.78rem', color: '#888', lineHeight: 1.6 }}>{guide.steps[2]?.body}</p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={lblS}>Broker Name *</label>
              <input {...register('broker_name')} style={iS} placeholder="e.g. IC Markets"
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')} />
              {errors.broker_name && <p style={errS}>{errors.broker_name.message}</p>}
            </div>
            <div>
              <label style={lblS}>Account Number *</label>
              <input {...register('account_number')} style={iS} placeholder="Your broker account ID"
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')} />
              {errors.account_number && <p style={errS}>{errors.account_number.message}</p>}
              <p style={{ fontSize: '.62rem', color: '#555', marginTop: '6px' }}>This is used to verify your IB relationship with our team.</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <button type="button" onClick={() => setStep(1)} style={backBtnS}><ChevronLeft size={13} /> Back</button>
              <button type="submit" disabled={loading} style={{ ...nextBtnFlexS, opacity: loading ? .6 : 1 }}>
                {loading && <Loader2 size={13} style={{ animation: 'spin .7s linear infinite' }} />}
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 3: Confirmation ───────────────────────── */}
      {(step === 3 || (submitted && existing?.status === 'pending')) && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(212,175,55,.1)', border: '1px solid rgba(212,175,55,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'Cinzel,serif', fontWeight: 700, color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>Application Submitted</p>
            <p style={{ fontSize: '.78rem', color: '#888', maxWidth: '360px', margin: '0 auto', lineHeight: 1.7 }}>
              Our team will verify your broker account within <strong style={{ color: '#fff' }}>24–48 hours</strong>. You&apos;ll receive an email notification once approved.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left', maxWidth: '320px', width: '100%', marginTop: '4px' }}>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', padding: '10px' }}>
              <p style={{ fontSize: '.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Broker</p>
              <p style={{ fontSize: '.75rem', color: '#fff' }}>{existing?.broker_name ?? guide.broker_name}</p>
            </div>
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.06)', padding: '10px' }}>
              <p style={{ fontSize: '.58rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Status</p>
              <p style={{ fontSize: '.75rem', color: '#F59E0B', fontWeight: 600 }}>Pending Review</p>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const iS: React.CSSProperties = { width: '100%', background: '#0A0A0A', border: '1px solid rgba(255,255,255,.08)', color: '#fff', fontSize: '.78rem', padding: '10px 12px', outline: 'none', fontFamily: 'inherit', transition: 'border-color .3s', boxSizing: 'border-box' };
const lblS: React.CSSProperties = { display: 'block', fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' };
const errS: React.CSSProperties = { fontSize: '.65rem', color: '#FF4757', marginTop: '4px' };
const backBtnS: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 20px', fontSize: '.72rem', color: '#888', background: 'none', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' };
const nextBtnS: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 'none', padding: '12px', fontSize: '.72rem', fontWeight: 700, fontFamily: 'Cinzel,serif', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' };
const nextBtnFlexS: React.CSSProperties = { ...nextBtnS, flex: 1 };
const iconBtnS: React.CSSProperties = { padding: '8px', border: '1px solid rgba(212,175,55,.3)', color: '#D4AF37', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' };

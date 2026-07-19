// src/app/portal/dashboard/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import Link   from 'next/link';
import Image  from 'next/image';
import { format } from 'date-fns';
import SignalHistoryPanel from '@/components/portal/quant/SignalHistoryPanel';
import type { QuantSignal } from '@/types';
import SignalEventFeed from '@/components/portal/quant/SignalEventFeed';
import type { SignalFeedEvent } from '@/types';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [enrollRes, eventRes, profileRes, signalRes, historyRes, feedRes] = await Promise.all([
      supabaseAdmin.from('enrollments').select('*, course:courses(title,level,logo_url)').eq('user_id', userId).eq('status', 'active').order('enrolled_at', { ascending: false }).limit(4),
      supabaseAdmin.from('event_registrations').select('*, event:events(title,event_date,badge)').eq('user_id', userId).eq('status', 'confirmed').order('registered_at').limit(3),
      supabaseAdmin.from('profiles').select('*, package:packages(name,slug,price)').eq('id', userId).single(),
      supabaseAdmin.from('quant_signals').select('*').eq('status', 'active').order('broadcasted_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('quant_signals').select('*').order('broadcasted_at', { ascending: false }).limit(100),
      supabaseAdmin.from('signal_feed_events').select('*').order('occurred_at',{ascending:false}).limit(30),
    ]);
    return { enrollments: enrollRes.data ?? [], events: eventRes.data ?? [], profile: profileRes.data, signal: signalRes.data, signalHistory:historyRes.data??[], feedEvents:feedRes.data??[] };
  } catch { return { enrollments: [], events: [], profile: null, signal: null, signalHistory:[], feedEvents:[] }; }
}

export default async function PortalDashboard() {
  let user = null;
  try { const sb = await createSupabaseServerClient(); const { data } = await sb.auth.getUser(); user = data.user; } catch {}

  if (!user) return (
    <div style={{ padding:'2rem', fontFamily:'Montserrat,sans-serif', color:'#888' }}>
      Session expired. <Link href="/portal" style={{ color:'#D4AF37' }}>Sign in again</Link>.
    </div>
  );

  const { enrollments, events, profile, signal, signalHistory, feedEvents } = await getData(user.id);

  const pkg      = (profile as any)?.package;
  const ibStatus = (profile as any)?.ib_status ?? 'none';
  const role     = (profile as any)?.role ?? 'member';
  const isPaid   = !!pkg || role === 'admin' || ibStatus === 'active';

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .stat-card:hover{border-color:rgba(212,175,55,.25)!important;transform:translateY(-2px)!important;}
        .stat-card{transition:all .2s!important;}
        .portal-row:hover{background:rgba(255,255,255,.025)!important}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.6rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'6px' }}>{greeting}</p>
            <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2.2rem', fontWeight:900, letterSpacing:'.5px', lineHeight:1 }}>
              {(profile as any)?.full_name ?? 'Member'}
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'8px', flexWrap:'wrap' }}>
              {isPaid ? (
                <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 10px', background:'rgba(212,175,55,0.1)', border:'1px solid rgba(212,175,55,0.25)', color:'#D4AF37', fontFamily:'Cinzel,serif' }}>
                  {pkg?.name ?? (ibStatus === 'active' ? 'IB Elite' : 'Admin')} · Full Access
                </span>
              ) : (
                <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B' }}>
                  Free Account · Limited Access
                </span>
              )}
              {!isPaid && (
                <Link href="/portal/packages" style={{ fontSize:'.65rem', color:'#D4AF37', textDecoration:'none' }}>Upgrade for Full Access →</Link>
              )}
            </div>
          </div>
          {ibStatus === 'active' && (
            <div title="Official MAHustler Elite Member" style={{width:'138px',height:'138px',display:'grid',placeItems:'center',background:'transparent'}}>
              <Image src="/images/elite-badge-transparent.webp" alt="Official MAHustler Elite Member badge" width={132} height={132} priority style={{width:'132px',height:'132px',objectFit:'contain'}}/>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'2rem' }}>
        {[
          { icon:'📚', label:'Enrolled Courses', value:String(enrollments.length), href:'/portal/courses', color:'#D4AF37' },
          { icon:'📅', label:'Upcoming Events',  value:String(events.length),      href:'/portal/events',  color:'#60A5FA' },
          { icon:'⚡', label:'Live AI Signal',   value: isPaid ? (signal ? 'Active' : 'None') : '🔒 Upgrade', href: isPaid ? '/quant-ai' : '/portal/packages', color: isPaid && signal ? '#34D399' : '#555' },
          { icon:'🔗', label:'IB Status',        value:(profile as any)?.ib_status ?? 'none', href:'/portal/ib', color: ibStatus==='active' ? '#34D399' : '#888' },
        ].map(({ icon, label, value, href, color }, i) => (
          <Link key={label} href={href} className="stat-card"
            style={{ textDecoration:'none', background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.25rem', display:'block', animation:`fadeUp .5s ${i*.07}s ease forwards`, opacity:0 }}>
            <span style={{ fontSize:'1.4rem', display:'block', marginBottom:'10px' }}>{icon}</span>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'1.5rem', fontWeight:700, color, lineHeight:1, textTransform:'capitalize' }}>{value}</p>
            <p style={{ fontSize:'.65rem', color:'#555', marginTop:'5px', letterSpacing:'1.5px', textTransform:'uppercase' }}>{label}</p>
          </Link>
        ))}
      </div>

      {/* Live Signal — paid/IB only */}
      {isPaid && signal && (
        <div style={{ background:'linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.02))', border:'1px solid rgba(212,175,55,0.25)', padding:'1.25rem 1.5rem', marginBottom:'2rem', animation:'fadeUp .5s .3s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem', flexWrap:'wrap' }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00D084', animation:'pulse 1.5s infinite', flexShrink:0 }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37' }}>Live Signal Active</p>
            <span style={{ fontFamily:'Cinzel,serif', fontSize:'.95rem', fontWeight:700, color:'#fff' }}>{(signal as any).instrument}</span>
            <span style={{ fontSize:'.6rem', padding:'2px 8px', ...((signal as any).signal_type==='long' ? {background:'rgba(0,208,132,.1)',color:'#00D084',border:'1px solid rgba(0,208,132,.2)'} : {background:'rgba(255,71,87,.1)',color:'#FF4757',border:'1px solid rgba(255,71,87,.2)'}) }}>
              {String((signal as any).signal_type ?? '').toUpperCase()}
            </span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'6px', maxWidth:'480px' }}>
            {[
              {lbl:'TP',    val:String((signal as any).tp_price),    col:'#00D084', bg:'rgba(0,208,132,.06)',  bl:'#00D084'},
              {lbl:'ENTRY', val:String((signal as any).entry_price), col:'#FFD700', bg:'rgba(212,175,55,.08)', bl:'#D4AF37'},
              {lbl:'SL',    val:String((signal as any).sl_price),    col:'#FF4757', bg:'rgba(255,71,87,.06)',  bl:'#FF4757'},
            ].map(r => (
              <div key={r.lbl} style={{ padding:'10px 14px', background:r.bg, borderLeft:`3px solid ${r.bl}`, display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'JetBrains Mono,monospace' }}>
                <span style={{ fontSize:'.58rem', letterSpacing:'2px', textTransform:'uppercase', fontWeight:700, color:r.col }}>{r.lbl}</span>
                <span style={{ fontSize:'.88rem', fontWeight:600, color:r.col }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPaid && <SignalHistoryPanel signals={signalHistory as QuantSignal[]} />}
      {isPaid && <SignalEventFeed initialEvents={feedEvents as SignalFeedEvent[]} />}

      {/* Free account upgrade banner */}
      {!isPaid && (
        <div style={{ background:'linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))', border:'1px solid rgba(212,175,55,0.3)', padding:'1.5rem 2rem', marginBottom:'2rem', animation:'fadeUp .5s .3s ease forwards', opacity:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'2rem', alignItems:'center' }}>
            <div>
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.62rem', letterSpacing:'4px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Unlock Full Access</p>
              <h3 style={{ fontFamily:'Cinzel,serif', fontSize:'1.15rem', fontWeight:700, marginBottom:'8px' }}>You&apos;re on a Free Account</h3>
              <p style={{ fontSize:'.78rem', color:'#888', lineHeight:1.7, marginBottom:'10px' }}>Upgrade to access live AI signals, all premium courses, VIP events, and the full member community.</p>
              <div style={{ display:'flex', gap:'1.5rem', fontSize:'.72rem', color:'#D4AF37', flexWrap:'wrap' }}>
                {['✓ Live Quant AI Signals','✓ All Courses Unlocked','✓ VIP Event Access','✓ Priority Support'].map(f => <span key={f}>{f}</span>)}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 }}>
              <Link href="/portal/packages" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)', color:'#000', textDecoration:'none', padding:'12px 28px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', textAlign:'center', whiteSpace:'nowrap' }}>Upgrade Now</Link>
              <Link href="/portal/ib" style={{ background:'transparent', color:'#D4AF37', textDecoration:'none', border:'1px solid rgba(212,175,55,.35)', padding:'11px 28px', fontFamily:'Cinzel,serif', fontSize:'.68rem', fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', textAlign:'center', whiteSpace:'nowrap' }}>Free via IB Access</Link>
            </div>
          </div>
        </div>
      )}

      {/* Courses + Events grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .38s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.75rem', fontWeight:700 }}>My Courses</p>
            </div>
            <Link href="/portal/courses" style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#D4AF37', textDecoration:'none' }}>View All →</Link>
          </div>
          {enrollments.length === 0 ? (
            <div style={{ padding:'2.5rem', textAlign:'center' }}>
              <p style={{ fontSize:'2rem', marginBottom:'10px' }}>🎓</p>
              <p style={{ fontSize:'.78rem', color:'#555', marginBottom:'8px' }}>No courses enrolled yet.</p>
              <Link href="/portal/courses" style={{ fontSize:'.7rem', color:'#D4AF37', textDecoration:'none' }}>Browse Academy →</Link>
            </div>
          ) : enrollments.map((enr: any) => (
            <div key={enr.id} className="portal-row" style={{ display:'flex', alignItems:'center', gap:'12px', padding:'.85rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.03)', cursor:'default' }}>
              <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#0D0D0D,#1A1500)', border:'1px solid rgba(212,175,55,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0, overflow:'hidden' }}>
                {enr.course?.logo_url ? <img src={enr.course.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : '📈'}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:'.78rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{enr.course?.title ?? '—'}</p>
                <p style={{ fontSize:'.62rem', color:'#555', marginTop:'2px' }}>{enr.course?.level ?? ''}</p>
              </div>
              <span style={{ flexShrink:0, fontSize:'.6rem', color:'#00D084', marginLeft:'auto' }}>✓</span>
            </div>
          ))}
        </div>

        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .44s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#60A5FA,#2563EB)' }} />
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.75rem', fontWeight:700 }}>Upcoming Events</p>
            </div>
            <Link href="/portal/events" style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#D4AF37', textDecoration:'none' }}>View All →</Link>
          </div>
          {events.length === 0 ? (
            <div style={{ padding:'2.5rem', textAlign:'center' }}>
              <p style={{ fontSize:'2rem', marginBottom:'10px' }}>📅</p>
              <p style={{ fontSize:'.78rem', color:'#555', marginBottom:'8px' }}>No events registered yet.</p>
              <Link href="/portal/events" style={{ fontSize:'.7rem', color:'#D4AF37', textDecoration:'none' }}>Browse Events →</Link>
            </div>
          ) : events.map((reg: any) => {
            const bc = reg.event?.badge==='VIP' ? '#F59E0B' : reg.event?.badge==='In-Person' ? '#60A5FA' : '#00D084';
            return (
              <div key={reg.id} className="portal-row" style={{ padding:'.85rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.03)', cursor:'default' }}>
                <p style={{ fontSize:'.78rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{reg.event?.title ?? '—'}</p>
                <p style={{ fontSize:'.62rem', color:'#D4AF37', marginTop:'3px', fontFamily:'JetBrains Mono,monospace' }}>
                  {reg.event?.event_date ? format(new Date(reg.event.event_date), 'MMM d · HH:mm') : '—'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

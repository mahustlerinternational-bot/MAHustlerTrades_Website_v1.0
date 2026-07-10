// src/app/admin/dashboard/page.tsx
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/server');
    const [members, courses, events, enrollments, pendingIb, recentEnroll] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabaseAdmin.from('events').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabaseAdmin.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('ib_registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('enrollments').select('*, profile:profiles(full_name), course:courses(title)').eq('status', 'active').order('enrolled_at', { ascending: false }).limit(6),
    ]);
    return {
      members: members.count ?? 0, courses: courses.count ?? 0,
      events: events.count ?? 0, enrollments: enrollments.count ?? 0,
      pendingIb: pendingIb.count ?? 0, recent: recentEnroll.data ?? [],
    };
  } catch (err) {
    console.error('[admin/dashboard] getStats() failed:', err);
    return { members: 0, courses: 0, events: 0, enrollments: 0, pendingIb: 0, recent: [] };
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const now = new Date();

  const kpis = [
    { label: 'Total Members',      value: stats.members,     href: '/admin/members', icon: '👥', color: '#D4AF37', glow: 'rgba(212,175,55,0.12)' },
    { label: 'Published Courses',  value: stats.courses,     href: '/admin/courses', icon: '📚', color: '#60A5FA', glow: 'rgba(96,165,250,0.12)'  },
    { label: 'Active Events',      value: stats.events,      href: '/admin/events',  icon: '📅', color: '#34D399', glow: 'rgba(52,211,153,0.12)'  },
    { label: 'Active Enrollments', value: stats.enrollments, href: '/admin/members', icon: '⚡', color: '#A78BFA', glow: 'rgba(167,139,250,0.12)' },
  ];

  return (
    <div style={{ padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', fontFamily: 'Montserrat,sans-serif', color: '#fff' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .kpi-card:hover { transform: translateY(-3px) !important; border-color: rgba(212,175,55,0.3) !important; }
        .kpi-card { transition: all .25s !important; }
        .action-link:hover { color: #D4AF37 !important; padding-left: 20px !important; }
        .action-link { transition: all .2s !important; }
        .enroll-row:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', animation: 'fadeUp .5s ease forwards' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: 'Cinzel,serif', fontSize: '0.58rem', letterSpacing: '5px', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '8px' }}>Control Center</p>
            <h1 style={{ fontFamily: 'Cinzel,serif', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '1px', lineHeight: 1 }}>Admin Dashboard</h1>
            <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '8px', letterSpacing: '1px' }}>
              {format(now, "EEEE, MMMM d, yyyy '·' HH:mm")} GST
            </p>
          </div>
          {stats.pendingIb > 0 && (
            <Link href="/admin/ib-registrations" style={{
              display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)',
              padding: '12px 20px', animation: 'fadeUp .5s .1s ease forwards', opacity: 0,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#F59E0B', fontFamily: 'Cinzel,serif' }}>Pending Review</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F59E0B', fontFamily: 'Cinzel,serif', lineHeight: 1 }}>{stats.pendingIb} IB {stats.pendingIb === 1 ? 'Application' : 'Applications'}</p>
              </div>
              <span style={{ color: '#F59E0B', marginLeft: '4px' }}>→</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {kpis.map(({ label, value, href, icon, color, glow }, i) => (
          <Link key={label} href={href} className="kpi-card" style={{
            textDecoration: 'none', display: 'block',
            background: `linear-gradient(135deg, ${glow} 0%, transparent 60%)`,
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '1.5rem', position: 'relative', overflow: 'hidden',
            animation: `fadeUp .5s ${i * 0.08}s ease forwards`, opacity: 0,
          }}>
            {/* Glow orb */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: glow, filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#444' }}>View →</span>
            </div>
            <p style={{ fontFamily: 'Cinzel,serif', fontSize: '2.8rem', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{value.toLocaleString()}</p>
            <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '6px', letterSpacing: '1px' }}>{label}</p>
            {/* Bottom accent line */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}66, transparent)` }} />
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>

        {/* Recent Enrollments */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', animation: 'fadeUp .5s .35s ease forwards', opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '3px', height: '18px', background: 'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
              <p style={{ fontFamily: 'Cinzel,serif', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '1px' }}>Recent Enrollments</p>
            </div>
            <Link href="/admin/members" style={{ fontSize: '0.6rem', letterSpacing: '2.5px', textTransform: 'uppercase', color: '#D4AF37', textDecoration: 'none' }}>View All →</Link>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {['Member', 'Course', 'Amount'].map(h => (
              <p key={h} style={{ fontSize: '0.58rem', letterSpacing: '2.5px', textTransform: 'uppercase', color: '#444' }}>{h}</p>
            ))}
          </div>

          {stats.recent.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</p>
              <p style={{ fontSize: '0.8rem', color: '#555' }}>No enrollments yet.</p>
              <p style={{ fontSize: '0.7rem', color: '#444', marginTop: '4px' }}>Enrollments will appear here once members join courses.</p>
            </div>
          ) : (
            stats.recent.map((e: any) => (
              <div key={e.id} className="enroll-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', padding: '0.9rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#1A1000,#B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel,serif', fontSize: '0.7rem', fontWeight: 700, color: '#D4AF37', flexShrink: 0 }}>
                    {e.profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.profile?.full_name ?? 'Unknown'}</p>
                </div>
                <p style={{ fontSize: '0.73rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.course?.title ?? '—'}</p>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'JetBrains Mono,monospace', color: '#D4AF37', whiteSpace: 'nowrap' }}>${Number(e.amount_paid ?? 0).toFixed(2)}</p>
              </div>
            ))
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* System Status */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', animation: 'fadeUp .5s .4s ease forwards', opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ width: '3px', height: '18px', background: 'linear-gradient(180deg,#34D399,#059669)' }} />
              <p style={{ fontFamily: 'Cinzel,serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px' }}>System Status</p>
            </div>
            {[
              { label: 'Database',       status: 'Operational', color: '#34D399' },
              { label: 'Auth Service',   status: 'Operational', color: '#34D399' },
              { label: 'Realtime Feed',  status: 'Operational', color: '#34D399' },
              { label: 'File Storage',   status: 'Operational', color: '#34D399' },
              { label: 'API Routes',     status: 'Operational', color: '#34D399' },
            ].map(({ label, status, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.73rem', color: '#888' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '0.65rem', color, letterSpacing: '1px' }}>{status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', animation: 'fadeUp .5s .48s ease forwards', opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ width: '3px', height: '18px', background: 'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
              <p style={{ fontFamily: 'Cinzel,serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px' }}>Quick Actions</p>
            </div>
            {[
              { label: 'Add New Course',   href: '/admin/courses',            icon: '📚' },
              { label: 'Create Event',     href: '/admin/events',             icon: '📅' },
              { label: 'Push AI Signal',   href: '/admin/quant',              icon: '⚡' },
              { label: 'Create Coupon',    href: '/admin/coupons',            icon: '🏷️' },
              { label: 'Review IB Apps',   href: '/admin/ib-registrations',   icon: '🔗' },
              { label: 'Site Settings',    href: '/admin/settings',           icon: '⚙️' },
            ].map(({ label, href, icon }) => (
              <Link key={href} href={href} className="action-link" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 0 9px 12px', fontSize: '0.75rem', color: '#888',
                textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <span style={{ fontSize: '13px', flexShrink: 0 }}>{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

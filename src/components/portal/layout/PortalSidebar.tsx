'use client';
// src/components/portal/layout/PortalSidebar.tsx
import Link     from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore }           from '@/lib/auth/store';

const NAV_ITEMS = [
  { label:'Dashboard',  href:'/portal/dashboard', emoji:'📊' },
  { label:'My Courses', href:'/portal/courses',   emoji:'📚' },
  { label:'Elite Events', href:'/portal/events',  emoji:'📅' },
  { label:'My Trading Journal', href:'/portal/trading-journal', emoji:'📓', requiresElite:true },
  { label:'Packages',   href:'/portal/packages',  emoji:'💎' },
  { label:'Elite Tools', href:'/portal/market-tools', emoji:'📈', requiresElite:true },
  { label:'Elite Access', href:'/portal/ib',      emoji:'🔗', accessStatus:true },
  { label:'Elite Vault', href:'/portal/vault',    emoji:'🔐', requiresElite:true },
  { label:'Profile',    href:'/portal/profile',   emoji:'👤' },
];

export default function PortalSidebar() {
  const pathname         = usePathname();
  const router           = useRouter();
  const { user, logout } = useAuthStore();

  const role      = user?.role       ?? 'member';
  const ibStatus  = user?.ib_status  ?? 'none';
  const hasPackage= (user as any)?.package?.is_active === true;
  const isPaid    = hasPackage || role === 'admin' || ibStatus === 'active';

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <aside style={{
      position:'fixed', top:'72px', left:0, height:'calc(100vh - 72px)', width:'224px',
      background:'#0D0D0D', borderRight:'1px solid rgba(212,175,55,0.12)',
      display:'flex', flexDirection:'column', zIndex:40,
    }}>
      {/* User profile */}
      <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#B8860B,#D4AF37)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cinzel,serif', fontSize:'.8rem', fontWeight:700, color:'#000', overflow:'hidden', flexShrink:0 }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ color:'#fff', fontSize:'.78rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name ?? 'Member'}</p>
            <p style={{ fontSize:'.58rem', letterSpacing:'1.5px', textTransform:'uppercase', marginTop:'2px', color: isPaid ? '#D4AF37' : '#555' }}>
              {isPaid ? ((user as any)?.package?.name ?? (ibStatus === 'active' ? 'Elite Member' : 'Admin')) : 'Free Account'}
            </p>
          </div>
        </div>

        {/* Access tier indicator */}
        {!isPaid ? (
          <div style={{ marginTop:'10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', padding:'7px 10px' }}>
            <p style={{ fontSize:'.58rem', letterSpacing:'1.5px', textTransform:'uppercase', color:'#F59E0B', marginBottom:'3px' }}>Free Account</p>
            <p style={{ fontSize:'.65rem', color:'#888', lineHeight:1.4 }}>
              <a href="/portal/packages" style={{ color:'#D4AF37', textDecoration:'none' }}>Upgrade</a> or <a href="/portal/ib" style={{ color:'#D4AF37', textDecoration:'none' }}>apply for Elite access</a>.
            </p>
          </div>
        ) : (
          <div style={{ marginTop:'10px', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', padding:'6px 10px', display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#34D399', flexShrink:0 }} />
            <p style={{ fontSize:'.6rem', color:'#34D399', letterSpacing:'1px' }}>Full Access Active</p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
        {NAV_ITEMS.map(({ label, href, emoji, requiresElite, accessStatus }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const locked = Boolean(requiresElite && !isPaid);
          return (
            <Link key={href} href={href} style={{
              display:'flex', alignItems:'center', gap:'10px',
              padding:'9px 12px', marginBottom:'2px',
              fontSize:'.77rem', fontWeight:500, textDecoration:'none',
              borderRadius:'2px', borderLeft: active ? '2px solid #D4AF37' : '2px solid transparent',
              background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
              color: active ? '#D4AF37' : '#777', transition:'all .2s',
            }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color='#D4AF37'; (e.currentTarget as HTMLAnchorElement).style.background='rgba(212,175,55,.04)'; }}}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color='#777'; (e.currentTarget as HTMLAnchorElement).style.background='transparent'; }}}>
              <span style={{ fontSize:'13px' }}>{emoji}</span>
              <span style={{flex:1}}>{label}</span>
              {locked && <span title="Activate Elite access to unlock" style={{fontSize:'10px',opacity:.7}}>🔒</span>}
              {requiresElite && isPaid && <span title="Elite access active" style={{fontSize:'10px',color:'#34D399'}}>✓</span>}
              {accessStatus && (
                <span style={{
                  fontSize:'.42rem', letterSpacing:'1px', padding:'2px 4px',
                  color:ibStatus === 'active' ? '#34D399' : '#D4AF37',
                  border:`1px solid ${ibStatus === 'active' ? 'rgba(52,211,153,.25)' : 'rgba(212,175,55,.2)'}`,
                }}>
                  {ibStatus === 'active' ? 'ACTIVE' : 'APPLY'}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        {!isPaid && (
          <Link href="/portal/packages"
            style={{ display:'block', textAlign:'center', padding:'9px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', fontFamily:'Cinzel,serif', fontSize:'.62rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'8px' }}>
            Upgrade Now
          </Link>
        )}
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', fontSize:'.72rem', color:'#555', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'color .2s' }}
          onMouseEnter={e => (e.currentTarget.style.color='#FF4757')}
          onMouseLeave={e => (e.currentTarget.style.color='#555')}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}

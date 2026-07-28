'use client';
// src/components/portal/packages/PackageCards.tsx
import { useState } from 'react';
import { toast }    from 'sonner';
import type { Package } from '@/types';
import { authFetch } from '@/lib/utils/authFetch';

interface Feature { feature_text: string; is_highlight: boolean; }
type Pkg = Package & { features: Feature[]; payment_url?: string };
interface Props { packages: Pkg[]; currentPackageId: string | null; }

export default function PackageCards({ packages, currentPackageId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const USD_TO_AED = 3.6725;
  const featured = packages.find(p => p.slug === 'elite' || p.name?.toLowerCase().includes('elite'));

  async function handleSelect(pkg: Pkg) {
    if (pkg.id === currentPackageId) return;
    setLoading(pkg.id);
    try {
      if (pkg.price > 0 && pkg.payment_url) {
        window.location.href = pkg.payment_url;
        return;
      }
      const res  = await authFetch('/api/me/packages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ package_id: pkg.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`${pkg.name} activated!`);
        window.location.reload();
        return;
      }
      if (res.status === 202 && data.requires_payment) {
        toast.loading('Redirecting to Ziina payment...');
        const zRes = await authFetch('/api/payments/ziina', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ type:'package', id:pkg.id, amount:pkg.price, description:`${pkg.name} Membership — MAHustler Trades` }),
        });
        const zData = await zRes.json();
        toast.dismiss();
        if (zData.checkout_url) {
          window.location.href = zData.checkout_url;
        } else {
          toast.info(`${zData.message ?? 'Configure ZIINA_API_TOKEN to enable payments.'}\nAmount: AED ${(pkg.price * USD_TO_AED).toFixed(0)}`);
        }
        return;
      }
      toast.error(data.error ?? 'Failed to select package');
    } catch { toast.error('Network error. Please try again.'); }
    finally { setLoading(null); }
  }

  return (
    <div>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pkg-card:hover{transform:translateY(-4px)!important;}
        @media(max-width:1100px){.package-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
        @media(max-width:650px){.package-card-grid{grid-template-columns:1fr!important}.pkg-card{transform:none!important}}
      `}</style>
      <div className="package-card-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.25rem', marginBottom:'2rem' }}>
        {packages.map((pkg, i) => {
          const isCurrent  = pkg.id === currentPackageId;
          const isFeatured = pkg.id === featured?.id;
          return (
            <div key={pkg.id} className="pkg-card"
              style={{
                background: isFeatured ? 'linear-gradient(180deg,rgba(212,175,55,0.08),rgba(212,175,55,0.03))' : '#111',
                border: `1px solid ${isFeatured ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.07)'}`,
                padding:'1.75rem 1.5rem', position:'relative', overflow:'hidden',
                transform: isFeatured ? 'scale(1.03)' : 'none',
                transition:'all .25s', animation:`fadeUp .5s ${i*0.1}s ease forwards`, opacity:0,
              }}>
              {isFeatured && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,#B8860B,#FFD700,#B8860B)' }} />}
              {isFeatured && <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', fontFamily:'Cinzel,serif', fontSize:'.55rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'3px 10px' }}>Most Popular</div>}
              {isCurrent  && <div style={{ position:'absolute', top:'12px', left:'12px', background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)', color:'#34D399', fontSize:'.58rem', letterSpacing:'1.5px', textTransform:'uppercase', padding:'2px 8px' }}>✓ Active</div>}

              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.65rem', letterSpacing:'3px', textTransform:'uppercase', color: isFeatured ? '#D4AF37' : '#888', marginBottom:'8px', marginTop: isCurrent ? '24px' : '0' }}>{pkg.name}</p>
              {pkg.description && <p style={{ fontSize:'.75rem', color:'#555', marginBottom:'1.25rem', lineHeight:1.5 }}>{pkg.description}</p>}

              {/* USD Price */}
              <div style={{ marginBottom:'4px' }}>
                <span style={{ fontFamily:'Cinzel,serif', fontSize:'2.4rem', fontWeight:900, background: isFeatured ? 'linear-gradient(135deg,#FFD700,#D4AF37)' : 'none', WebkitBackgroundClip: isFeatured ? 'text' : undefined, WebkitTextFillColor: isFeatured ? 'transparent' : undefined, color: isFeatured ? undefined : '#fff' }}>
                  ${pkg.price}
                </span>
                <span style={{ fontSize:'.72rem', color:'#555', marginLeft:'4px' }}>/{pkg.billing_period ?? 'month'}</span>
              </div>
              {/* AED equivalent */}
              <p style={{ fontSize:'.68rem', color:'#D4AF37', marginBottom:'1.25rem' }}>≈ AED {(pkg.price * USD_TO_AED).toFixed(0)} via Ziina</p>

              <div style={{ height:'1px', background: isFeatured ? 'linear-gradient(90deg,transparent,rgba(212,175,55,0.4),transparent)' : 'rgba(255,255,255,0.05)', marginBottom:'1.25rem' }} />

              {/* Features */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'1.5rem' }}>
                {(pkg.features ?? []).map((f, fi) => (
                  <div key={fi} style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <span style={{ color: f.is_highlight ? '#D4AF37' : '#34D399', fontSize:'12px', flexShrink:0, marginTop:'1px' }}>{f.is_highlight ? '⭐' : '✓'}</span>
                    <span style={{ fontSize:'.75rem', color: f.is_highlight ? '#D4AF37' : '#B0B0B0', fontWeight: f.is_highlight ? 600 : 400 }}>{f.feature_text}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => handleSelect(pkg)} disabled={isCurrent || loading === pkg.id}
                style={{
                  width:'100%', padding:'12px', border:'none', cursor: isCurrent ? 'default' : 'pointer',
                  background: isCurrent ? 'rgba(52,211,153,0.1)' : isFeatured ? 'linear-gradient(135deg,#B8860B,#D4AF37,#FFD700)' : 'rgba(255,255,255,0.05)',
                  color: isCurrent ? '#34D399' : isFeatured ? '#000' : '#fff',
                  fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase',
                  opacity: loading === pkg.id ? 0.6 : 1, transition:'all .2s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                }}>
                {loading === pkg.id
                  ? <><div style={{ width:'14px', height:'14px', border:'2px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Processing…</>
                  : isCurrent ? '✓ Active Plan'
                  : pkg.price === 0 ? 'Get Free'
                  : `Pay AED ${(pkg.price * USD_TO_AED).toFixed(0)} · Ziina`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Elite Access banner */}
      <div style={{ background:'rgba(212,175,55,0.04)', border:'1px solid rgba(212,175,55,0.2)', padding:'1.5rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem', marginBottom:'1rem' }}>
        <div>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.85rem', fontWeight:700, color:'#D4AF37', marginBottom:'4px' }}>💡 Get Elite Access for Free</p>
          <p style={{ fontSize:'.78rem', color:'#888', fontWeight:300 }}>Open a live trading account via our approved broker referral link and get full Elite membership at zero monthly cost except the &quot;ELITE LIFETIME ACCESS&quot;.</p>
        </div>
        <a href="/portal/ib" style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', textDecoration:'none', padding:'11px 24px', fontFamily:'Cinzel,serif', fontSize:'.7rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', flexShrink:0, whiteSpace:'nowrap' }}>Apply for Elite Access →</a>
      </div>

      {/* Ziina note */}
      <p style={{ fontSize:'.68rem', color:'#444', textAlign:'center' }}>
        💳 Payments processed securely via <strong style={{ color:'#D4AF37' }}>Ziina</strong> · Prices in USD, charged in AED (1 USD = {USD_TO_AED} AED)
      </p>
    </div>
  );
}

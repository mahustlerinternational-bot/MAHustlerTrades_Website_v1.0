'use client';
// src/components/portal/courses/CourseMarketplace.tsx
import { useState } from 'react';
import { toast }    from 'sonner';
import type { Course } from '@/types';
import { authFetch } from '@/lib/utils/authFetch';

const LEVEL_COLOR: Record<string,string> = {
  Beginner:'#34D399', Intermediate:'#60A5FA', Advanced:'#F59E0B', Expert:'#F87171', 'All Levels':'#A78BFA'
};
const USD_TO_AED = 3.6725;

export default function CourseMarketplace({ courses,ibApproved=false }: { courses: Course[];ibApproved?:boolean }) {
  const [enrolling,  setEnrolling]  = useState<string|null>(null);
  const [couponCode, setCouponCode] = useState<Record<string,string>>({});
  const [showCoupon, setShowCoupon] = useState<Record<string,boolean>>({});

  async function enroll(course: Course) {
    setEnrolling(course.id);
    try {
      const code = couponCode[course.id]?.trim().toUpperCase() || undefined;
      const res  = await authFetch('/api/me/courses', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ course_id:course.id, coupon_code:code }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.ib_benefit?'Verified Elite benefit applied — course unlocked free! 🎉':'Enrolled successfully! 🎉');
        window.location.reload();
        return;
      }
      if (res.status === 202 && data.requires_payment) {
        toast.loading('Redirecting to Ziina payment...');
        const zRes = await authFetch('/api/payments/ziina', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ type:'course', id:course.id, coupon_code:data.coupon_code }),
        });
        const zData = await zRes.json();
        toast.dismiss();
        if (zData.checkout_url) {
          window.location.href = zData.checkout_url;
        } else {
          toast.info(`Payment: AED ${data.amount_aed}\n${zData.message ?? 'Configure ZIINA_API_TOKEN to process payments.'}`);
        }
        return;
      }
      if (res.status === 400 && data.error?.includes('coupon')) {
        toast.error(data.error);
        return;
      }
      toast.error(data.error ?? 'Enrollment failed');
    } catch { toast.error('Network error. Try again.'); }
    finally { setEnrolling(null); }
  }

  if (!courses.length) return null;

  return (
    <div>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .mkt-card:hover{border-color:rgba(212,175,55,.3)!important;transform:translateY(-3px)!important;}
      `}</style>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
        {courses.map((c,i) => (
          <div key={c.id} className="mkt-card"
            style={{ background:'#1A1A1A', border:'1px solid rgba(255,255,255,.07)', overflow:'hidden', transition:'all .25s', animation:`fadeUp .5s ${i*.07}s ease forwards`, opacity:0 }}>
            <div style={{ height:'120px', background:'linear-gradient(135deg,#0D0D0D,#1A1500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', borderBottom:'1px solid rgba(212,175,55,.12)', overflow:'hidden' }}>
              {c.cover_image_url ? <img src={c.cover_image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
               : c.logo_url ? <img src={c.logo_url} alt="" style={{ maxHeight:'80%', maxWidth:'80%', objectFit:'contain' }} />
               : '📈'}
            </div>
            <div style={{ padding:'1.1rem' }}>
              <p style={{ fontSize:'.6rem', letterSpacing:'2.5px', textTransform:'uppercase', color: LEVEL_COLOR[c.level] ?? '#888', marginBottom:'5px' }}>
                {c.level}{c.market ? ` · ${c.market}` : ''}
              </p>
              <h3 style={{ fontFamily:'Cinzel,serif', fontSize:'.9rem', fontWeight:600, marginBottom:'6px', lineHeight:1.3, color:'#fff' }}>{c.title}</h3>
              <p style={{ fontSize:'.73rem', color:'#888', lineHeight:1.6, marginBottom:'10px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
                {c.description}
              </p>
              <div style={{ display:'flex', gap:'1rem', fontSize:'.68rem', color:'#555', marginBottom:'10px' }}>
                {c.duration_hours && <span>⏱ {c.duration_hours}h</span>}
                {c.lesson_count   && <span>📹 {c.lesson_count} lessons</span>}
              </div>

              {/* Coupon toggle */}
              {!ibApproved&&Number(c.price)>0&&<div style={{ marginBottom:'10px' }}>
                <button type="button" onClick={() => setShowCoupon(s => ({ ...s, [c.id]:!s[c.id] }))}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:'.65rem', color:'#555', padding:0, transition:'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color='#D4AF37')}
                  onMouseLeave={e => (e.currentTarget.style.color='#555')}>
                  🏷️ {showCoupon[c.id] ? 'Hide coupon' : 'Have a coupon code?'}
                </button>
                {showCoupon[c.id] && (
                  <input value={couponCode[c.id] ?? ''} onChange={e => setCouponCode(s => ({ ...s, [c.id]:e.target.value }))}
                    placeholder="Enter code e.g. MAHFREE100"
                    style={{ display:'block', width:'100%', marginTop:'6px', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.72rem', padding:'7px 10px', outline:'none', boxSizing:'border-box', textTransform:'uppercase', letterSpacing:'1px' }}
                    onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                    onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                )}
              </div>}

              {/* Price + Enroll */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:'10px' }}>
                <div>
                  {ibApproved
                    ? <><span style={{ fontFamily:'Cinzel,serif', fontSize:'1rem', fontWeight:700, color:'#34D399' }}>Free with Verified Elite</span>{Number(c.price)>0&&<span style={{ fontSize:'.62rem', color:'#666', display:'block', marginTop:'1px',textDecoration:'line-through' }}>${c.price} standard price</span>}</>
                    : c.price === 0
                    ? <span style={{ fontFamily:'Cinzel,serif', fontSize:'1rem', fontWeight:700, color:'#34D399' }}>Free</span>
                    : <>
                        <span style={{ fontFamily:'Cinzel,serif', fontSize:'1rem', fontWeight:700, color:'#D4AF37' }}>${c.price}</span>
                        <span style={{ fontSize:'.62rem', color:'#555', display:'block', marginTop:'1px' }}>AED {(c.price*USD_TO_AED).toFixed(0)} via Ziina</span>
                        <a href="/portal/ib" style={{fontSize:'.58rem',color:'#34D399',display:'block',marginTop:'3px',textDecoration:'none'}}>Or free with approved Elite access →</a>
                      </>}
                </div>
                <button onClick={() => enroll(c)} disabled={enrolling === c.id}
                  style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'9px 16px', fontFamily:'Cinzel,serif', fontSize:'.65rem', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', cursor:'pointer', opacity: enrolling===c.id ? .6 : 1, display:'flex', alignItems:'center', gap:'6px' }}>
                  {enrolling===c.id
                    ? <><div style={{ width:'12px', height:'12px', border:'2px solid #000', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Processing</>
                    : ibApproved||c.price===0 ? 'Enroll Free' : 'Enroll Now'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

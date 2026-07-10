'use client';
// src/app/admin/coupons/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Coupon } from '@/types';

const schema = z.object({
  code:           z.string().min(3),
  description:    z.string().optional(),
  discount_type:  z.enum(['percent','full','fixed']),
  discount_value: z.coerce.number().min(0),
  course_id:      z.string().optional(),
  max_uses:       z.coerce.number().optional(),
  expires_at:     z.string().optional(),
  is_active:      z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

const DTYPE_STYLE: Record<string,{color:string;bg:string;border:string;label:string}> = {
  full:    { color:'#34D399', bg:'rgba(52,211,153,.08)',  border:'rgba(52,211,153,.25)',  label:'100% FREE'  },
  percent: { color:'#D4AF37', bg:'rgba(212,175,55,.08)',  border:'rgba(212,175,55,.25)',  label:'% OFF'      },
  fixed:   { color:'#60A5FA', bg:'rgba(96,165,250,.08)',  border:'rgba(96,165,250,.25)',  label:'$ OFF'      },
};

function discountLabel(c: Coupon) {
  if (c.discount_type === 'full')    return '100% FREE';
  if (c.discount_type === 'percent') return `${c.discount_value}% OFF`;
  return `$${c.discount_value} OFF`;
}

export default function AdminCouponsPage() {
  const [coupons,   setCoupons]   = useState<Coupon[]>([]);
  const [courses,   setCourses]   = useState<{id:string;title:string}[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Coupon | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, coRes] = await Promise.all([
        fetch('/api/admin/coupons'),
        fetch('/api/admin/courses?limit=100'),
      ]);
      const cData  = await cRes.json();
      const coData = await coRes.json();
      setCoupons(Array.isArray(cData) ? cData : (cData?.data ?? []));
      setCourses(Array.isArray(coData?.data) ? coData.data : []);
    } catch { setCoupons([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = (Array.isArray(coupons) ? coupons : []).filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(c: Coupon) {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    toast.success(c.is_active ? 'Coupon deactivated' : 'Coupon activated');
    fetchAll();
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    toast.success('Coupon deleted');
    fetchAll();
  }

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .cp-row:hover{background:rgba(255,255,255,.025)!important}
        .cp-act{opacity:0!important;transition:opacity .2s!important}
        .cp-row:hover .cp-act{opacity:1!important}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:50;display:flex;align-items:center;justify-content:center;padding:1rem}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <div>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Academy</p>
          <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Coupon Management</h1>
          <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>{coupons.length} coupons</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          style={{ background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'11px 24px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', animation:'fadeUp .5s .05s ease forwards', opacity:0 }}>
          ＋ New Coupon
        </button>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:'360px', marginBottom:'1.5rem', animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#555', fontSize:'13px' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search coupons..."
          style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,.07)', color:'#fff', fontSize:'.78rem', padding:'10px 12px 10px 36px', outline:'none', fontFamily:'inherit' }}
          onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
          onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.07)')} />
      </div>

      {/* Table */}
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .15s ease forwards', opacity:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'160px 1fr 120px 80px 100px 80px 80px', gap:'1rem', padding:'.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
          {['Code','Description','Discount','Scope','Usage','Status',''].map(h => (
            <p key={h} style={{ fontSize:'.58rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'#444' }}>{h}</p>
          ))}
        </div>

        {loading && (
          <div style={{ padding:'4rem', display:'flex', justifyContent:'center' }}>
            <div style={{ width:'20px', height:'20px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:'4rem', textAlign:'center' }}>
            <p style={{ fontSize:'2rem', marginBottom:'10px' }}>🏷️</p>
            <p style={{ fontSize:'.8rem', color:'#555' }}>No coupons found.</p>
          </div>
        )}
        {!loading && filtered.map(c => {
          const ds = DTYPE_STYLE[c.discount_type] ?? DTYPE_STYLE.percent;
          return (
            <div key={c.id} className="cp-row"
              style={{ display:'grid', gridTemplateColumns:'160px 1fr 120px 80px 100px 80px 80px', gap:'1rem', padding:'.85rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.03)', alignItems:'center', transition:'background .15s' }}>
              {/* Code */}
              <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.78rem', fontWeight:700, letterSpacing:'2px', color:'#fff' }}>{c.code}</p>
              {/* Description */}
              <p style={{ fontSize:'.72rem', color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.description ?? '—'}</p>
              {/* Discount */}
              <span style={{ fontSize:'.6rem', letterSpacing:'1px', textTransform:'uppercase', padding:'3px 8px', border:`1px solid ${ds.border}`, color:ds.color, background:ds.bg, fontWeight:700, whiteSpace:'nowrap' }}>
                {discountLabel(c)}
              </span>
              {/* Scope */}
              <p style={{ fontSize:'.68rem', color:'#888' }}>{c.course_id ? 'Specific' : 'Any'}</p>
              {/* Usage */}
              <p style={{ fontSize:'.72rem', fontFamily:'JetBrains Mono,monospace' }}>
                {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''}
              </p>
              {/* Status */}
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: c.is_active ? '#34D399' : '#555' }} />
                <span style={{ fontSize:'.65rem', color: c.is_active ? '#34D399' : '#555' }}>{c.is_active ? 'Active' : 'Off'}</span>
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:'4px' }}>
                {[
                  { icon:'✏️', title:'Edit',   fn:() => { setEditing(c); setShowModal(true); }, hc:'rgba(212,175,55,.3)', ht:'#D4AF37' },
                  { icon: c.is_active ? '⏸️' : '▶️', title:c.is_active?'Deactivate':'Activate', fn:() => toggleActive(c), hc:'rgba(96,165,250,.3)', ht:'#60A5FA' },
                  { icon:'🗑️', title:'Delete', fn:() => deleteCoupon(c.id,c.code), hc:'rgba(255,71,87,.3)', ht:'#FF4757' },
                ].map(({ icon, title, fn, hc, ht }) => (
                  <button key={title} className="cp-act" onClick={fn} title={title}
                    style={{ background:'none', border:'1px solid transparent', color:'#888', width:'26px', height:'26px', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=hc; (e.currentTarget as HTMLButtonElement).style.color=ht; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='transparent'; (e.currentTarget as HTMLButtonElement).style.color='#888'; }}
                  >{icon}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <CouponModal coupon={editing} courses={courses} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchAll(); }} />
      )}
    </div>
  );
}

// ── Coupon Form Modal ──────────────────────────────────────────
function CouponModal({ coupon, courses, onClose, onSaved }: {
  coupon: Coupon | null;
  courses: { id: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!coupon;
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code:           coupon?.code           ?? '',
      description:    coupon?.description    ?? '',
      discount_type:  (coupon?.discount_type ?? 'percent') as any,
      discount_value: coupon?.discount_value ?? 0,
      course_id:      coupon?.course_id      ?? '',
      max_uses:       coupon?.max_uses       ?? undefined,
      expires_at:     coupon?.expires_at     ? coupon.expires_at.slice(0,10) : '',
      is_active:      coupon?.is_active      ?? true,
    },
  });

  const dtype = watch('discount_type');

  async function onSubmit(values: FormData) {
    setSaving(true);
    try {
      const payload = { ...values, course_id: values.course_id || null, expires_at: values.expires_at || null };
      const url    = isEdit ? `/api/admin/coupons/${coupon!.id}` : '/api/admin/coupons';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Save failed'); return; }
      toast.success(isEdit ? 'Coupon updated' : 'Coupon created');
      onSaved();
    } finally { setSaving(false); }
  }

  const iS: React.CSSProperties = { width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.78rem', padding:'10px 12px', outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color .3s' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#111', border:'1px solid rgba(212,175,55,.25)', width:'100%', maxWidth:'480px', maxHeight:'90vh', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'4px' }}>{isEdit ? 'Edit' : 'New'} Coupon</p>
            <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.2rem', fontWeight:700 }}>{isEdit ? coupon!.code : 'Create Coupon'}</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:'18px', cursor:'pointer', lineHeight:1 }}
            onMouseEnter={e => (e.currentTarget.style.color='#fff')}
            onMouseLeave={e => (e.currentTarget.style.color='#555')}>✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Code */}
          <div>
            <label style={lblS}>Coupon Code *</label>
            <input {...register('code')} placeholder="e.g. MAHFREE100" style={{ ...iS, textTransform:'uppercase', letterSpacing:'3px', fontFamily:'JetBrains Mono,monospace' }}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            {errors.code && <p style={errS}>{errors.code.message}</p>}
          </div>
          {/* Description */}
          <div>
            <label style={lblS}>Description (internal)</label>
            <input {...register('description')} placeholder="Internal note — not shown to users" style={iS}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
          </div>
          {/* Type + Value */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={lblS}>Discount Type *</label>
              <select {...register('discount_type')} style={{ ...iS, cursor:'pointer' }}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
                <option value="full">Full Access (Free)</option>
              </select>
            </div>
            {dtype !== 'full' && (
              <div>
                <label style={lblS}>{dtype === 'percent' ? 'Percentage' : 'Amount (USD)'}</label>
                <input {...register('discount_value')} type="number" step="0.01" min="0" max={dtype==='percent'?'100':undefined} placeholder={dtype==='percent'?'20':'50'} style={iS}
                  onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                  onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                {errors.discount_value && <p style={errS}>{errors.discount_value.message}</p>}
              </div>
            )}
          </div>
          {/* Max uses + Expiry */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={lblS}>Max Uses (blank = unlimited)</label>
              <input {...register('max_uses')} type="number" min="1" placeholder="∞" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <div>
              <label style={lblS}>Expiry Date</label>
              <input {...register('expires_at')} type="date" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
          </div>
          {/* Course scope */}
          <div>
            <label style={lblS}>Restrict to Course (optional)</label>
            <select {...register('course_id')} style={{ ...iS, cursor:'pointer' }}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')}>
              <option value="">Any course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          {/* Active */}
          <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
            <input type="checkbox" {...register('is_active')} style={{ width:'16px', height:'16px', accentColor:'#D4AF37' }} />
            <span style={{ fontSize:'.78rem', color:'#888' }}>Active (immediately usable by members)</span>
          </label>

          {/* Footer */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', paddingTop:'8px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
            <button type="button" onClick={onClose}
              style={{ padding:'10px 20px', background:'none', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:'.72rem', cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='#888'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.08)'; }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 24px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', opacity:saving?.6:1, transition:'opacity .2s' }}>
              {saving ? '⏳ Saving...' : isEdit ? '💾 Save Changes' : '＋ Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const lblS: React.CSSProperties = { display:'block', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666', marginBottom:'6px' };
const errS: React.CSSProperties = { fontSize:'.65rem', color:'#FF4757', marginTop:'4px' };

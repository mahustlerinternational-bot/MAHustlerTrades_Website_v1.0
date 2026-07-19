'use client';
// src/components/admin/courses/CourseFormModal.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Course } from '@/types';
import { authFetch } from '@/lib/utils/authFetch';

const schema = z.object({
  title:           z.string().min(3, 'Title must be at least 3 characters'),
  description:     z.string().min(10, 'Description required'),
  price:           z.coerce.number().min(0, 'Price cannot be negative'),
  level:           z.string().min(1, 'Level is required'),
  market:          z.string().optional(),
  duration_hours:  z.coerce.number().optional(),
  lesson_count:    z.coerce.number().optional(),
  is_published:    z.boolean().default(false),
  sort_order:      z.coerce.number().default(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  course:   Course | null;
  onClose:  () => void;
  onSaved:  () => void;
}

const LEVELS  = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'All Levels'];
const MARKETS = ['Forex', 'Crypto', 'Indices', 'Options', 'Stocks', 'Multi-Market', 'Mindset'];

export default function CourseFormModal({ course, onClose, onSaved }: Props) {
  const isEdit   = !!course;
  const [saving,        setSaving]        = useState(false);
  const [logoUrl,       setLogoUrl]       = useState(course?.logo_url        ?? '');
  const [coverUrl,      setCoverUrl]      = useState(course?.cover_image_url ?? '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover,setUploadingCover]= useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:          course?.title          ?? '',
      description:    course?.description    ?? '',
      price:          course?.price          ?? 0,
      level:          course?.level          ?? 'All Levels',
      market:         course?.market         ?? '',
      duration_hours: course?.duration_hours ?? undefined,
      lesson_count:   course?.lesson_count   ?? undefined,
      is_published:   course?.is_published   ?? false,
      sort_order:     course?.sort_order     ?? 0,
    },
  });

  async function uploadImage(
    file: File,
    assetType: 'course-logo' | 'course-cover',
    setter: (url: string) => void,
    setUploading: (v: boolean) => void
  ) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('assetType', assetType);
      const response = await authFetch('/api/admin/uploads', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error ?? 'Upload failed'); return; }
      setter(data.publicUrl);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error('Upload error: ' + String(e));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: FormData) {
    setSaving(true);
    try {
      const payload = { ...values, logo_url: logoUrl || null, cover_image_url: coverUrl || null, market: values.market || null };
      const url     = isEdit ? `/api/admin/courses/${course!.id}` : '/api/admin/courses';
      const method  = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Save failed');
        return;
      }

      toast.success(isEdit ? 'Course updated' : 'Course created');
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:50, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'1.5rem', overflowY:'auto' }}>
      <div style={{ background:'#111', border:'1px solid rgba(212,175,55,.25)', width:'100%', maxWidth:'620px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'4px' }}>{isEdit ? 'Edit' : 'New'} Course</p>
            <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.2rem', fontWeight:700, color:'#fff' }}>{isEdit ? course!.title : 'Create Course'}</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:'20px', cursor:'pointer', lineHeight:1 }}
            onMouseEnter={e => (e.currentTarget.style.color='#fff')}
            onMouseLeave={e => (e.currentTarget.style.color='#555')}>✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Image uploads */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {/* Logo */}
            <div>
              <label style={lblS}>Course Logo</label>
              <label style={{ display:'block', cursor:'pointer' }}>
                <div style={{ height:'80px', background:'linear-gradient(135deg,#0D0D0D,#1A1500)', border:'1px dashed rgba(212,175,55,.35)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'4px', overflow:'hidden', transition:'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.7)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.35)')}>
                  {uploadingLogo ? (
                    <div style={{ width:'20px', height:'20px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', padding:'4px' }} />
                  ) : (
                    <>
                      <span style={{ fontSize:'1.5rem' }}>📤</span>
                      <span style={{ fontSize:'.65rem', color:'#555' }}>Upload Logo</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'course-logo', setLogoUrl, setUploadingLogo)} />
              </label>
              {logoUrl && <button type="button" onClick={() => setLogoUrl('')} style={{ fontSize:'.6rem', color:'#FF4757', background:'none', border:'none', cursor:'pointer', marginTop:'3px' }}>✕ Remove</button>}
            </div>
            {/* Cover */}
            <div>
              <label style={lblS}>Cover Image</label>
              <label style={{ display:'block', cursor:'pointer' }}>
                <div style={{ height:'80px', background:'linear-gradient(135deg,#0D0D0D,#1A1500)', border:'1px dashed rgba(212,175,55,.35)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'4px', overflow:'hidden', transition:'border-color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.7)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.35)')}>
                  {uploadingCover ? (
                    <div style={{ width:'20px', height:'20px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                  ) : coverUrl ? (
                    <img src={coverUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <>
                      <span style={{ fontSize:'1.5rem' }}>🖼️</span>
                      <span style={{ fontSize:'.65rem', color:'#555' }}>Upload Cover</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'course-cover', setCoverUrl, setUploadingCover)} />
              </label>
              {coverUrl && <button type="button" onClick={() => setCoverUrl('')} style={{ fontSize:'.6rem', color:'#FF4757', background:'none', border:'none', cursor:'pointer', marginTop:'3px' }}>✕ Remove</button>}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={lblS}>Course Title *</label>
            <input {...register('title')} placeholder="e.g. Smart Money Concepts: The Foundation" style={iS}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            {errors.title && <p style={errS}>{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={lblS}>Description *</label>
            <textarea {...register('description')} rows={2} placeholder="Course overview and what students will learn..." style={{ ...iS, resize:'none' }}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            {errors.description && <p style={errS}>{errors.description.message}</p>}
          </div>

          {/* Price / Level / Market */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lblS}>Price (USD) *</label>
              <input {...register('price')} type="number" step="0.01" min="0" placeholder="197.00" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              {errors.price && <p style={errS}>{errors.price.message}</p>}
            </div>
            <div>
              <label style={lblS}>Level *</label>
              <select {...register('level')} style={{ ...iS, cursor:'pointer' }}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={lblS}>Market</label>
              <select {...register('market')} style={{ ...iS, cursor:'pointer' }}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')}>
                <option value="">Select market</option>
                {MARKETS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Duration / Lessons / Sort */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lblS}>Duration (hours)</label>
              <input {...register('duration_hours')} type="number" min="0" placeholder="32" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <div>
              <label style={lblS}>Lesson Count</label>
              <input {...register('lesson_count')} type="number" min="0" placeholder="68" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <div>
              <label style={lblS}>Sort Order</label>
              <input {...register('sort_order')} type="number" min="0" placeholder="0" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
          </div>

          {/* Publish */}
          <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
            <input type="checkbox" {...register('is_published')} style={{ width:'16px', height:'16px', accentColor:'#D4AF37' }} />
            <span style={{ fontSize:'.78rem', color:'#888' }}>Publish immediately (visible to all members)</span>
          </label>

          {/* Footer */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', paddingTop:'8px', borderTop:'1px solid rgba(255,255,255,.05)', marginTop:'4px' }}>
            <button type="button" onClick={onClose}
              style={{ padding:'10px 20px', background:'none', border:'1px solid rgba(255,255,255,.08)', color:'#888', fontSize:'.72rem', cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='#888'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.08)'; }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 24px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', opacity:saving?.6:1 }}>
              {saving ? '⏳ Saving...' : isEdit ? '💾 Save Changes' : '＋ Create Course'}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

const iS: React.CSSProperties = { width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.78rem', padding:'10px 12px', outline:'none', fontFamily:'inherit', transition:'border-color .3s', boxSizing:'border-box' };
const lblS: React.CSSProperties = { display:'block', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666', marginBottom:'6px' };
const errS: React.CSSProperties = { fontSize:'.65rem', color:'#FF4757', marginTop:'3px' };

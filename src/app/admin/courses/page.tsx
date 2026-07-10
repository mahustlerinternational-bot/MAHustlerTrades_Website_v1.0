'use client';
// src/app/admin/courses/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Course } from '@/types';
import CourseFormModal from '@/components/admin/courses/CourseFormModal';

export default function AdminCoursesPage() {
  const [courses,   setCourses]   = useState<Course[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Course | null>(null);
  const [total,     setTotal]     = useState(0);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/courses?limit=50');
      const json = await res.json();
      setCourses(Array.isArray(json?.data) ? json.data : []);
      setTotal(json?.total ?? 0);
    } catch { setCourses([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const filtered = (Array.isArray(courses) ? courses : []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  async function togglePublish(c: Course) {
    const res = await fetch(`/api/admin/courses/${c.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ is_published: !c.is_published }) });
    if (res.ok) { toast.success(c.is_published ? 'Unpublished' : 'Published'); fetchCourses(); } else toast.error('Update failed');
  }

  async function deleteCourse(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/courses/${id}`, { method:'DELETE' });
    if (res.ok) { toast.success('Course deleted'); fetchCourses(); }
    else { const e = await res.json(); toast.error(e.error ?? 'Delete failed'); }
  }

  const LEVEL_COLOR: Record<string,string> = { Beginner:'#34D399', Intermediate:'#60A5FA', Advanced:'#F59E0B', Expert:'#F87171', 'All Levels':'#A78BFA' };

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .course-row:hover{background:rgba(255,255,255,.025)!important}
        .act-btn:hover{opacity:1!important}
        .act-btn{opacity:0!important;transition:opacity .2s!important}
        .course-row:hover .act-btn{opacity:1!important}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <div>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Academy</p>
          <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Course Management</h1>
          <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>{total} total courses</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          style={{ display:'flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'11px 24px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', animation:'fadeUp .5s .05s ease forwards', opacity:0 }}>
          ＋ New Course
        </button>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:'360px', marginBottom:'1.5rem', animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#555', fontSize:'13px' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
          style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,.07)', color:'#fff', fontSize:'.78rem', padding:'10px 12px 10px 36px', outline:'none', fontFamily:'inherit' }}
          onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
          onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.07)')} />
      </div>

      {/* Table */}
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .15s ease forwards', opacity:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 140px 90px 100px 80px 90px', gap:'1rem', padding:'.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
          {['Course','Level / Market','Price','Status','Actions',''].map(h => (
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
            <p style={{ fontSize:'2rem', marginBottom:'10px' }}>📚</p>
            <p style={{ fontSize:'.8rem', color:'#555' }}>No courses found.</p>
          </div>
        )}
        {!loading && filtered.map(c => (
          <div key={c.id} className="course-row"
            style={{ display:'grid', gridTemplateColumns:'1fr 140px 90px 100px 80px 90px', gap:'1rem', padding:'.9rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.03)', alignItems:'center', transition:'background .15s' }}>
            {/* Course info */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
              <div style={{ width:'42px', height:'42px', background:'linear-gradient(135deg,#0D0D0D,#1A1500)', border:'1px solid rgba(212,175,55,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', flexShrink:0, overflow:'hidden' }}>
                {c.logo_url ? <img src={c.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : '📈'}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:'.8rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</p>
                <p style={{ fontSize:'.62rem', color:'#555', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.description?.slice(0,55)}…</p>
              </div>
            </div>
            {/* Level */}
            <div>
              <p style={{ fontSize:'.68rem', fontWeight:500, color: LEVEL_COLOR[c.level] ?? '#888' }}>{c.level}</p>
              <p style={{ fontSize:'.62rem', color:'#555', marginTop:'2px' }}>{c.market ?? '—'}</p>
            </div>
            {/* Price */}
            <p style={{ fontSize:'.88rem', fontWeight:700, fontFamily:'JetBrains Mono,monospace', color:'#D4AF37' }}>${c.price.toFixed(2)}</p>
            {/* Status */}
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: c.is_published ? '#34D399' : '#555', flexShrink:0 }} />
              <span style={{ fontSize:'.65rem', letterSpacing:'1px', color: c.is_published ? '#34D399' : '#555' }}>{c.is_published ? 'Live' : 'Draft'}</span>
            </div>
            {/* Actions */}
            <div style={{ display:'flex', gap:'6px' }}>
              <button className="act-btn" onClick={() => { setEditing(c); setShowModal(true); }}
                title="Edit" style={{ background:'none', border:'1px solid transparent', color:'#888', width:'28px', height:'28px', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(212,175,55,.3)'; (e.currentTarget as HTMLButtonElement).style.color='#D4AF37'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='transparent'; (e.currentTarget as HTMLButtonElement).style.color='#888'; }}>✏️</button>
              <button className="act-btn" onClick={() => togglePublish(c)}
                title={c.is_published ? 'Unpublish' : 'Publish'} style={{ background:'none', border:'1px solid transparent', color:'#888', width:'28px', height:'28px', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(96,165,250,.3)'; (e.currentTarget as HTMLButtonElement).style.color='#60A5FA'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='transparent'; (e.currentTarget as HTMLButtonElement).style.color='#888'; }}>{c.is_published ? '👁️' : '🔒'}</button>
              <button className="act-btn" onClick={() => deleteCourse(c.id, c.title)}
                title="Delete" style={{ background:'none', border:'1px solid transparent', color:'#888', width:'28px', height:'28px', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,71,87,.3)'; (e.currentTarget as HTMLButtonElement).style.color='#FF4757'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='transparent'; (e.currentTarget as HTMLButtonElement).style.color='#888'; }}>🗑️</button>
            </div>
            <div />
          </div>
        ))}
      </div>

      {showModal && (
        <CourseFormModal course={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchCourses(); }} />
      )}
    </div>
  );
}

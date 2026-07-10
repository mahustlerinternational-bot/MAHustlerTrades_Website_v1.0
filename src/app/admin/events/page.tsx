'use client';
// src/app/admin/events/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast }      from 'sonner';
import { format }     from 'date-fns';
import type { TradeEvent } from '@/types';
import EventFormModal from '@/components/admin/events/EventFormModal';

const BADGE_COLOR: Record<string, string> = {
  Live: '#34D399', VIP: '#F59E0B', 'In-Person': '#60A5FA', Free: '#D4AF37',
};

export default function AdminEventsPage() {
  const [events,    setEvents]    = useState<TradeEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [total,     setTotal]     = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<TradeEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/events?limit=50');
      const json = await res.json();
      setEvents(Array.isArray(json?.data) ? json.data : []);
      setTotal(json?.total ?? 0);
    } catch { setEvents([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = (Array.isArray(events) ? events : [])
    .filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

  async function togglePublish(ev: TradeEvent) {
    const res = await fetch(`/api/admin/events/${ev.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !ev.is_published }),
    });
    if (res.ok) { toast.success(ev.is_published ? 'Unpublished' : 'Published'); fetchEvents(); }
    else toast.error('Update failed');
  }

  async function deleteEvent(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Event deleted'); fetchEvents(); }
    else { const e = await res.json(); toast.error(e.error ?? 'Delete failed'); }
  }

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ev-row:hover{background:rgba(255,255,255,.025)!important}
        .ev-act{opacity:0!important;transition:opacity .2s!important}
        .ev-row:hover .ev-act{opacity:1!important}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <div>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Events</p>
          <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Event Management</h1>
          <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>{total} total events</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          style={{ display:'flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'11px 24px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', animation:'fadeUp .5s .05s ease forwards', opacity:0 }}>
          ＋ New Event
        </button>
      </div>

      {/* Search */}
      <div style={{ position:'relative', maxWidth:'360px', marginBottom:'1.5rem', animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#555', fontSize:'13px' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
          style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,.07)', color:'#fff', fontSize:'.78rem', padding:'10px 12px 10px 36px', outline:'none', fontFamily:'inherit' }}
          onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
          onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.07)')} />
      </div>

      {/* Table */}
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .15s ease forwards', opacity:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 150px 120px 130px 80px 80px', gap:'1rem', padding:'.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
          {['Event','Date / Time','Location','Capacity','Status',''].map(h => (
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
            <p style={{ fontSize:'2rem', marginBottom:'10px' }}>📅</p>
            <p style={{ fontSize:'.8rem', color:'#555' }}>No events found.</p>
          </div>
        )}
        {!loading && filtered.map(ev => {
          const bc = ev.badge ? (BADGE_COLOR[ev.badge] ?? '#888') : null;
          const cap = ev.capacity ? Math.min(100, Math.round(ev.registered_count / ev.capacity * 100)) : null;
          return (
            <div key={ev.id} className="ev-row"
              style={{ display:'grid', gridTemplateColumns:'1fr 150px 120px 130px 80px 80px', gap:'1rem', padding:'.9rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.03)', alignItems:'center', transition:'background .15s' }}>
              {/* Title + badge */}
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                  <p style={{ fontSize:'.8rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</p>
                  {bc && ev.badge && (
                    <span style={{ fontSize:'.58rem', letterSpacing:'1.5px', textTransform:'uppercase', padding:'2px 6px', border:`1px solid ${bc}44`, color:bc, background:`${bc}11`, flexShrink:0 }}>{ev.badge}</span>
                  )}
                </div>
                {ev.ticket_price > 0 && (
                  <p style={{ fontSize:'.65rem', color:'#D4AF37', marginTop:'3px', fontFamily:'JetBrains Mono,monospace' }}>${ev.ticket_price.toFixed(2)}</p>
                )}
              </div>
              {/* Date */}
              <div>
                <p style={{ fontSize:'.75rem', fontWeight:500 }}>{format(new Date(ev.event_date),'dd MMM yyyy')}</p>
                <p style={{ fontSize:'.62rem', color:'#555', marginTop:'2px', fontFamily:'JetBrains Mono,monospace' }}>{format(new Date(ev.event_date),'HH:mm')} GST</p>
              </div>
              {/* Location */}
              <p style={{ fontSize:'.73rem', color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {ev.location ?? (ev.is_virtual ? '🌐 Virtual' : 'TBA')}
              </p>
              {/* Capacity */}
              <div>
                <p style={{ fontSize:'.73rem', color:'#888', marginBottom:'4px' }}>
                  {ev.capacity ? `${ev.registered_count} / ${ev.capacity}` : `${ev.registered_count} registered`}
                </p>
                {cap !== null && (
                  <div style={{ height:'3px', background:'#1E1E1E', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${cap}%`, background: cap >= 90 ? '#FF4757' : cap >= 60 ? '#F59E0B' : '#34D399', borderRadius:'2px' }} />
                  </div>
                )}
              </div>
              {/* Status */}
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: ev.is_published ? '#34D399' : '#555' }} />
                <span style={{ fontSize:'.65rem', color: ev.is_published ? '#34D399' : '#555' }}>{ev.is_published ? 'Live' : 'Draft'}</span>
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:'4px' }}>
                {[
                  { icon:'✏️', title:'Edit',                          fn:() => { setEditing(ev); setShowModal(true); }, hc:'rgba(212,175,55,.3)', ht:'#D4AF37' },
                  { icon: ev.is_published ? '👁️' : '🔒', title: ev.is_published ? 'Unpublish' : 'Publish', fn:() => togglePublish(ev), hc:'rgba(96,165,250,.3)', ht:'#60A5FA' },
                  { icon:'🗑️', title:'Delete',                        fn:() => deleteEvent(ev.id,ev.title), hc:'rgba(255,71,87,.3)', ht:'#FF4757' },
                ].map(({ icon, title, fn, hc, ht }) => (
                  <button key={title} className="ev-act" onClick={fn} title={title}
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

      {showModal && (
        <EventFormModal event={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchEvents(); }} />
      )}
    </div>
  );
}

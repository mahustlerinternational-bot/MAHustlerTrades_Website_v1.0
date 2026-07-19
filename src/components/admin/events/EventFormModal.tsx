'use client';
// src/components/admin/events/EventFormModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { TradeEvent } from '@/types';
import { authFetch } from '@/lib/utils/authFetch';

const schema = z.object({
  title:            z.string().min(3),
  description:      z.string().optional(),
  event_type:       z.enum(['webinar','live_trading','summit','review','masterclass']),
  event_date:       z.string().min(1, 'Date is required'),
  event_time:       z.string().min(1, 'Time is required'),
  duration_minutes: z.coerce.number().optional(),
  location:         z.string().optional(),
  is_virtual:       z.boolean().default(true),
  capacity:         z.coerce.number().optional(),
  ticket_price:     z.coerce.number().min(0).default(0),
  vip_ticket_price: z.coerce.number().optional(),
  badge:            z.enum(['Live','VIP','In-Person','Free','']).optional(),
  host_name:        z.string().optional(),
  is_published:     z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface Props { event: TradeEvent | null; onClose: () => void; onSaved: () => void; }

const EVENT_TYPES = [
  { value: 'webinar',      label: 'Webinar'          },
  { value: 'live_trading', label: 'Live Trading'     },
  { value: 'summit',       label: 'Summit'           },
  { value: 'review',       label: 'Portfolio Review' },
  { value: 'masterclass',  label: 'Masterclass'      },
];

export default function EventFormModal({ event, onClose, onSaved }: Props) {
  const isEdit = !!event;
  const [saving, setSaving] = useState(false);

  const existingDate = event?.event_date ? format(new Date(event.event_date), 'yyyy-MM-dd') : '';
  const existingTime = event?.event_date ? format(new Date(event.event_date), 'HH:mm') : '';

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title:            event?.title            ?? '',
      description:      event?.description      ?? '',
      event_type:       (event?.event_type      ?? 'webinar') as any,
      event_date:       existingDate,
      event_time:       existingTime,
      duration_minutes: event?.duration_minutes ?? undefined,
      location:         event?.location         ?? '',
      is_virtual:       event?.is_virtual       ?? true,
      capacity:         event?.capacity         ?? undefined,
      ticket_price:     event?.ticket_price     ?? 0,
      vip_ticket_price: event?.vip_ticket_price ?? undefined,
      badge:            (event?.badge           ?? '') as any,
      host_name:        event?.host_name        ?? '',
      is_published:     event?.is_published     ?? false,
    },
  });

  const isVirtual = watch('is_virtual');

  async function onSubmit(values: FormData) {
    setSaving(true);
    try {
      const event_date = new Date(`${values.event_date}T${values.event_time}:00+04:00`).toISOString();
      const payload = { ...values, event_date, badge: values.badge || null };

      const url    = isEdit ? `/api/admin/events/${event!.id}` : '/api/admin/events';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Save failed'); return; }
      toast.success(isEdit ? 'Event updated' : 'Event created');
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:50, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'1.5rem', overflowY:'auto' }}>
      <div style={{ background:'#111', border:'1px solid rgba(212,175,55,.25)', width:'100%', maxWidth:'680px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div>
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'4px' }}>{isEdit ? 'Edit' : 'New'} Event</p>
            <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.2rem', fontWeight:700, color:'#fff' }}>{isEdit ? event!.title : 'Create Event'}</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', fontSize:'20px', cursor:'pointer', lineHeight:1 }}
            onMouseEnter={e => (e.currentTarget.style.color='#fff')}
            onMouseLeave={e => (e.currentTarget.style.color='#555')}>✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* Title */}
          <div>
            <label style={lblS}>Event Title *</label>
            <input {...register('title')} placeholder="e.g. Weekly Live Trading Room — Forex &amp; Indices" style={iS}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            {errors.title && <p style={errS}>{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label style={lblS}>Description</label>
            <textarea {...register('description')} rows={2} placeholder="Event details and what attendees can expect..." style={{ ...iS, resize:'none' }}
              onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
              onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
          </div>

          {/* Type / Badge / Host */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lblS}>Event Type *</label>
              <select {...register('event_type')} style={{ ...iS, cursor:'pointer' }}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lblS}>Badge</label>
              <select {...register('badge')} style={{ ...iS, cursor:'pointer' }}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')}>
                <option value="">No Badge</option>
                <option value="Live">Live</option>
                <option value="VIP">VIP</option>
                <option value="In-Person">In-Person</option>
                <option value="Free">Free</option>
              </select>
            </div>
            <div>
              <label style={lblS}>Host / Speaker</label>
              <input {...register('host_name')} placeholder="e.g. MAH Team" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
          </div>

          {/* Date / Time / Duration */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lblS}>Date *</label>
              <input {...register('event_date')} type="date" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              {errors.event_date && <p style={errS}>{errors.event_date.message}</p>}
            </div>
            <div>
              <label style={lblS}>Time (GST) *</label>
              <input {...register('event_time')} type="time" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              {errors.event_time && <p style={errS}>{errors.event_time.message}</p>}
            </div>
            <div>
              <label style={lblS}>Duration (min)</label>
              <input {...register('duration_minutes')} type="number" min="0" placeholder="90" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
          </div>

          {/* Location + toggles */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={lblS}>Location / Platform</label>
              <input {...register('location')} placeholder={isVirtual ? 'Zoom / Google Meet link' : 'e.g. Dubai, UAE'} style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'16px', paddingBottom:'2px' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}>
                <input type="checkbox" {...register('is_virtual')} style={{ width:'16px', height:'16px', accentColor:'#D4AF37' }} />
                <span style={{ fontSize:'.78rem', color:'#888' }}>Virtual event</span>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}>
                <input type="checkbox" {...register('is_published')} style={{ width:'16px', height:'16px', accentColor:'#D4AF37' }} />
                <span style={{ fontSize:'.78rem', color:'#888' }}>Publish immediately</span>
              </label>
            </div>
          </div>

          {/* Capacity / Ticket Prices */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={lblS}>Capacity (optional)</label>
              <input {...register('capacity')} type="number" min="0" placeholder="Unlimited" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <div>
              <label style={lblS}>Ticket Price (USD)</label>
              <input {...register('ticket_price')} type="number" step="0.01" min="0" placeholder="0.00" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              {errors.ticket_price && <p style={errS}>{errors.ticket_price.message}</p>}
            </div>
            <div>
              <label style={lblS}>VIP Ticket Price</label>
              <input {...register('vip_ticket_price')} type="number" step="0.01" min="0" placeholder="Optional" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
          </div>

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
              {saving ? '⏳ Saving...' : isEdit ? '💾 Save Changes' : '＋ Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const iS: React.CSSProperties = { width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.78rem', padding:'10px 12px', outline:'none', fontFamily:'inherit', transition:'border-color .3s', boxSizing:'border-box' };
const lblS: React.CSSProperties = { display:'block', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666', marginBottom:'6px' };
const errS: React.CSSProperties = { fontSize:'.65rem', color:'#FF4757', marginTop:'3px' };

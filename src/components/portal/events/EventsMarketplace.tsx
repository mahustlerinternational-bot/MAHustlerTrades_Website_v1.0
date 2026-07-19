'use client';
// src/components/portal/events/EventsMarketplace.tsx
import { useState, useEffect } from 'react';
import { format }              from 'date-fns';
import { Calendar, MapPin, Globe, Users, Loader2, X, Ticket } from 'lucide-react';
import { toast }               from 'sonner';
import type { TradeEvent }     from '@/types';
import { authFetch }           from '@/lib/utils/authFetch';

interface Props { events: TradeEvent[]; }

function useCountdown(target: string) {
  const [delta, setDelta] = useState(new Date(target).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDelta(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (delta <= 0) return null;
  return {
    d: Math.floor(delta / 86400000),
    h: Math.floor((delta % 86400000) / 3600000),
    m: Math.floor((delta % 3600000)  / 60000),
    s: Math.floor((delta % 60000)    / 1000),
  };
}

function CountdownBadge({ target }: { target: string }) {
  const t = useCountdown(target);
  if (!t) return <span className="text-[10px] text-green-400 font-semibold">● Live Now</span>;
  return (
    <div className="flex gap-1.5">
      {[['D', t.d], ['H', t.h], ['M', t.m], ['S', t.s]].map(([l, n]) => (
        <div key={l as string} className="bg-[#0A0A0A] border border-[rgba(212,175,55,0.15)] px-2 py-1 text-center min-w-[36px]">
          <span className="block font-mono text-sm font-bold text-[#D4AF37] leading-none">
            {String(n).padStart(2,'0')}
          </span>
          <span className="text-[8px] text-[#444] uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
}

export default function EventsMarketplace({ events }: Props) {
  const [selected, setSelected] = useState<TradeEvent | null>(null);

  const badgeBg: Record<string, string> = {
    Live:       'bg-green-400/10 text-green-400 border-green-400/20',
    VIP:        'bg-amber-400/10 text-amber-400 border-amber-400/20',
    'In-Person':'bg-blue-400/10 text-blue-400 border-blue-400/20',
    Free:       'bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-[rgba(212,175,55,0.2)]',
  };

  return (
    <>
      <div className="space-y-3">
        {events.map(ev => (
          <div key={ev.id}
            className="bg-[#111] border border-[rgba(255,255,255,0.06)] border-l-2 border-l-[rgba(212,175,55,0.3)] p-5 hover:bg-[rgba(255,255,255,0.02)] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <p className="text-[9px] tracking-[2px] text-[#D4AF37] uppercase">
                    {format(new Date(ev.event_date), 'MMM d, yyyy · HH:mm')} GST
                  </p>
                  {ev.badge && (
                    <span className={`text-[9px] tracking-[1px] uppercase border px-2 py-0.5 ${badgeBg[ev.badge] ?? ''}`}>
                      {ev.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{ev.title}</h3>
                <div className="flex items-center gap-4 text-[10px] text-[#555] mb-3 flex-wrap">
                  {ev.host_name && <span>🎙 {ev.host_name}</span>}
                  <span className="flex items-center gap-1">
                    {ev.is_virtual ? <Globe size={10} /> : <MapPin size={10} />}
                    {ev.location ?? (ev.is_virtual ? 'Virtual' : 'TBA')}
                  </span>
                  {ev.capacity && (
                    <span className="flex items-center gap-1">
                      <Users size={10} /> {ev.registered_count}/{ev.capacity} registered
                    </span>
                  )}
                </div>
                <CountdownBadge target={ev.event_date} />
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-serif font-bold text-[#D4AF37] text-lg mb-2">
                  {ev.ticket_price === 0 ? 'Free' : `$${ev.ticket_price.toFixed(2)}`}
                </p>
                <button
                  onClick={() => setSelected(ev)}
                  disabled={!!ev.capacity && ev.registered_count >= ev.capacity}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-black text-[10px] font-bold font-serif tracking-[2px] uppercase px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Ticket size={11} />
                  {ev.capacity && ev.registered_count >= ev.capacity ? 'Full' : 'Reserve'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <RegisterModal event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

// ── Registration Modal ────────────────────────────────────────
function RegisterModal({ event, onClose }: { event: TradeEvent; onClose: () => void }) {
  const [ticketType, setTicketType] = useState<'standard' | 'vip'>(
    event.ticket_price === 0 ? 'standard' : 'standard'
  );
  const [loading, setLoading] = useState(false);

  const price = ticketType === 'vip' && event.vip_ticket_price
    ? event.vip_ticket_price
    : event.ticket_price;

  async function handleRegister() {
    setLoading(true);
    try {
      const res = await authFetch('/api/me/events', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          event_id:    event.id,
          ticket_type: event.ticket_price === 0 ? 'free' : ticketType,
        }),
      });
      const data = await res.json();

      if (data.requires_payment) {
        toast.loading('Redirecting to secure Ziina payment...');
        const paymentResponse = await authFetch('/api/payments/ziina', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ type:'event', id:event.id, ticket_type:ticketType }),
        });
        const payment = await paymentResponse.json();
        toast.dismiss();
        if (!paymentResponse.ok || !payment.checkout_url) {
          toast.error(payment.error ?? payment.message ?? 'Unable to start payment');
          return;
        }
        window.location.href = payment.checkout_url;
        return;
      }
      if (!res.ok) { toast.error(data.error ?? 'Registration failed'); return; }

      toast.success(`Registered for "${event.title}"!`);
      onClose();
      window.location.reload();
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[rgba(212,175,55,0.25)] w-full max-w-md">
        <div className="flex items-start justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <div>
            <p className="text-[9px] tracking-[2px] text-[#D4AF37] uppercase font-serif mb-0.5">Reserve Spot</p>
            <h3 className="text-white font-semibold text-sm leading-tight">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Event info */}
          <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <Calendar size={12} className="text-[#D4AF37]" />
              {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy · HH:mm')} GST
            </div>
            {event.host_name && (
              <p className="text-[11px] text-[#555]">🎙 {event.host_name}</p>
            )}
            {event.capacity && (
              <p className="text-[11px] text-[#555]">
                <Users size={10} className="inline mr-1" />
                {event.capacity - event.registered_count} spots remaining
              </p>
            )}
          </div>

          {/* Ticket type selection */}
          {event.vip_ticket_price && (
            <div>
              <label className="block text-[9px] tracking-[2px] text-[#888] uppercase mb-2">Ticket Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'standard', label: 'Standard', price: event.ticket_price },
                  { type: 'vip',      label: 'VIP',      price: event.vip_ticket_price },
                ].map(({ type, label, price: p }) => (
                  <button key={type} onClick={() => setTicketType(type as any)}
                    className={`p-3 border text-xs text-left transition-all
                      ${ticketType === type
                        ? 'border-[#D4AF37] bg-[rgba(212,175,55,0.08)] text-[#D4AF37]'
                        : 'border-[rgba(255,255,255,0.08)] text-[#888] hover:border-[rgba(212,175,55,0.2)]'}`}
                  >
                    <p className="font-semibold">{label}</p>
                    <p className="font-mono mt-1">${p!.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price summary */}
          <div className="flex justify-between items-center border-t border-[rgba(255,255,255,0.06)] pt-4">
            <span className="text-xs text-[#888]">Total</span>
            <span className="font-serif font-bold text-[#D4AF37] text-xl">
              {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
            </span>
          </div>

          {/* CTA */}
          <button onClick={handleRegister} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-black py-3 text-xs font-bold font-serif tracking-[2.5px] uppercase hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Processing...' : price === 0 ? 'Reserve Free Spot' : `Purchase Ticket — $${price.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

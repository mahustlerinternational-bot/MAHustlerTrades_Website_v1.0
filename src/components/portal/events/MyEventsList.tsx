'use client';
// src/components/portal/events/MyEventsList.tsx
import { Calendar, MapPin, Globe, Ticket, CheckCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import type { EventRegistration, TradeEvent } from '@/types';

interface RegWithEvent extends EventRegistration { event: TradeEvent; }

export function MyEventsList({ registrations }: { registrations: RegWithEvent[] }) {
  return (
    <div className="space-y-3">
      {registrations.map(reg => {
        const ev      = reg.event;
        const past    = isPast(new Date(ev.event_date));
        const badgeStyle: Record<string, string> = {
          Live:       'bg-green-400/10 text-green-400 border-green-400/20',
          VIP:        'bg-[rgba(245,158,11,0.1)] text-amber-400 border-amber-400/20',
          'In-Person':'bg-blue-400/10 text-blue-400 border-blue-400/20',
          Free:       'bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border-[rgba(212,175,55,0.2)]',
        };

        return (
          <div key={reg.id}
            className={`bg-[#111] border-l-2 border-[rgba(255,255,255,0.06)] p-4 flex items-start gap-4 transition-all
              ${past ? 'opacity-60' : 'border-l-[#D4AF37] hover:bg-[rgba(255,255,255,0.02)]'}`}
          >
            {/* Date block */}
            <div className="flex-shrink-0 w-12 text-center bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] py-2">
              <p className="text-[#D4AF37] font-serif font-bold text-lg leading-none">
                {format(new Date(ev.event_date), 'd')}
              </p>
              <p className="text-[9px] text-[#555] uppercase tracking-[1px] mt-0.5">
                {format(new Date(ev.event_date), 'MMM')}
              </p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-semibold text-white leading-tight">{ev.title}</h3>
                {ev.badge && (
                  <span className={`text-[9px] tracking-[1.5px] uppercase border px-2 py-0.5 flex-shrink-0 ${badgeStyle[ev.badge] ?? ''}`}>
                    {ev.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-[10px] text-[#555]">
                <span className="flex items-center gap-1">
                  <Calendar size={10} /> {format(new Date(ev.event_date), 'HH:mm')} GST
                </span>
                <span className="flex items-center gap-1">
                  {ev.is_virtual ? <Globe size={10} /> : <MapPin size={10} />}
                  {ev.location ?? (ev.is_virtual ? 'Virtual' : 'TBA')}
                </span>
                {ev.host_name && <span>🎙 {ev.host_name}</span>}
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1.5 text-[10px] text-green-400 mb-1">
                <CheckCircle size={11} /> Confirmed
              </div>
              <p className="text-[9px] text-[#555] capitalize">
                {reg.ticket_type === 'free' ? 'Free' : `${reg.ticket_type} · $${reg.amount_paid.toFixed(2)}`}
              </p>
              {past && <p className="text-[9px] text-[#444] mt-1">Event ended</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MyEventsList;

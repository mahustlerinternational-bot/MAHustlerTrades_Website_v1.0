'use client';

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  History,
  MapPin,
  Mic2,
  Radio,
  Ticket,
} from 'lucide-react';
import type { EventRegistration, RegStatus, TradeEvent } from '@/types';

interface RegWithEvent extends Omit<EventRegistration, 'event'> {
  event: TradeEvent | null;
}

type EventTiming = 'live' | 'upcoming' | 'completed';

const GST_DATE = new Intl.DateTimeFormat('en-AE', {
  timeZone: 'Asia/Dubai',
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const GST_TIME = new Intl.DateTimeFormat('en-AE', {
  timeZone: 'Asia/Dubai',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const GST_MONTH = new Intl.DateTimeFormat('en-AE', {
  timeZone: 'Asia/Dubai',
  month: 'short',
});

const GST_DAY = new Intl.DateTimeFormat('en-AE', {
  timeZone: 'Asia/Dubai',
  day: '2-digit',
});

const STATUS_STYLES: Record<RegStatus, { label: string; classes: string }> = {
  confirmed: {
    label: 'Registration confirmed',
    classes: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
  waitlist: {
    label: 'On waitlist',
    classes: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  },
  pending_payment: {
    label: 'Payment pending',
    classes: 'border-blue-400/25 bg-blue-400/10 text-blue-300',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'border-white/10 bg-white/5 text-[#777]',
  },
};

const EVENT_TYPE_LABELS: Record<TradeEvent['event_type'], string> = {
  webinar: 'Webinar',
  live_trading: 'Live Trading',
  summit: 'Summit',
  review: 'Portfolio Review',
  masterclass: 'Masterclass',
};

function getEventTiming(event: TradeEvent): EventTiming {
  const startsAt = new Date(event.event_date).getTime();
  const durationMs = Math.max(1, Number(event.duration_minutes) || 60) * 60_000;
  const now = Date.now();

  if (now < startsAt) return 'upcoming';
  if (now <= startsAt + durationMs) return 'live';
  return 'completed';
}

function isWebLink(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function formatDuration(minutes: number | null) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return 'Duration TBA';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function formatTicket(registration: RegWithEvent) {
  if (registration.ticket_type === 'free') return 'Free admission';
  const paid = Number(registration.amount_paid) || 0;
  const label = registration.ticket_type === 'vip' ? 'VIP ticket' : 'Standard ticket';
  return paid > 0 ? `${label} · $${paid.toFixed(2)}` : label;
}

function EventCard({ registration }: { registration: RegWithEvent }) {
  const event = registration.event;
  if (!event) return null;

  const timing = getEventTiming(event);
  const status = STATUS_STYLES[registration.status] ?? STATUS_STYLES.confirmed;
  const venue = event.location || (event.is_virtual ? 'Online event' : 'Venue to be announced');
  const joinUrl = event.is_virtual && isWebLink(event.location) ? event.location : null;
  const canJoin = registration.status === 'confirmed' && timing !== 'completed' && joinUrl;

  return (
    <article
      className={`group relative overflow-hidden border bg-[#101010] transition-all duration-300 ${
        timing === 'completed'
          ? 'border-white/[0.06] opacity-75 hover:opacity-100'
          : 'border-[rgba(212,175,55,0.16)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.38)] hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]'
      }`}
    >
      <div className="grid min-h-[238px] grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative min-h-[180px] overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_56%),#0A0A0A] md:min-h-full md:border-b-0 md:border-r">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={`${event.title} cover`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CalendarDays size={52} strokeWidth={1} className="text-[#D4AF37]/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          <div className="absolute left-4 top-4 border border-[rgba(212,175,55,0.3)] bg-black/80 px-3 py-2 text-center backdrop-blur-sm">
            <span className="block font-serif text-2xl font-bold leading-none text-[#E4C65A]">
              {GST_DAY.format(new Date(event.event_date))}
            </span>
            <span className="mt-1 block text-[9px] uppercase tracking-[2px] text-[#A58B37]">
              {GST_MONTH.format(new Date(event.event_date))}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <span className="border border-white/10 bg-black/75 px-2.5 py-1 text-[9px] uppercase tracking-[1.8px] text-white/70 backdrop-blur-sm">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
            {timing === 'live' && (
              <span className="flex items-center gap-1.5 border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[1.5px] text-emerald-300 backdrop-blur-sm">
                <Radio size={10} className="animate-pulse" /> Live now
              </span>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {event.badge && (
                  <span className="border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] px-2 py-0.5 text-[9px] uppercase tracking-[1.8px] text-[#D4AF37]">
                    {event.badge}
                  </span>
                )}
                {timing === 'completed' && (
                  <span className="text-[9px] uppercase tracking-[1.8px] text-[#666]">Completed</span>
                )}
              </div>
              <h3 className="font-serif text-lg font-semibold leading-snug text-white sm:text-xl">
                {event.title}
              </h3>
            </div>

            <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[9px] uppercase tracking-[1.2px] ${status.classes}`}>
              <CheckCircle2 size={11} /> {status.label}
            </span>
          </div>

          {event.description && (
            <p
              className="mb-5 max-w-3xl text-xs leading-6 text-[#777]"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {event.description}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 border-y border-white/[0.06] py-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <CalendarDays size={15} className="mt-0.5 shrink-0 text-[#D4AF37]" />
              <div>
                <p className="text-[9px] uppercase tracking-[1.5px] text-[#4F4F4F]">Schedule</p>
                <p className="mt-1 text-[11px] leading-5 text-[#B8B8B8]">{GST_DATE.format(new Date(event.event_date))}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock3 size={15} className="mt-0.5 shrink-0 text-[#D4AF37]" />
              <div>
                <p className="text-[9px] uppercase tracking-[1.5px] text-[#4F4F4F]">Time</p>
                <p className="mt-1 text-[11px] leading-5 text-[#B8B8B8]">
                  {GST_TIME.format(new Date(event.event_date))} GST · {formatDuration(event.duration_minutes)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 sm:col-span-2 xl:col-span-1">
              {event.is_virtual ? (
                <Globe2 size={15} className="mt-0.5 shrink-0 text-[#D4AF37]" />
              ) : (
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#D4AF37]" />
              )}
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[1.5px] text-[#4F4F4F]">
                  {event.is_virtual ? 'Access' : 'Venue'}
                </p>
                <p className="mt-1 truncate text-[11px] leading-5 text-[#B8B8B8]">
                  {joinUrl ? 'Private online event link' : venue}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-[#666]">
              {event.host_name && (
                <span className="flex items-center gap-1.5"><Mic2 size={11} /> Hosted by {event.host_name}</span>
              )}
              <span className="flex items-center gap-1.5"><Ticket size={11} /> {formatTicket(registration)}</span>
              <span>Reference #{registration.id.slice(0, 8).toUpperCase()}</span>
            </div>

            {canJoin ? (
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] px-5 py-2.5 font-serif text-[10px] font-bold uppercase tracking-[2px] text-black transition-opacity hover:opacity-90"
              >
                Join event <ExternalLink size={12} />
              </a>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-2 border border-white/[0.08] px-4 py-2 text-[9px] uppercase tracking-[1.5px] text-[#666]">
                {timing === 'completed' ? <History size={12} /> : <Clock3 size={12} />}
                {timing === 'completed' ? 'Event ended' : joinUrl ? 'Access pending' : 'Access details coming soon'}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function EventSection({
  eyebrow,
  title,
  registrations,
  muted = false,
}: {
  eyebrow: string;
  title: string;
  registrations: RegWithEvent[];
  muted?: boolean;
}) {
  if (!registrations.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className={`mb-1 text-[9px] uppercase tracking-[3px] ${muted ? 'text-[#555]' : 'text-[#D4AF37]'}`}>
            {eyebrow}
          </p>
          <h2 className="font-serif text-sm font-semibold text-white">{title}</h2>
        </div>
        <span className="font-mono text-[10px] text-[#555]">
          {String(registrations.length).padStart(2, '0')}
        </span>
      </div>
      <div className="space-y-4">
        {registrations.map(registration => (
          <EventCard key={registration.id} registration={registration} />
        ))}
      </div>
    </section>
  );
}

export function MyEventsList({ registrations }: { registrations: RegWithEvent[] }) {
  const valid = registrations.filter((registration): registration is RegWithEvent & { event: TradeEvent } => Boolean(registration.event));
  const sorted = [...valid].sort(
    (a, b) => new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime(),
  );
  const active = sorted.filter(registration => getEventTiming(registration.event) === 'live');
  const upcoming = sorted.filter(registration => getEventTiming(registration.event) === 'upcoming');
  const completed = sorted
    .filter(registration => getEventTiming(registration.event) === 'completed')
    .reverse();

  return (
    <div className="space-y-10">
      <EventSection eyebrow="In progress" title="Live Events" registrations={active} />
      <EventSection eyebrow="Your schedule" title="Upcoming Registrations" registrations={upcoming} />
      <EventSection eyebrow="Previous attendance" title="Event History" registrations={completed} muted />
    </div>
  );
}

export default MyEventsList;

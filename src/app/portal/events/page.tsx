// src/app/portal/events/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import MyEventsList     from '@/components/portal/events/MyEventsList';
import EventsMarketplace from '@/components/portal/events/EventsMarketplace';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [regRes, allEventsRes] = await Promise.all([
      supabaseAdmin.from('event_registrations').select('*, event:events(*)').eq('user_id', userId).neq('status', 'cancelled').order('registered_at', { ascending: false }),
      supabaseAdmin.from('events').select('*').eq('is_published', true).gte('event_date', new Date().toISOString()).order('event_date'),
    ]);
    const regIds = new Set((regRes.data ?? []).map((r: any) => r.event_id));
    return {
      registrations: regRes.data ?? [],
      upcoming: (allEventsRes.data ?? []).filter((e: any) => !regIds.has(e.id)),
    };
  } catch { return { registrations: [], upcoming: [] }; }
}

export default async function MyEventsPage() {
  let user = null;
  try { const sb = await createSupabaseServerClient(); const { data } = await sb.auth.getUser(); user = data.user; } catch {}
  if (!user) return <div style={{padding:'2rem',color:'#888',fontFamily:'Montserrat,sans-serif'}}>Please <a href="/portal" style={{color:'#D4AF37'}}>sign in</a>.</div>;

  const { registrations, upcoming } = await getData(user.id);

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Calendar</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>My Events</h1>
        <p style={{ fontSize:'.72rem', color:'#666', marginTop:'8px', maxWidth:'620px', lineHeight:1.7 }}>
          {registrations.length > 0
            ? `Manage your ${registrations.length} event registration${registrations.length !== 1 ? 's' : ''}, schedule and private access details.`
            : 'Your registered events, schedules and access details will appear here.'}
        </p>
      </div>

      {registrations.length > 0 ? (
        <div style={{ marginBottom:'3rem', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.5rem' }}>
            <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Registered Events</p>
          </div>
          <MyEventsList registrations={registrations as any} />
        </div>
      ) : (
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'3rem', textAlign:'center', marginBottom:'3rem', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
          <p style={{ fontSize:'2.5rem', marginBottom:'12px' }}>📅</p>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.9rem', fontWeight:600, marginBottom:'6px' }}>No Events Yet</p>
          <p style={{ fontSize:'.78rem', color:'#555' }}>Browse upcoming events below and reserve your spot.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ animation:'fadeUp .5s .16s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'3rem', marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#60A5FA,#2563EB)' }} />
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Upcoming Events</p>
            </div>
            <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,.04)' }} />
          </div>
          <EventsMarketplace events={upcoming as any} />
        </div>
      )}
    </div>
  );
}

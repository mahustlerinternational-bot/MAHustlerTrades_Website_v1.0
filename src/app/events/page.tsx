'use client';

import Link from 'next/link';
import {ArrowRight, CalendarDays, Clock3, MapPin, Mic2, Radio, Sparkles, UsersRound, Video} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import PublicNav from '@/components/public/PublicNav';
import Reveal from '@/components/public/Reveal';
import type {TradeEvent} from '@/types';
import styles from './Events.module.css';

function Countdown({date}:{date:string}){
  const target=useMemo(()=>new Date(date).getTime(),[date]);
  const [remaining,setRemaining]=useState(()=>Math.max(0,target-Date.now()));
  useEffect(()=>{
    const update=()=>setRemaining(Math.max(0,target-Date.now()));
    update();const timer=window.setInterval(update,1000);return()=>window.clearInterval(timer);
  },[target]);
  if(!remaining)return <span className={styles.liveNow}><i/>Live or recently started</span>;
  const cells=[
    ['Days',Math.floor(remaining/86400000)],
    ['Hrs',Math.floor((remaining%86400000)/3600000)],
    ['Min',Math.floor((remaining%3600000)/60000)],
    ['Sec',Math.floor((remaining%60000)/1000)],
  ];
  return <div className={styles.countdown}>{cells.map(([label,value])=><span key={label as string}><strong>{String(value).padStart(2,'0')}</strong><small>{label}</small></span>)}</div>;
}

function eventLabel(event:TradeEvent){
  return new Intl.DateTimeFormat('en-AE',{weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(event.event_date));
}

export default function EventsPage(){
  const [events,setEvents]=useState<TradeEvent[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch('/api/events?upcoming=true',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('Unable to load events');
      const result=await response.json();setEvents(Array.isArray(result)?result:[]);
    }).catch(()=>setEvents([])).finally(()=>setLoading(false));
  },[]);
  const featured=events[0];
  const remaining=events.slice(1);

  return (
    <main className={styles.page}>
      <PublicNav active="events"/>
      <section className={styles.hero}>
        <div className={styles.grid}/><div className={styles.glow}/>
        <Reveal className={styles.heroCopy}>
          <div className={styles.badge}><Radio size={12}/> Live learning beyond the charts</div>
          <p className={styles.eyebrow}>Elite Events</p>
          <h1>Learn together.<span>Review the market in real time.</span></h1>
          <p>Join structured workshops, trading rooms, market reviews, masterclasses, and special member sessions designed to turn theory into a repeatable process.</p>
          <div className={styles.heroActions}>
            <a href="#event-list" className={styles.goldButton}>View Upcoming Events <ArrowRight size={15}/></a>
            <Link href="/portal/events" className={styles.outlineButton}>My Reservations</Link>
          </div>
        </Reveal>
        <Reveal className={styles.eventPromise} delay={120}>
          {[['Live context','See how analysis and risk decisions are organized while the market is moving.',Video],['Guided review','Ask better questions by following a defined preparation and review framework.',Mic2],['Member connection','Meet traders progressing through the same Academy and Elite ecosystem.',UsersRound]].map(([title,body,Icon])=>
            <article key={title as string}><Icon size={18}/><div><strong>{title as string}</strong><p>{body as string}</p></div></article>
          )}
        </Reveal>
      </section>

      <section className={styles.eventSection} id="event-list">
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Published Schedule</p>
          <h2>Choose the next room that moves your process forward.</h2>
          <p>Dates and availability below are managed directly by the MAHustler admin team. Sign in to reserve, check your registration, or access member-only event details.</p>
        </Reveal>

        {loading?(
          <div className={styles.loading} aria-live="polite"><span/><p>Loading upcoming events…</p></div>
        ):featured?(
          <>
            <Reveal>
              <article className={styles.featured}>
                <div className={styles.featuredMedia}>
                  {featured.cover_image_url?
                    <img src={featured.cover_image_url} alt={`${featured.title} event cover`}/>:
                    <div><CalendarDays size={46}/><span>MAHustler Elite Event</span></div>}
                  <b>{featured.badge??'Featured'}</b>
                </div>
                <div className={styles.featuredBody}>
                  <div className={styles.eventDate}>{eventLabel(featured)}</div>
                  <h3>{featured.title}</h3>
                  <p>{featured.description??'A focused MAHustler session designed to support more structured preparation, execution, and review.'}</p>
                  <div className={styles.meta}>
                    <span><Mic2 size={13}/>{featured.host_name??'MAHustler Team'}</span>
                    <span>{featured.is_virtual?<Video size={13}/>:<MapPin size={13}/>} {featured.location??(featured.is_virtual?'Online session':'Location announced privately')}</span>
                    {featured.duration_minutes&&<span><Clock3 size={13}/>{featured.duration_minutes} minutes</span>}
                  </div>
                  <Countdown date={featured.event_date}/>
                  <div className={styles.reserveRow}>
                    <div><small>Access from</small><strong>{featured.ticket_price>0?`$${featured.ticket_price.toFixed(2)}`:'Free'}</strong></div>
                    <Link href="/portal/events" className={styles.goldButton}>Reserve Your Place <ArrowRight size={14}/></Link>
                  </div>
                </div>
              </article>
            </Reveal>
            {remaining.length>0&&<div className={styles.eventGrid}>
              {remaining.map((event,index)=><Reveal key={event.id} delay={index%2*90}>
                <article className={styles.eventCard}>
                  <div className={styles.cardTop}><span>{event.badge??event.event_type.replaceAll('_',' ')}</span><b>{event.ticket_price>0?`$${event.ticket_price.toFixed(2)}`:'Free'}</b></div>
                  <p className={styles.eventDate}>{eventLabel(event)}</p><h3>{event.title}</h3>
                  <p>{event.description??'Join this upcoming MAHustler session and continue building your trading process.'}</p>
                  <div className={styles.meta}><span><Mic2 size={12}/>{event.host_name??'MAHustler Team'}</span><span>{event.is_virtual?<Video size={12}/>:<MapPin size={12}/>} {event.is_virtual?'Virtual':'In person'}</span></div>
                  <Countdown date={event.event_date}/>
                  <Link href="/portal/events">View event & reserve <ArrowRight size={13}/></Link>
                </article>
              </Reveal>)}
            </div>}
          </>
        ):(
          <Reveal className={styles.empty}>
            <CalendarDays size={34}/><h3>The next event schedule is being prepared.</h3>
            <p>Create a free member account to explore the portal and return when the next live room, workshop, or masterclass is published.</p>
            <Link href="/portal?tab=register" className={styles.goldButton}>Create Free Account <ArrowRight size={14}/></Link>
          </Reveal>
        )}
      </section>

      <section className={styles.eventTypes}>
        <Reveal className={styles.sectionIntro}><p className={styles.eyebrow}>What To Expect</p><h2>Events built for application—not passive watching.</h2></Reveal>
        <div>{[
          ['Live Trading Rooms','Follow preparation, scenarios, risk boundaries, and trade-management decisions in live market conditions.'],
          ['Market Reviews','Break down what moved, what mattered, and how a disciplined trader can document the session.'],
          ['Masterclasses','Go deeper into focused topics with guided examples, structured explanations, and practical next steps.'],
          ['Community Sessions','Stay connected through Q&A, platform guidance, milestone reviews, and special Elite announcements.'],
        ].map((item,index)=><Reveal key={item[0]} delay={index%2*80}><article><Sparkles size={17}/><h3>{item[0]}</h3><p>{item[1]}</p></article></Reveal>)}</div>
      </section>

      <section className={styles.memberBand}>
        <Reveal><p className={styles.eyebrow}>Already Registered?</p><h2>Your Elite Events dashboard keeps everything organized.</h2><p>View reservations, event status, schedules, access details, and upcoming opportunities from your member portal.</p><Link href="/portal/events" className={styles.goldButton}>Open Elite Events <ArrowRight size={14}/></Link></Reveal>
      </section>
    </main>
  );
}

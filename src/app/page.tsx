'use client';

import Link from 'next/link';
import {
  Activity, ArrowRight, Award, BarChart3, BookOpenCheck, Bot, CalendarDays,
  ChartNoAxesCombined, Check, Database, FolderLock, GraduationCap, LineChart,
  NotebookTabs, Radar, ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import PublicNav from '@/components/public/PublicNav';
import Reveal from '@/components/public/Reveal';
import styles from './Home.module.css';

const CAPABILITIES=[
  {icon:<GraduationCap/>,eyebrow:'Learn',title:'Professional Trading Academy',body:'Structured courses, lesson assessments, final validation, progress tracking, and verifiable electronic certificates—all inside one focused LMS.'},
  {icon:<Radar/>,eyebrow:'Interpret',title:'Quant AI Signal Intelligence',body:'Follow organized XAUUSD setup data, entry zones, TP1–TP3, risk levels, trade outcomes, regime context, and the complete signal history.'},
  {icon:<LineChart/>,eyebrow:'Prepare',title:'Elite Market Tools',body:'Build a daily process with charts, an economic calendar, market sessions, gold-driver intelligence, analysis workspaces, and risk calculators.'},
  {icon:<NotebookTabs/>,eyebrow:'Measure',title:'My Trading Journal',body:'Record executions, screenshots, strategies, mistakes, R-multiples, and performance trends across daily, weekly, and monthly views.'},
  {icon:<FolderLock/>,eyebrow:'Equip',title:'Elite Vault',body:'Access administrator-curated tools, templates, downloads, course resources, and member materials through an organized private repository.'},
  {icon:<CalendarDays/>,eyebrow:'Connect',title:'Elite Events',body:'Discover live trading rooms, workshops, reviews, masterclasses, and special community sessions—then reserve and manage your place.'},
];

const JOURNEY=[
  {num:'01',title:'Create your free member account',body:'Explore available courses, events, membership options, and the platform before deciding how deeply you want to participate.'},
  {num:'02',title:'Choose your development path',body:'Start with direct course access or complete Elite verification through an eligible broker account to unlock qualifying benefits.'},
  {num:'03',title:'Build a measurable process',body:'Study, take assessments, plan trades, manage risk, journal decisions, review performance, and improve from documented evidence.'},
];

const ECOSYSTEM=[
  ['Academy LMS','Lessons, assessments, progress, final exams, and certificates',BookOpenCheck],
  ['Live Signal Hub','Structured XAUUSD signals with lifecycle and outcome tracking',Activity],
  ['Elite Tools','Analysis workspace, calendar, sessions, heatmaps, and calculators',ChartNoAxesCombined],
  ['Trading Journal','Trade records, screenshots, analytics, and CSV portability',BarChart3],
  ['Elite Vault','Private downloads, resources, software, and member materials',Database],
  ['Support Assistant','Built-in guidance and support escalation inside the portal',Bot],
] as const;

export default function HomePage(){
  const [hero,setHero]=useState({
    badge_text:'Education · Intelligence · Execution Discipline',
    headline:'Build A Trading Process.',
    subheadline:'Not Another Guess.',
    sub_copy:'MAHustler Trades brings structured education, XAUUSD signal intelligence, market tools, events, journaling, and Elite resources into one professional member ecosystem.',
  });
  const [stats,setStats]=useState({members:'12,400+',volume:'$4.2B',satisfaction:'94%',instructors:'38',courses:'200+'});

  useEffect(()=>{
    fetch('/api/settings').then(response=>response.json()).then(data=>{
      if(data?.hero)setHero(current=>({...current,...data.hero}));
      if(data?.stats)setStats(current=>({...current,...data.stats}));
    }).catch(()=>undefined);
  },[]);

  return (
    <main className={styles.page}>
      <PublicNav active="home"/>

      <section className={styles.hero}>
        <div className={styles.heroGrid}/><div className={styles.heroGlow}/><div className={styles.heroOrb}/>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadge}><span/>{hero.badge_text}</div>
          <h1>{hero.headline}<span>{hero.subheadline}</span></h1>
          <p>{hero.sub_copy}</p>
          <div className={styles.heroActions}>
            <Link href="/academy" className={styles.goldButton}>Explore the Academy <ArrowRight size={15}/></Link>
            <Link href="/portal?tab=register" className={styles.outlineButton}>Create Free Account</Link>
          </div>
          <div className={styles.trustRow}>
            <span><Check size={13}/> Beginner-friendly path</span>
            <span><Check size={13}/> Risk-first framework</span>
            <span><Check size={13}/> One connected workspace</span>
          </div>
        </div>

        <div className={styles.commandCard} aria-label="MAHustler member ecosystem preview">
          <div className={styles.commandTop}>
            <div><small>Member command center</small><strong>Today&apos;s Trading Workflow</strong></div>
            <span><i/> System connected</span>
          </div>
          <div className={styles.marketStrip}>
            <div><small>Focus market</small><strong>XAUUSD</strong></div>
            <div><small>Workflow</small><strong>Plan → Execute → Review</strong></div>
          </div>
          <div className={styles.signalPreview}>
            <div className={styles.signalTitle}><span>Quant signal structure</span><b>BUY / SELL</b></div>
            {[
              ['ENTRY ZONE','Structured setup','#e7c75d'],
              ['TP1 · TP2 · TP3','Progressive targets','#34d399'],
              ['STOP LOSS','Defined invalidation','#fb7185'],
            ].map(([label,value,color])=><div key={label} className={styles.levelRow}><span style={{color}}>{label}</span><strong>{value}</strong></div>)}
          </div>
          <div className={styles.workflowGrid}>
            {[['Academy','Continue lesson','68%'],['Journal','Review last trade','+1.40R'],['Events','Next live room','Upcoming'],['Vault','New resources','Available']].map(([label,action,value])=>
              <div key={label}><small>{label}</small><strong>{action}</strong><span>{value}</span></div>
            )}
          </div>
        </div>
      </section>

      <div className={styles.capabilityTicker} aria-label="Platform capabilities">
        <div>{[...['XAUUSD Education','Quant Signals','Risk Planning','Trading Journal','Elite Tools','Live Events','Member Vault','Verified Certificates'],...['XAUUSD Education','Quant Signals','Risk Planning','Trading Journal','Elite Tools','Live Events','Member Vault','Verified Certificates']].map((item,index)=><span key={`${item}-${index}`}><Sparkles size={11}/>{item}</span>)}</div>
      </div>

      <section className={styles.stats} aria-label="MAHustler platform statistics">
        {[
          [stats.members,'Community Members'],[stats.courses,'Courses & Sessions'],[stats.instructors,'Contributors'],[stats.satisfaction,'Member Satisfaction'],[stats.volume,'Member Trading Volume'],
        ].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <section className={styles.capabilities}>
        <Reveal className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Everything Has A Purpose</p>
          <h2>From first lesson to disciplined execution.</h2>
          <p>MAHustler Trades is designed as a connected development environment—not a collection of disconnected videos, alerts, and spreadsheets.</p>
        </Reveal>
        <div className={styles.capabilityGrid}>
          {CAPABILITIES.map((item,index)=><Reveal key={item.title} delay={index%3*90}>
            <article className={styles.capabilityCard}>
              <div className={styles.cardIcon}>{item.icon}</div><small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.body}</p>
            </article>
          </Reveal>)}
        </div>
      </section>

      <section className={styles.journey}>
        <Reveal className={styles.journeyIntro}>
          <p className={styles.eyebrow}>A Clear Starting Point</p>
          <h2>New to trading? You do not need to figure everything out at once.</h2>
          <p>Begin by understanding market structure and risk. Add tools and signal context as your process matures. Use the journal to turn experience into evidence.</p>
          <Link href="/academy">Preview the learning journey <ArrowRight size={14}/></Link>
        </Reveal>
        <div className={styles.journeySteps}>
          {JOURNEY.map((step,index)=><Reveal key={step.num} delay={index*100}><article><span>{step.num}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></article></Reveal>)}
        </div>
      </section>

      <section className={styles.quantSection}>
        <Reveal className={styles.quantVisual}>
          <div className={styles.radarRing}><Radar size={52}/><span/><span/></div>
          <div className={styles.quantStatus}><i/>Signal lifecycle connected</div>
          <div className={styles.quantFlow}>
            {['EA signal','Telegram receiver','Website portal','Discord broadcast'].map((item,index)=><div key={item}><span>{String(index+1).padStart(2,'0')}</span>{item}</div>)}
          </div>
        </Reveal>
        <Reveal className={styles.quantCopy} delay={100}>
          <p className={styles.eyebrow}>Quant AI Signal Hub</p>
          <h2>See the setup, the risk, and what happened next.</h2>
          <p>The signal experience presents each trade in a consistent format: direction, entry zone, TP1–TP3, stop loss, active status, and confirmed outcome. It is built to improve clarity—not to replace your own risk decisions.</p>
          <ul>
            <li><ShieldCheck size={16}/> One active EA setup at a time</li>
            <li><Activity size={16}/> Fast member-portal refresh and new-signal alerts</li>
            <li><BarChart3 size={16}/> Signal history and outcome visibility</li>
          </ul>
          <Link href="/quant-ai" className={styles.goldButton}>Explore Quant AI <ArrowRight size={15}/></Link>
        </Reveal>
      </section>

      <section className={styles.ecosystem}>
        <Reveal className={styles.centerIntro}>
          <p className={styles.eyebrow}>Inside Elite Membership</p>
          <h2>Your complete trader workspace.</h2>
          <p>Every area supports a different part of the same cycle: prepare, learn, execute responsibly, document, and review.</p>
        </Reveal>
        <div className={styles.ecosystemGrid}>
          {ECOSYSTEM.map(([title,body,Icon],index)=><Reveal key={title} delay={index%3*80}><article><Icon size={20}/><div><h3>{title}</h3><p>{body}</p></div></article></Reveal>)}
        </div>
      </section>

      <section className={styles.audience}>
        <Reveal><p className={styles.eyebrow}>Who It Is Built For</p><h2>A professional home for traders who want structure.</h2></Reveal>
        <div>
          {[
            ['New Traders','Learn essential concepts in sequence instead of jumping between random strategies.'],
            ['Developing Traders','Combine analysis, risk planning, journaling, and review in a repeatable routine.'],
            ['Committed XAUUSD Traders','Access gold-focused education, tools, signal context, and an organized member ecosystem.'],
          ].map(([title,body],index)=><Reveal key={title} delay={index*90}><article><UsersRound size={20}/><h3>{title}</h3><p>{body}</p></article></Reveal>)}
        </div>
      </section>

      <section className={styles.closing}>
        <div className={styles.closingGlow}/>
        <Reveal>
          <Award size={28}/><p className={styles.eyebrow}>Start With Clarity</p>
          <h2>Build the trader before chasing the trade.</h2>
          <p>Create a free account, inspect the platform, and choose your access path when you understand what fits your goals.</p>
          <div className={styles.heroActions}>
            <Link href="/portal?tab=register" className={styles.goldButton}>Create Free Account <ArrowRight size={15}/></Link>
            <Link href="/portal/ib" className={styles.outlineButton}>Explore Elite Access</Link>
          </div>
          <small>Educational platform only. Trading carries substantial risk, and no outcome is guaranteed.</small>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <div><strong>MAHustler</strong><span>TRADES</span></div>
        <p>Trading education, market intelligence, and a connected workspace for disciplined development.</p>
        <nav aria-label="Footer navigation"><Link href="/academy">Academy</Link><Link href="/quant-ai">Quant AI</Link><Link href="/events">Events</Link><Link href="/portal">Member Portal</Link></nav>
        <small>© 2026 MAHustler Trades. Trading involves substantial risk of loss.</small>
      </footer>
    </main>
  );
}

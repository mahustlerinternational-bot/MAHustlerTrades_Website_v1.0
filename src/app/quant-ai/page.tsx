'use client';

import Link from 'next/link';
import {
  Activity, ArrowRight, Bot, BrainCircuit, Check, CircleDot, Database,
  Gauge, History, Radio, Radar, Send, ShieldAlert, ShieldCheck, Target,
  Webhook, Workflow,
} from 'lucide-react';
import PublicNav from '@/components/public/PublicNav';
import Reveal from '@/components/public/Reveal';
import {useQuantRealtime,useQuantStore} from '@/lib/hooks/useQuantRealtime';
import {formatSignalEntryZone,formatSignalPrice,signalDisplayLevels,signalOutcomeLabel} from '@/lib/quant/signalLevels';
import styles from './QuantAI.module.css';

const PIPELINE=[
  {icon:Bot,title:'EA creates the setup',body:'The connected Expert Advisor publishes a structured XAUUSD signal with direction, entry zone, targets, and invalidation.'},
  {icon:Webhook,title:'Telegram receiver validates it',body:'The website receiver accepts approved-channel messages, normalizes the content, and prevents duplicate processing.'},
  {icon:Database,title:'Signal lifecycle is stored',body:'TP1, TP2, TP3, stop-loss, breakeven, and entry-return outcomes attach to the correct one-at-a-time setup.'},
  {icon:Send,title:'Members receive the update',body:'The portal reflects the signal while configured Telegram and Discord destinations receive the broadcast flow.'},
];

const MEMBER_VALUE=[
  ['Consistent format','BUY or SELL, entry zone, TP1–TP3, and stop loss are displayed in the same readable structure.'],
  ['Lifecycle visibility','Members can distinguish an active setup from target progress, closure, cancellation, or a confirmed risk outcome.'],
  ['Context before action','Market regime, risk warnings, and system updates help members interpret the setup instead of following a number blindly.'],
  ['Permanent history','Past setups and outcomes remain available for review, accountability, and performance study.'],
];

export default function QuantAIPage(){
  useQuantRealtime();
  const {activeSignal,currentRegime,isConnected}=useQuantStore();
  const levels=activeSignal?signalDisplayLevels(activeSignal):null;

  return (
    <main className={styles.page}>
      <PublicNav active="quant"/>
      <section className={styles.hero}>
        <div className={styles.heroGrid}/><div className={styles.heroGlow}/>
        <Reveal className={styles.heroCopy}>
          <div className={styles.systemPill}><span className={isConnected?styles.liveDot:styles.offlineDot}/><span>MAHustler Quant Signal Hub · {isConnected?'Connected':'Checking feed'}</span></div>
          <p className={styles.eyebrow}>XAUUSD Signal Intelligence</p>
          <h1>Structured signals.<span>Visible risk. Confirmed outcomes.</span></h1>
          <p>The Quant AI experience connects the EA signal source, Telegram receiver, member portal, and optional Discord broadcast into one auditable trade-update lifecycle.</p>
          <div className={styles.heroActions}>
            <Link href="/portal/dashboard" className={styles.goldButton}>Open Member Signal Hub <ArrowRight size={15}/></Link>
            <a href="#how-it-works" className={styles.outlineButton}>See How It Works</a>
          </div>
          <div className={styles.metrics}>
            <div><strong>1s</strong><span>Portal refresh target</span></div>
            <div><strong>TP1–3</strong><span>Outcome progression</span></div>
            <div><strong>One</strong><span>Active EA setup</span></div>
          </div>
        </Reveal>

        <Reveal className={styles.liveConsole} delay={120}>
          <div className={styles.consoleHeader}><div><small>Live signal monitor</small><strong>{activeSignal?activeSignal.instrument:'System standby'}</strong></div><span className={isConnected?styles.connected:styles.checking}><i/>{isConnected?'Feed connected':'Connecting'}</span></div>
          {activeSignal&&levels?(
            <>
              <div className={styles.signalIdentity}><strong>{activeSignal.signal_type==='long'?'BUY':'SELL'} SIGNAL</strong><span>{signalOutcomeLabel(activeSignal)}</span></div>
              <div className={styles.levels}>
                <div><small>Entry zone</small><strong>{formatSignalEntryZone(activeSignal.instrument,levels.entryZone)}</strong></div>
                {levels.takeProfits.map((target,index)=><div key={index}><small>TP{index+1}</small><strong>{formatSignalPrice(activeSignal.instrument,target)}</strong></div>)}
                <div className={styles.stop}><small>Stop loss</small><strong>{formatSignalPrice(activeSignal.instrument,levels.stopLoss)}</strong></div>
              </div>
              <p className={styles.consoleNote}>{activeSignal.analysis_notes??'Follow the published risk parameters and use independent judgment.'}</p>
            </>
          ):(
            <div className={styles.standby}><Radar size={42}/><strong>No active setup right now</strong><p>The monitor remains connected and will display the next validated EA signal when it is published.</p></div>
          )}
          <div className={styles.consoleFooter}><span><ShieldCheck size={13}/>Duplicate protection</span><span><History size={13}/>Outcome history</span><span><Radio size={13}/>Multi-channel flow</span></div>
        </Reveal>
      </section>

      {currentRegime&&(
        <section className={styles.regime}>
          <Reveal className={styles.regimeInner}>
            <div className={styles.regimeHeading}><div><p className={styles.eyebrow}>Current Market Classification</p><h2>{currentRegime.active_regime}</h2></div><span>Quant feed</span></div>
            <div className={styles.regimeBars}>
              {[
                ['Accumulation',currentRegime.accumulation_pct,'#60a5fa'],
                ['Trending',currentRegime.trending_pct,'#34d399'],
                ['Distribution',currentRegime.distribution_pct,'#fb7185'],
                ['Ranging',currentRegime.ranging_pct,'#d4af37'],
              ].map(([label,value,color])=><div key={label as string}><p><span>{label as string}</span><strong style={{color:String(color)}}>{Number(value).toFixed(1)}%</strong></p><div><i style={{width:`${Math.min(100,Math.max(0,Number(value)))}%`,background:String(color)}}/></div></div>)}
            </div>
          </Reveal>
        </section>
      )}

      <section className={styles.explainer} id="how-it-works">
        <Reveal className={styles.sectionIntro}><p className={styles.eyebrow}>How The Connection Works</p><h2>One signal path. Four accountable stages.</h2><p>The website does not scrape random channel content. It accepts configured sources, normalizes known EA message formats, and records each event before broadcasting it.</p></Reveal>
        <div className={styles.pipeline}>
          {PIPELINE.map((item,index)=><Reveal key={item.title} delay={index*80}><article><span>{String(index+1).padStart(2,'0')}</span><item.icon size={22}/><h3>{item.title}</h3><p>{item.body}</p></article></Reveal>)}
        </div>
      </section>

      <section className={styles.architecture}>
        <Reveal className={styles.architectureVisual}>
          <div className={styles.core}><BrainCircuit size={33}/><strong>QUANT SIGNAL HUB</strong><span>Normalize · Match · Record</span></div>
          {[['EA',Bot],['TELEGRAM',Send],['PORTAL',Activity],['DISCORD',Radio]].map(([label,Icon],index)=><div key={label as string} className={styles[`node${index+1}`]}><Icon size={18}/><span>{label as string}</span></div>)}
        </Reveal>
        <Reveal className={styles.architectureCopy} delay={100}>
          <p className={styles.eyebrow}>Built For Clarity</p><h2>Automation supports the process. It does not remove responsibility.</h2>
          <p>Signals are educational market intelligence, not guaranteed trades or personal financial advice. Every member remains responsible for broker conditions, position size, account risk, and the decision to participate.</p>
          <ul><li><ShieldAlert size={16}/>Defined invalidation instead of open-ended exposure</li><li><Target size={16}/>Progressive target tracking instead of vague outcomes</li><li><Gauge size={16}/>Risk context instead of profit-only promotion</li></ul>
        </Reveal>
      </section>

      <section className={styles.value}>
        <Reveal className={styles.sectionIntro}><p className={styles.eyebrow}>The Member Experience</p><h2>Designed to answer the questions that matter.</h2></Reveal>
        <div className={styles.valueGrid}>{MEMBER_VALUE.map(([title,body],index)=><Reveal key={title} delay={index%2*80}><article><CircleDot size={17}/><div><h3>{title}</h3><p>{body}</p></div></article></Reveal>)}</div>
      </section>

      <section className={styles.safety}>
        <Reveal><ShieldCheck size={28}/><p className={styles.eyebrow}>Risk Comes First</p><h2>A signal is a scenario—not a promise.</h2><p>Use appropriate position sizing, verify prices with your broker, understand slippage, and never risk capital you cannot afford to lose.</p><div><span><Check size={13}/>Educational context</span><span><Check size={13}/>Defined risk levels</span><span><Check size={13}/>Transparent outcomes</span></div><Link href="/portal/packages" className={styles.goldButton}>Explore Member Access <ArrowRight size={14}/></Link></Reveal>
      </section>
    </main>
  );
}

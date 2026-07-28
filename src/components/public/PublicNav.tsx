'use client';

import Link from 'next/link';
import {Menu, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import styles from './PublicNav.module.css';

const LINKS = [
  ['Home','/'],
  ['Academy','/academy'],
  ['Quant AI','/quant-ai'],
  ['Events','/events'],
  ['Members','/portal/dashboard'],
] as const;

export default function PublicNav({active}:{active:'home'|'academy'|'quant'|'events'}){
  const [open,setOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{
    const onScroll=()=>setScrolled(window.scrollY>18);
    onScroll();
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);
  useEffect(()=>{
    if(!open)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[open]);
  const current=active==='home'?'/':active==='academy'?'/academy':active==='quant'?'/quant-ai':'/events';
  return (
    <nav className={`${styles.nav} ${scrolled?styles.scrolled:''}`} aria-label="Primary navigation">
      <Link href="/" className={styles.brand} aria-label="MAHustler Trades home">
        <strong>MAHustler</strong><span>TRADES</span>
      </Link>
      <div className={styles.desktopNav}>
        {LINKS.map(([label,href])=><Link key={href} href={href} className={href===current?styles.active:''}>{label}</Link>)}
      </div>
      <div className={styles.actions}>
        <Link href="/portal" className={styles.signIn}>Sign In</Link>
        <Link href="/portal?tab=register" className={styles.join}>Create Free Account</Link>
      </div>
      <button className={styles.menuButton} type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-controls="public-mobile-navigation" aria-label={open?'Close navigation':'Open navigation'}>
        {open?<X size={22}/>:<Menu size={22}/>}
      </button>
      {open&&(
        <div className={styles.mobileNav} id="public-mobile-navigation">
          {LINKS.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}
          <Link href="/portal" onClick={()=>setOpen(false)}>Member Sign In</Link>
          <Link href="/portal?tab=register" className={styles.mobileJoin} onClick={()=>setOpen(false)}>Create Free Account</Link>
        </div>
      )}
    </nav>
  );
}

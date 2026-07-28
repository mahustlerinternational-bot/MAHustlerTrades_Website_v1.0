'use client';

import {type CSSProperties, type ReactNode, useEffect, useRef, useState} from 'react';
import styles from './Reveal.module.css';

export default function Reveal({children,delay=0,className=''}:{children:ReactNode;delay?:number;className?:string}){
  const ref=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){setVisible(true);observer.disconnect();}
    },{threshold:.12,rootMargin:'0px 0px -35px'});
    observer.observe(ref.current);
    return()=>observer.disconnect();
  },[]);
  return <div ref={ref} className={`${styles.reveal} ${visible?styles.visible:''} ${className}`} style={{'--reveal-delay':`${delay}ms`} as CSSProperties}>{children}</div>;
}

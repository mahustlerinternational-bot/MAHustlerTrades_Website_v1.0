'use client';

import {useCallback,useEffect,useRef,useState,type ChangeEvent} from 'react';
import {Bot,FileText,Headphones,Loader2,MessageCircle,Paperclip,Send,X} from 'lucide-react';
import {toast} from 'sonner';
import {authFetch} from '@/lib/utils/authFetch';

type Attachment={name:string;type:string;size:number;url:string};
type Message={id:string;role:'user'|'assistant'|'admin'|'system';content:string;created_at:string;attachment:Attachment|null};
type ChatState={conversation_id:string;messages:Message[];ticket:{id:string;status:string}|null;assistant:{name:string;welcome:string;enabled:boolean}};

const MAX_FILE_SIZE=10*1024*1024;
const ACCEPTED_FILES='.jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx';

export default function AssistantWidget(){
  const [open,setOpen]=useState(false);
  const [data,setData]=useState<ChatState|null>(null);
  const [message,setMessage]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [sending,setSending]=useState(false);
  const [loadError,setLoadError]=useState('');
  const end=useRef<HTMLDivElement>(null);
  const fileInput=useRef<HTMLInputElement>(null);

  const load=useCallback(async()=>{
    try{
      const response=await authFetch('/api/assistant/chat');
      if(!response.ok)throw new Error('Unable to load the assistant');
      const result=normalizeChatState(await response.json());
      if(!result)throw new Error('The assistant returned an invalid response');
      setData(result);setLoadError('');
    }catch(error){setLoadError(error instanceof Error?error.message:'Unable to load the assistant');}
  },[]);

  useEffect(()=>{if(!open)return;void load();const timer=window.setInterval(()=>void load(),15000);return()=>window.clearInterval(timer);},[open,load]);
  useEffect(()=>{
    const node=end.current;if(!node)return;
    if(typeof node.scrollIntoView==='function'){node.scrollIntoView({behavior:'smooth',block:'end'});return;}
    const container=node.parentElement;if(!container)return;
    if(typeof container.scrollTo==='function')container.scrollTo({top:container.scrollHeight,behavior:'smooth'});else container.scrollTop=container.scrollHeight;
  },[data?.messages.length,open]);

  function chooseFile(event:ChangeEvent<HTMLInputElement>){
    const selected=event.target.files?.[0]??null;
    if(!selected)return;
    if(selected.size<=0||selected.size>MAX_FILE_SIZE){toast.error('The attachment must be 10 MB or smaller');event.target.value='';return;}
    setFile(selected);
  }

  function removeFile(){setFile(null);if(fileInput.current)fileInput.current.value='';}

  async function send(){
    const value=message.trim();if((!value&&!file)||sending)return;setSending(true);
    try{
      let response:Response;
      if(file){const form=new FormData();form.set('message',value);form.set('file',file);response=await authFetch('/api/assistant/chat',{method:'POST',body:form});}
      else response=await authFetch('/api/assistant/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value})});
      const result=await response.json().catch(()=>({error:'Message failed'}));if(!response.ok)throw new Error(result.error??'Message failed');
      setMessage('');removeFile();await load();
    }catch(error){toast.error(error instanceof Error?error.message:'Message failed');}
    finally{setSending(false);}
  }

  async function escalate(){
    if(!data)return;
    const response=await authFetch('/api/assistant/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversation_id:data.conversation_id,subject:message.trim()||'Member requested administrator assistance'})});
    if(response.ok){toast.success('Support ticket sent to the admin team');await load();}else toast.error((await response.json()).error??'Ticket failed');
  }

  return <>
    <button aria-label={open?'Close MAHustler Assistant':'Open MAHustler Assistant'} onClick={()=>setOpen(value=>!value)} style={{position:'fixed',right:'22px',bottom:'22px',zIndex:90,width:'54px',height:'54px',borderRadius:'50%',border:'1px solid rgba(212,175,55,.5)',background:'linear-gradient(135deg,#171000,#D4AF37)',color:'#050505',display:'grid',placeItems:'center',boxShadow:'0 12px 35px rgba(0,0,0,.5)',cursor:'pointer'}}>{open?<X size={21}/>:<MessageCircle size={22}/>}</button>
    {open&&<section aria-label="Member support chat" style={{position:'fixed',right:'22px',bottom:'86px',zIndex:89,width:'min(390px,calc(100vw - 28px))',height:'min(590px,calc(100vh - 120px))',background:'#0D0D0D',border:'1px solid rgba(212,175,55,.25)',boxShadow:'0 18px 60px rgba(0,0,0,.65)',display:'flex',flexDirection:'column'}}>
      <header style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,rgba(212,175,55,.1),transparent)'}}><div style={{display:'flex',gap:'10px',alignItems:'center'}}><Bot size={18} color="#D4AF37"/><div><strong style={{fontFamily:'Cinzel,serif',fontSize:'.76rem'}}>{data?.assistant.name??'MAHustler Assistant'}</strong><p style={{fontSize:'.56rem',color:'#34D399',marginTop:'2px'}}>● ONLINE · ADMIN SUPPORT</p></div></div><button aria-label="Close chat" onClick={()=>setOpen(false)} style={{background:'none',border:0,color:'#777',cursor:'pointer'}}><X size={17}/></button></header>
      <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}}>
        {!data&&!loadError&&<div style={{margin:'auto'}}><Loader2 size={22} color="#D4AF37" style={{animation:'chatSpin .8s linear infinite'}}/></div>}
        {!data&&loadError&&<div role="alert" style={{margin:'auto',textAlign:'center',color:'#FFB454',fontSize:'.68rem',lineHeight:1.6}}><p>{loadError}</p><button onClick={()=>void load()} style={{marginTop:'10px',border:'1px solid rgba(212,175,55,.35)',background:'transparent',color:'#D4AF37',padding:'7px 12px',cursor:'pointer'}}>Try again</button></div>}
        {data&&data.messages.length===0&&<Bubble role="assistant" content={data.assistant.welcome} attachment={null}/>} 
        {data?.messages.map(item=><Bubble key={item.id} role={item.role} content={item.content} attachment={item.attachment}/>)}<div ref={end}/>
      </div>
      <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
        {file&&<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px',marginBottom:'8px',background:'rgba(212,175,55,.07)',border:'1px solid rgba(212,175,55,.18)'}}><FileText size={15} color="#D4AF37"/><div style={{minWidth:0,flex:1}}><p style={{fontSize:'.62rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.name}</p><small style={{fontSize:'.52rem',color:'#666'}}>{formatSize(file.size)}</small></div><button aria-label="Remove attachment" onClick={removeFile} disabled={sending} style={{background:'none',border:0,color:'#777',cursor:'pointer'}}><X size={14}/></button></div>}
        <div style={{display:'flex',gap:'7px'}}><input ref={fileInput} type="file" accept={ACCEPTED_FILES} onChange={chooseFile} hidden/><button aria-label="Attach file" title="Attach file (maximum 10 MB)" onClick={()=>fileInput.current?.click()} disabled={sending} style={{width:'38px',border:'1px solid rgba(255,255,255,.1)',background:'#080808',color:file?'#D4AF37':'#777',cursor:'pointer'}}><Paperclip size={15}/></button><input value={message} onChange={event=>setMessage(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void send();}}} maxLength={2000} placeholder="Ask a question or attach a file…" style={{flex:1,minWidth:0,background:'#080808',border:'1px solid rgba(255,255,255,.1)',padding:'10px',color:'#fff',outline:'none',fontSize:'.72rem'}}/><button aria-label="Send message" onClick={()=>void send()} disabled={sending||(!message.trim()&&!file)} style={{width:'40px',border:0,background:'#D4AF37',color:'#000',cursor:'pointer',opacity:sending ? .6 : 1}}>{sending?<Loader2 size={16} style={{animation:'chatSpin .8s linear infinite'}}/>:<Send size={16}/>}</button></div>
        <button onClick={()=>void escalate()} disabled={Boolean(data?.ticket)} style={{marginTop:'8px',background:'none',border:0,color:data?.ticket?'#34D399':'#777',fontSize:'.61rem',cursor:data?.ticket?'default':'pointer',display:'flex',gap:'6px',alignItems:'center'}}><Headphones size={12}/>{data?.ticket?'Admin ticket is open':'Contact Admin / Open Support Ticket'}</button>
      </div><style>{`@keyframes chatSpin{to{transform:rotate(360deg)}}`}</style>
    </section>}
  </>;
}

function Bubble({role,content,attachment}:{role:Message['role'];content:string;attachment:Attachment|null}){
  const mine=role==='user',admin=role==='admin',system=role==='system';
  return <div style={{alignSelf:mine?'flex-end':'flex-start',maxWidth:'88%',background:mine?'rgba(212,175,55,.15)':system?'rgba(255,255,255,.03)':admin?'rgba(52,211,153,.09)':'#151515',border:`1px solid ${mine?'rgba(212,175,55,.25)':admin?'rgba(52,211,153,.25)':'rgba(255,255,255,.06)'}`,padding:'9px 11px',fontSize:'.7rem',lineHeight:1.55,color:system?'#777':'#D0D0D0'}}>{admin&&<strong style={{display:'block',color:'#34D399',fontSize:'.56rem',letterSpacing:'1px',marginBottom:'4px'}}>ADMIN</strong>}<span style={{whiteSpace:'pre-wrap'}}>{content}</span>{attachment&&<a href={attachment.url} target="_blank" rel="noreferrer" style={{marginTop:'8px',padding:'8px',display:'flex',alignItems:'center',gap:'7px',border:'1px solid rgba(212,175,55,.2)',background:'rgba(0,0,0,.2)',color:'#D4AF37',textDecoration:'none',minWidth:0}}><FileText size={15}/><span style={{minWidth:0}}><strong style={{display:'block',fontSize:'.6rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{attachment.name}</strong><small style={{color:'#777',fontSize:'.5rem'}}>{formatSize(attachment.size)} · Open file</small></span></a>}</div>;
}

function formatSize(bytes:number){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}

function normalizeChatState(value:unknown):ChatState|null{
  if(!value||typeof value!=='object')return null;const raw=value as Record<string,unknown>;
  const assistantRaw=raw.assistant&&typeof raw.assistant==='object'?raw.assistant as Record<string,unknown>:{};
  const messages:Array<Message>=Array.isArray(raw.messages)?raw.messages.flatMap(item=>{
    if(!item||typeof item!=='object')return [];const row=item as Record<string,unknown>;const role=row.role;
    if(typeof row.id!=='string'||typeof row.content!=='string'||!['user','assistant','admin','system'].includes(String(role)))return [];
    const a=row.attachment&&typeof row.attachment==='object'?row.attachment as Record<string,unknown>:null;
    const attachment:Attachment|null=a&&typeof a.name==='string'&&typeof a.type==='string'&&typeof a.size==='number'&&typeof a.url==='string'?{name:a.name,type:a.type,size:a.size,url:a.url}:null;
    return [{id:row.id,role:role as Message['role'],content:row.content,created_at:typeof row.created_at==='string'?row.created_at:'',attachment}];
  }):[];
  if(typeof raw.conversation_id!=='string')return null;
  return {conversation_id:raw.conversation_id,messages,ticket:raw.ticket&&typeof raw.ticket==='object'?raw.ticket as ChatState['ticket']:null,assistant:{name:typeof assistantRaw.name==='string'?assistantRaw.name:'MAHustler Assistant',welcome:typeof assistantRaw.welcome==='string'?assistantRaw.welcome:'Welcome. How can I help you today?',enabled:assistantRaw.enabled!==false}};
}

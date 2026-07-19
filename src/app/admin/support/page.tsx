'use client';

import {useCallback,useEffect,useRef,useState,type ChangeEvent} from 'react';
import {FileText,Paperclip,X} from 'lucide-react';
import {format} from 'date-fns';
import {toast} from 'sonner';
import {authFetch} from '@/lib/utils/authFetch';

type Attachment={name:string;type:string;size:number;url:string};
type Conversation={id:string;status:string;last_message_at:string;profile?:{full_name:string|null};tickets:Array<{id:string;status:string;priority:string;subject:string}>};
type Detail={conversation:Conversation;messages:Array<{id:string;role:string;content:string;created_at:string;attachment:Attachment|null}>;tickets:Conversation['tickets']};
const ACCEPTED_FILES='.jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx';

export default function AdminSupportPage(){
  const [items,setItems]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [reply,setReply]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [sending,setSending]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);

  const load=useCallback(async()=>{const response=await authFetch('/api/admin/support');if(response.ok)setItems(await response.json());},[]);
  const open=useCallback(async(id:string)=>{setSelected(id);const response=await authFetch(`/api/admin/support?conversation_id=${id}`);if(response.ok)setDetail(await response.json());},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!selected)return;const timer=window.setInterval(()=>void open(selected),15000);return()=>window.clearInterval(timer);},[selected,open]);

  function chooseFile(event:ChangeEvent<HTMLInputElement>){
    const selectedFile=event.target.files?.[0]??null;if(!selectedFile)return;
    if(selectedFile.size<=0||selectedFile.size>10*1024*1024){toast.error('The attachment must be 10 MB or smaller');event.target.value='';return;}
    setFile(selectedFile);
  }
  function removeFile(){setFile(null);if(fileInput.current)fileInput.current.value='';}

  async function send(){
    if(!selected||(!reply.trim()&&!file)||sending)return;setSending(true);
    try{
      let response:Response;
      if(file){const form=new FormData();form.set('conversation_id',selected);form.set('content',reply.trim());form.set('file',file);response=await authFetch('/api/admin/support',{method:'POST',body:form});}
      else response=await authFetch('/api/admin/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversation_id:selected,content:reply})});
      const result=await response.json().catch(()=>({error:'Reply failed'}));if(!response.ok)throw new Error(result.error??'Reply failed');
      setReply('');removeFile();await open(selected);await load();toast.success('Reply sent');
    }catch(error){toast.error(error instanceof Error?error.message:'Reply failed');}
    finally{setSending(false);}
  }

  async function ticket(ticketId:string,status:string){const response=await authFetch('/api/admin/support',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket_id:ticketId,status})});if(response.ok){await open(selected!);await load();}else toast.error((await response.json()).error);}

  return <div style={{padding:'2.5rem',minHeight:'100vh',background:'#0A0A0A',color:'#fff',fontFamily:'Montserrat,sans-serif'}}><p style={{fontSize:'.58rem',letterSpacing:'5px',color:'#D4AF37',textTransform:'uppercase'}}>Member Care</p><h1 style={{fontFamily:'Cinzel,serif',fontSize:'2rem',margin:'8px 0 24px'}}>AI Support Inbox</h1><div style={{display:'grid',gridTemplateColumns:'330px minmax(0,1fr)',minHeight:'620px',border:'1px solid rgba(255,255,255,.07)'}}>
    <aside style={{borderRight:'1px solid rgba(255,255,255,.07)',overflowY:'auto'}}>{items.length===0&&<p style={{padding:'2rem',color:'#555',fontSize:'.75rem'}}>No conversations yet.</p>}{items.map(item=>{const active=item.id===selected,openTicket=item.tickets?.find(ticketItem=>['open','in_progress'].includes(ticketItem.status));return <button key={item.id} onClick={()=>void open(item.id)} style={{width:'100%',textAlign:'left',padding:'14px',background:active?'rgba(212,175,55,.08)':'none',border:0,borderBottom:'1px solid rgba(255,255,255,.05)',color:'#fff',cursor:'pointer'}}><strong style={{fontSize:'.76rem'}}>{item.profile?.full_name??'Member'}</strong><p style={{fontSize:'.61rem',color:openTicket?'#F59E0B':'#666',marginTop:'5px'}}>{openTicket?`● ${openTicket.subject}`:item.status}</p><p style={{fontSize:'.56rem',color:'#444',marginTop:'4px'}}>{format(new Date(item.last_message_at),'dd MMM · HH:mm')}</p></button>})}</aside>
    <section style={{display:'flex',flexDirection:'column',minWidth:0}}>{!detail?<p style={{margin:'auto',color:'#555'}}>Select a conversation</p>:<><div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between'}}><strong>{detail.conversation.profile?.full_name??'Member'}</strong>{detail.tickets?.[0]&&<select value={detail.tickets[0].status} onChange={event=>void ticket(detail.tickets[0].id,event.target.value)} style={{background:'#111',color:'#D4AF37',border:'1px solid rgba(212,175,55,.25)',padding:'5px'}}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>}</div>
      <div style={{flex:1,overflowY:'auto',padding:'18px',display:'flex',flexDirection:'column',gap:'9px'}}>{detail.messages.map(message=><div key={message.id} style={{alignSelf:message.role==='user'?'flex-start':'flex-end',maxWidth:'80%',background:message.role==='admin'?'rgba(52,211,153,.08)':message.role==='assistant'?'#151515':message.role==='system'?'rgba(255,255,255,.03)':'rgba(212,175,55,.1)',border:'1px solid rgba(255,255,255,.07)',padding:'9px 11px',fontSize:'.71rem',lineHeight:1.5}}><small style={{display:'block',color:'#666',textTransform:'uppercase',marginBottom:'4px'}}>{message.role}</small><span style={{whiteSpace:'pre-wrap'}}>{message.content}</span>{message.attachment&&<AttachmentLink attachment={message.attachment}/>}</div>)}</div>
      <div style={{padding:'12px',borderTop:'1px solid rgba(255,255,255,.06)'}}>{file&&<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px',marginBottom:'8px',background:'rgba(212,175,55,.07)',border:'1px solid rgba(212,175,55,.18)'}}><FileText size={15} color="#D4AF37"/><span style={{minWidth:0,flex:1,fontSize:'.65rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.name} · {formatSize(file.size)}</span><button aria-label="Remove attachment" onClick={removeFile} style={{background:'none',border:0,color:'#777',cursor:'pointer'}}><X size={14}/></button></div>}<div style={{display:'flex',gap:'8px'}}><input ref={fileInput} type="file" accept={ACCEPTED_FILES} onChange={chooseFile} hidden/><button aria-label="Attach file" title="Attach file (maximum 10 MB)" onClick={()=>fileInput.current?.click()} disabled={sending} style={{width:'42px',background:'#080808',border:'1px solid rgba(255,255,255,.1)',color:file?'#D4AF37':'#777',cursor:'pointer'}}><Paperclip size={16}/></button><input value={reply} onChange={event=>setReply(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void send();}}} placeholder="Reply or attach a file…" style={{flex:1,minWidth:0,background:'#080808',border:'1px solid rgba(255,255,255,.1)',padding:'11px',color:'#fff'}}/><button onClick={()=>void send()} disabled={sending||(!reply.trim()&&!file)} style={{background:'#D4AF37',border:0,padding:'0 20px',fontWeight:700,cursor:'pointer',opacity:sending ? .6 : 1}}>{sending?'Sending…':'Send'}</button></div></div></>}</section>
  </div></div>;
}

function AttachmentLink({attachment}:{attachment:Attachment}){return <a href={attachment.url} target="_blank" rel="noreferrer" style={{marginTop:'8px',padding:'8px',display:'flex',alignItems:'center',gap:'7px',border:'1px solid rgba(212,175,55,.2)',background:'rgba(0,0,0,.2)',color:'#D4AF37',textDecoration:'none'}}><FileText size={15}/><span><strong style={{display:'block',fontSize:'.62rem'}}>{attachment.name}</strong><small style={{color:'#777',fontSize:'.52rem'}}>{formatSize(attachment.size)} · Open file</small></span></a>;}
function formatSize(bytes:number){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}

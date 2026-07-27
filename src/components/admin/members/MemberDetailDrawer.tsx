'use client';

import {useEffect,useState,type CSSProperties,type MouseEvent as ReactMouseEvent,type ReactNode} from 'react';
import {BookOpen,Calendar,Check,Loader2,Network,Trash2,UserCog,X} from 'lucide-react';
import {toast} from 'sonner';
import type {Enrollment,EventRegistration,IbRegistration,Package,Profile} from '@/types';
import {authFetch} from '@/lib/utils/authFetch';

interface MemberDetail{
  profile:Profile&{package?:Package};
  enrollments:(Enrollment&{course?:{title:string;price:number}})[];
  eventRegs:(EventRegistration&{event?:{title:string;event_date:string}})[];
  ibReg:IbRegistration|null;
  account:{email:string|null;phone:string|null;email_confirmed_at:string|null;last_sign_in_at:string|null}|null;
}

interface Props{memberId:string;onClose:()=>void;onUpdated:()=>void;}
const ROLES=['member','ib_member','admin'] as const;
const ROLE_COLOR:Record<string,string>={admin:'#C4B5FD',member:'#D4AF37',ib_member:'#60A5FA'};

export default function MemberDetailModal({memberId,onClose,onUpdated}:Props){
  const [data,setData]=useState<MemberDetail|null>(null);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState<string|null>(null);
  const [saving,setSaving]=useState<string|null>(null);
  const [packages,setPackages]=useState<Package[]>([]);
  const [courseId,setCourseId]=useState('');
  const [courses,setCourses]=useState<{id:string;title:string}[]>([]);
  const [ibNotes,setIbNotes]=useState('');

  useEffect(()=>{
    let active=true;setLoading(true);setLoadError(null);setData(null);
    Promise.all([authFetch(`/api/admin/members/${memberId}`),authFetch('/api/admin/courses?limit=100'),fetch('/api/packages')])
      .then(async([detailResponse,coursesResponse,packagesResponse])=>{
        const [detail,courseResult,packageResult]=await Promise.all([detailResponse.json().catch(()=>null),coursesResponse.json().catch(()=>null),packagesResponse.json().catch(()=>null)]);
        if(!detailResponse.ok)throw new Error(detail?.error??'Unable to load member details');
        if(!coursesResponse.ok)throw new Error(courseResult?.error??'Unable to load courses');
        if(!packagesResponse.ok)throw new Error(packageResult?.error??'Unable to load packages');
        if(!detail?.profile)throw new Error('Member profile was not found');
        if(!active)return;
        setData(detail);setCourses(Array.isArray(courseResult?.data)?courseResult.data:[]);setPackages(Array.isArray(packageResult)?packageResult:Array.isArray(packageResult?.data)?packageResult.data:[]);setIbNotes(detail.ibReg?.admin_notes??'');
      })
      .catch(error=>{if(active)setLoadError(error instanceof Error?error.message:'Unable to load member details');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[memberId]);

  useEffect(()=>{
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',closeOnEscape);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',closeOnEscape);};
  },[onClose]);

  async function refreshDetail(){
    const response=await authFetch(`/api/admin/members/${memberId}`);const result=await response.json().catch(()=>null);
    if(!response.ok||!result?.profile)throw new Error(result?.error??'Unable to refresh member details');
    setData(result);setIbNotes(result.ibReg?.admin_notes??'');
  }

  async function patch(action:string,extra:Record<string,unknown>={}){
    setSaving(action);
    try{
      const response=await authFetch(`/api/admin/members/${memberId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});
      const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error??'Update failed');
      await refreshDetail();if(action==='grant_course')setCourseId('');onUpdated();
      if(action==='review_ib'&&extra.status==='approved'&&result?.email?.status!=='sent'){
        toast.warning(`Elite access approved, but email needs attention: ${result?.email?.message??'delivery status unavailable'}`);
      }else if(action==='review_ib'&&extra.status==='approved'){
        toast.success('Elite access approved and notification email sent');
      }else{
        toast.success('Member updated');
      }
    }catch(error){toast.error(error instanceof Error?error.message:'Update failed');}
    finally{setSaving(null);}
  }

  async function updateField(field:string,value:unknown){
    setSaving(field);
    try{
      const response=await authFetch(`/api/admin/members/${memberId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({[field]:value})});
      const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error??'Update failed');
      await refreshDetail();onUpdated();toast.success('Member updated');
    }catch(error){toast.error(error instanceof Error?error.message:'Update failed');}
    finally{setSaving(null);}
  }

  function backdrop(event:ReactMouseEvent<HTMLDivElement>){if(event.target===event.currentTarget)onClose();}

  if(loading)return <ModalFrame label="Loading member details" onClose={onClose} onBackdrop={backdrop}><div style={centerState}><Loader2 size={26} color="#D4AF37" style={{animation:'memberModalSpin .8s linear infinite'}}/><p style={{fontSize:'.75rem',color:'#666'}}>Loading member details…</p></div></ModalFrame>;
  if(loadError||!data)return <ModalFrame label="Member details error" onClose={onClose} onBackdrop={backdrop}><div style={centerState}><p style={{fontSize:'.85rem',color:'#FF7B86'}}>{loadError??'Member details are unavailable.'}</p><div style={{display:'flex',gap:'10px'}}><button onClick={onClose} style={secondaryButton}>Close</button><button onClick={()=>window.location.reload()} style={goldOutlineButton}>Refresh session</button></div></div></ModalFrame>;

  const {profile,enrollments,eventRegs,ibReg,account}=data;
  return <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="member-details-title" onMouseDown={backdrop}>
    <div style={modal} onMouseDown={event=>event.stopPropagation()}>
      <header style={header}>
        <div style={{display:'flex',alignItems:'center',gap:'13px',minWidth:0}}>
          <div style={avatar}>{profile.full_name?.charAt(0)?.toUpperCase()??'?'}</div>
          <div style={{minWidth:0}}><h2 id="member-details-title" style={{fontFamily:'Cinzel,serif',fontSize:'1rem',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{profile.full_name??'Unknown Member'}</h2><p style={{fontSize:'.58rem',letterSpacing:'2px',textTransform:'uppercase',color:ROLE_COLOR[profile.role]??'#888',marginTop:'3px'}}>{profile.role.replace('_',' ')}</p></div>
        </div>
        <button type="button" aria-label="Close member details" onClick={onClose} style={closeButton}><X size={18}/></button>
      </header>

      <div style={body}>
        <Section icon={<UserCog size={15}/>} title="Access & Role">
          <div style={twoColumn}>
            <Field label="Role"><select value={profile.role} onChange={event=>void updateField('role',event.target.value)} disabled={saving==='role'} style={inputStyle}>{ROLES.map(role=><option key={role} value={role}>{role.replace('_',' ')}</option>)}</select></Field>
            <Field label="Package"><select value={profile.package_id??''} onChange={event=>void updateField('package_id',event.target.value||null)} disabled={saving==='package_id'} style={inputStyle}><option value="">No Package</option>{packages.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          </div>
        </Section>

        <Section icon={<BookOpen size={15}/>} title={`Enrolled Courses (${enrollments.length})`}>
          {enrollments.length>0&&<div style={{display:'grid',gap:'7px',marginBottom:'10px'}}>{enrollments.map(enrollment=><div key={enrollment.id} style={listRow}><div><p style={listTitle}>{enrollment.course?.title??'Untitled course'}</p><p style={listMeta}>{enrollment.payment_method.replace('_',' ')} · ${Number(enrollment.amount_paid??0).toFixed(2)}</p></div><button aria-label="Revoke course access" title="Revoke enrollment" onClick={()=>void patch('revoke_enrollment',{enrollment_id:enrollment.id})} disabled={saving==='revoke_enrollment'} style={iconButton}>{saving==='revoke_enrollment'?<Loader2 size={13}/>:<Trash2 size={13}/>}</button></div>)}</div>}
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}><select value={courseId} onChange={event=>setCourseId(event.target.value)} style={{...inputStyle,flex:'1 1 280px'}}><option value="">Select course to grant…</option>{courses.filter(course=>!enrollments.some(enrollment=>enrollment.course_id===course.id)).map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select><button onClick={()=>courseId&&void patch('grant_course',{course_id:courseId})} disabled={!courseId||saving==='grant_course'} style={{...goldButton,opacity:!courseId||saving==='grant_course' ? .45 : 1}}>{saving==='grant_course'?<Loader2 size={13}/>:<Check size={13}/>} Grant</button></div>
        </Section>

        {eventRegs.length>0&&<Section icon={<Calendar size={15}/>} title={`Event Registrations (${eventRegs.length})`}><div style={{display:'grid',gap:'7px'}}>{eventRegs.map(registration=><div key={registration.id} style={listRow}><div><p style={listTitle}>{registration.event?.title??'Untitled event'}</p><p style={listMeta}>{registration.ticket_type} ticket</p></div><span style={{fontSize:'.58rem',letterSpacing:'1px',textTransform:'uppercase',color:registration.status==='confirmed'?'#34D399':'#888'}}>{registration.status}</span></div>)}</div></Section>}

        {ibReg&&<Section icon={<Network size={15}/>} title="IB Registration">
          <div style={{...panel,marginBottom:'10px'}}><Row label="Broker" value={ibReg.broker_name}/><Row label="Account" value={ibReg.account_number}/><Row label="Status" value={ibReg.status} color={ibReg.status==='approved'?'#34D399':ibReg.status==='pending'?'#F59E0B':'#FF6B78'}/><Row label="Submitted" value={new Date(ibReg.submitted_at).toLocaleDateString()}/></div>
          {ibReg.status==='pending'&&<><Field label="Admin Notes"><textarea value={ibNotes} onChange={event=>setIbNotes(event.target.value)} rows={3} placeholder="Optional review notes…" style={{...inputStyle,resize:'vertical'}}/></Field><div style={{display:'flex',gap:'8px',marginTop:'9px'}}><button onClick={()=>void patch('review_ib',{status:'approved',admin_notes:ibNotes})} disabled={Boolean(saving)} style={{...approveButton,opacity:saving ? .5 : 1}}>{saving==='review_ib'?<Loader2 size={13}/>:<Check size={13}/>} Approve</button><button onClick={()=>void patch('review_ib',{status:'rejected',admin_notes:ibNotes})} disabled={Boolean(saving)} style={{...rejectButton,opacity:saving ? .5 : 1}}><X size={13}/> Reject</button></div></>}
        </Section>}

        <Section icon={<UserCog size={15}/>} title="Account Information"><div style={panel}><Row label="Email" value={account?.email??'—'}/>{account?.phone&&<Row label="Phone" value={account.phone}/>}<Row label="Member ID" value={profile.member_code}/><Row label="IB Status" value={profile.ib_status} color={profile.ib_status==='active'?'#34D399':undefined}/><Row label="Created" value={new Date(profile.created_at).toLocaleDateString()}/>{account?.last_sign_in_at&&<Row label="Last Sign In" value={new Date(account.last_sign_in_at).toLocaleString()}/>}<Row label="Email Verified" value={account?.email_confirmed_at?'Yes':'No'} color={account?.email_confirmed_at?'#34D399':'#F59E0B'}/></div></Section>
      </div>

      <footer style={footer}><button type="button" onClick={onClose} style={secondaryButton}>Close</button></footer>
      <style>{`@keyframes memberModalSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  </div>;
}

function ModalFrame({label,onClose,onBackdrop,children}:{label:string;onClose:()=>void;onBackdrop:(event:ReactMouseEvent<HTMLDivElement>)=>void;children:ReactNode}){return <div style={overlay} role="dialog" aria-modal="true" aria-label={label} onMouseDown={onBackdrop}><div style={{...modal,minHeight:'330px'}} onMouseDown={event=>event.stopPropagation()}><button aria-label="Close" onClick={onClose} style={{...closeButton,position:'absolute',right:'18px',top:'18px'}}><X size={18}/></button>{children}<style>{`@keyframes memberModalSpin{to{transform:rotate(360deg)}}`}</style></div></div>;}
function Section({icon,title,children}:{icon:ReactNode;title:string;children:ReactNode}){return <section><div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px',color:'#D4AF37'}}>{icon}<h3 style={{fontFamily:'Cinzel,serif',fontSize:'.7rem',letterSpacing:'.6px',color:'#fff'}}>{title}</h3></div>{children}</section>;}
function Field({label,children}:{label:string;children:ReactNode}){return <label style={{display:'block'}}><span style={{display:'block',fontSize:'.55rem',letterSpacing:'2px',textTransform:'uppercase',color:'#555',marginBottom:'6px'}}>{label}</span>{children}</label>;}
function Row({label,value,color}:{label:string;value:string;color?:string}){return <div style={{display:'grid',gridTemplateColumns:'120px minmax(0,1fr)',gap:'12px',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'start'}}><span style={{fontSize:'.63rem',color:'#555'}}>{label}</span><span style={{fontSize:'.65rem',fontFamily:'JetBrains Mono,monospace',color:color??'#999',textAlign:'right',overflowWrap:'anywhere'}}>{value}</span></div>;}

const overlay:CSSProperties={position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.84)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'};
const modal:CSSProperties={position:'relative',width:'min(780px,calc(100vw - 32px))',maxHeight:'92vh',background:'#0D0D0D',border:'1px solid rgba(212,175,55,.22)',boxShadow:'0 28px 90px rgba(0,0,0,.75)',display:'flex',flexDirection:'column',overflow:'hidden',color:'#fff',fontFamily:'Montserrat,sans-serif'};
const header:CSSProperties={display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(90deg,rgba(212,175,55,.08),transparent)',flexShrink:0};
const body:CSSProperties={padding:'20px 22px',overflowY:'auto',display:'grid',gap:'24px'};
const footer:CSSProperties={padding:'12px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'flex-end',flexShrink:0};
const avatar:CSSProperties={width:'42px',height:'42px',borderRadius:'50%',background:'linear-gradient(135deg,#1A1000,#B8860B)',display:'grid',placeItems:'center',fontFamily:'Cinzel,serif',fontSize:'.85rem',fontWeight:700,color:'#D4AF37',flexShrink:0};
const closeButton:CSSProperties={width:'32px',height:'32px',display:'grid',placeItems:'center',background:'transparent',border:'1px solid rgba(255,255,255,.07)',color:'#777',cursor:'pointer'};
const centerState:CSSProperties={minHeight:'330px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'14px',textAlign:'center',padding:'40px'};
const twoColumn:CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'12px'};
const inputStyle:CSSProperties={width:'100%',boxSizing:'border-box',background:'#080808',border:'1px solid rgba(255,255,255,.1)',color:'#fff',fontSize:'.72rem',padding:'10px 11px',outline:'none',fontFamily:'inherit'};
const panel:CSSProperties={background:'#111',border:'1px solid rgba(255,255,255,.06)',padding:'10px 13px'};
const listRow:CSSProperties={display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',background:'#111',border:'1px solid rgba(255,255,255,.06)',padding:'9px 11px'};
const listTitle:CSSProperties={fontSize:'.7rem',color:'#fff'};
const listMeta:CSSProperties={fontSize:'.58rem',color:'#555',textTransform:'capitalize',marginTop:'3px'};
const iconButton:CSSProperties={width:'28px',height:'28px',display:'grid',placeItems:'center',background:'transparent',border:'1px solid rgba(255,255,255,.06)',color:'#FF6B78',cursor:'pointer'};
const goldButton:CSSProperties={display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'9px 15px',background:'rgba(212,175,55,.12)',border:'1px solid rgba(212,175,55,.28)',color:'#D4AF37',fontSize:'.67rem',fontWeight:700,cursor:'pointer'};
const approveButton:CSSProperties={...goldButton,flex:1,background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',color:'#34D399'};
const rejectButton:CSSProperties={...goldButton,flex:1,background:'rgba(255,71,87,.08)',border:'1px solid rgba(255,71,87,.22)',color:'#FF6B78'};
const secondaryButton:CSSProperties={padding:'9px 18px',background:'transparent',border:'1px solid rgba(255,255,255,.1)',color:'#AAA',fontSize:'.68rem',cursor:'pointer',fontFamily:'inherit'};
const goldOutlineButton:CSSProperties={...secondaryButton,border:'1px solid rgba(212,175,55,.3)',color:'#D4AF37'};

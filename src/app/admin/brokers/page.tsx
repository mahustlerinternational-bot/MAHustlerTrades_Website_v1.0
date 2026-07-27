'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {Film, Link2, Loader2, PlayCircle, Trash2, Upload} from 'lucide-react';
import { authFetch } from '@/lib/utils/authFetch';
import type { BrokerRecord } from '@/lib/ib/brokerTypes';
import {supabase} from '@/lib/supabase/client';

const EMPTY = {
  name: '',
  referral_link: '',
  min_deposit: 500,
  sort_order: 0,
  is_active: true,
  tutorial_video_url: '',
  tutorial_video_storage_path: '',
};

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<BrokerRecord[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tutorialPreview, setTutorialPreview] = useState<string | null>(null);
  const [pendingUploadPath, setPendingUploadPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/admin/brokers');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to load brokers');
      setBrokers(Array.isArray(data) ? data : []);
    } catch (error) { toast.error(String(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await authFetch('/api/admin/brokers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error ?? 'Save failed'); return; }
      toast.success(editingId ? 'Broker updated' : 'Broker added');
      setPendingUploadPath(null);
      setTutorialPreview(null);
      setEditingId(null); setForm(EMPTY); await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Broker could not be saved');
    } finally { setSaving(false); }
  }

  function edit(broker: BrokerRecord) {
    setEditingId(broker.id);
    setPendingUploadPath(null);
    setTutorialPreview(broker.tutorial_playback_url ?? broker.tutorial_video_url ?? null);
    setForm({
      name: broker.name,
      referral_link: broker.referral_link,
      min_deposit: broker.min_deposit,
      sort_order: broker.sort_order,
      is_active: broker.is_active,
      tutorial_video_url: broker.tutorial_video_url ?? '',
      tutorial_video_storage_path: broker.tutorial_video_storage_path ?? '',
    });
  }

  async function discardPendingUpload(path = pendingUploadPath) {
    if (!path) return;
    await authFetch(`/api/admin/brokers/tutorial-upload?path=${encodeURIComponent(path)}`, {method:'DELETE'}).catch(() => {});
    if (path === pendingUploadPath) setPendingUploadPath(null);
  }

  async function cancelEdit() {
    await discardPendingUpload();
    setEditingId(null);
    setTutorialPreview(null);
    setForm(EMPTY);
  }

  async function uploadTutorial(file: File) {
    if (!editingId) {
      toast.error('Save the broker first, then edit it to upload a tutorial video.');
      return;
    }
    if (!['video/mp4','video/webm','video/ogg','video/quicktime'].includes(file.type)) {
      toast.error('Use an MP4, WebM, OGG, or MOV video file.');
      return;
    }
    if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
      toast.error('Direct video uploads must be 50 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      if (pendingUploadPath) await discardPendingUpload(pendingUploadPath);
      const response = await authFetch('/api/admin/brokers/tutorial-upload', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({file_name:file.name,content_type:file.type,size:file.size}),
      });
      const prepared = await response.json();
      if (!response.ok) throw new Error(prepared.error ?? 'Could not prepare tutorial upload');
      const uploaded = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {contentType:file.type,upsert:false});
      if (uploaded.error) throw uploaded.error;
      setPendingUploadPath(prepared.path);
      setForm(current => ({
        ...current,
        tutorial_video_url:'',
        tutorial_video_storage_path:prepared.path,
      }));
      setTutorialPreview(URL.createObjectURL(file));
      toast.success('Tutorial uploaded. Save the broker to publish it.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tutorial upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function setExternalTutorial(value:string) {
    if (pendingUploadPath) await discardPendingUpload();
    setForm(current => ({
      ...current,
      tutorial_video_url:value,
      tutorial_video_storage_path:value.trim() ? '' : current.tutorial_video_storage_path,
    }));
    setTutorialPreview(value.trim() || null);
  }

  async function clearTutorial() {
    if (pendingUploadPath) await discardPendingUpload();
    setForm(current => ({...current,tutorial_video_url:'',tutorial_video_storage_path:''}));
    setTutorialPreview(null);
  }

  async function remove(broker: BrokerRecord) {
    if (!confirm(`Delete broker "${broker.name}"? Existing applications will keep the broker name.`)) return;
    const response = await authFetch(`/api/admin/brokers?id=${encodeURIComponent(broker.id)}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error ?? 'Delete failed');
    toast.success('Broker deleted'); await load();
  }

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', color:'#fff', fontFamily:'Montserrat,sans-serif' }}>
      <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>IB Programme</p>
      <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Approved Brokers</h1>
      <p style={{ color:'#666', fontSize:'.75rem', marginTop:'6px', marginBottom:'2rem' }}>Members can select any active broker from the IB registration dropdown.</p>

      <form onSubmit={submit} style={{ background:'#111', border:'1px solid rgba(212,175,55,.2)', padding:'1.5rem', maxWidth:'1120px', marginBottom:'1.5rem' }}>
        <p style={{ fontFamily:'Cinzel,serif', color:'#D4AF37', fontSize:'.75rem', marginBottom:'1rem' }}>{editingId ? 'Edit Broker' : 'Add Broker'}</p>
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 2fr .7fr .5fr', gap:'12px' }}>
          <Field label="Broker Name"><input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inputStyle}/></Field>
          <Field label="Referral Link"><input required type="url" value={form.referral_link} onChange={e=>setForm(f=>({...f,referral_link:e.target.value}))} placeholder="https://..." style={inputStyle}/></Field>
          <Field label="Min. Deposit"><input type="number" min="0" value={form.min_deposit} onChange={e=>setForm(f=>({...f,min_deposit:Number(e.target.value)}))} style={inputStyle}/></Field>
          <Field label="Order"><input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:Number(e.target.value)}))} style={inputStyle}/></Field>
        </div>
        <section style={tutorialEditor}>
          <div style={tutorialEditorHeader}>
            <div>
              <p style={{fontFamily:'Cinzel,serif',fontSize:'.7rem',color:'#D4AF37'}}>Broker Registration Tutorial</p>
              <p style={{fontSize:'.58rem',color:'#666',marginTop:'4px'}}>Assign one tutorial per broker. Members see it immediately after choosing this broker.</p>
            </div>
            {(form.tutorial_video_url || form.tutorial_video_storage_path) && (
              <button type="button" onClick={() => void clearTutorial()} style={{...secondaryButton,color:'#FF6B78'}}><Trash2 size={12}/> Remove</button>
            )}
          </div>
          <div className="broker-tutorial-editor-grid" style={tutorialEditorGrid}>
            <AdminTutorialPreview
              brokerName={form.name || 'Selected broker'}
              playbackUrl={tutorialPreview}
              uploading={uploading}
            />
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <Field label="External Video Link">
                <div style={{position:'relative'}}>
                  <Link2 size={13} style={{position:'absolute',left:10,top:12,color:'#666'}}/>
                  <input
                    type="url"
                    value={form.tutorial_video_url}
                    onChange={event => void setExternalTutorial(event.target.value)}
                    placeholder="YouTube, Vimeo, or direct HTTPS video URL"
                    style={{...inputStyle,paddingLeft:'32px'}}
                  />
                </div>
              </Field>
              <div style={orRow}><span style={orLine}/>OR<span style={orLine}/></div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                hidden
                onChange={event => {
                  const file=event.target.files?.[0];
                  if(file)void uploadTutorial(file);
                }}
              />
              <button
                type="button"
                disabled={!editingId || uploading}
                onClick={() => fileInputRef.current?.click()}
                style={{...uploadButton,opacity:!editingId||uploading ? .55 : 1,cursor:!editingId||uploading?'not-allowed':'pointer'}}
              >
                {uploading?<Loader2 size={14} style={{animation:'brokerSpin .8s linear infinite'}}/>:<Upload size={14}/>}
                {uploading?'UPLOADING…':'UPLOAD TUTORIAL VIDEO'}
              </button>
              <p style={{fontSize:'.54rem',color:'#555',lineHeight:1.55}}>
                MP4, WebM, OGG or MOV · maximum 50 MB. {!editingId&&'Add the broker first, then click Edit to upload a file.'}
              </p>
            </div>
          </div>
        </section>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'14px' }}>
          <label style={{ fontSize:'.75rem', color:'#999' }}><input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} style={{accentColor:'#D4AF37',marginRight:'8px'}}/>Available to members</label>
          <div style={{display:'flex',gap:'8px'}}>
            {editingId && <button type="button" onClick={() => void cancelEdit()} style={secondaryButton}>Cancel</button>}
            <button disabled={saving} style={goldButton}>{saving?'Saving...':editingId?'Save Broker':'Add Broker'}</button>
          </div>
        </div>
      </form>

      <div style={{ maxWidth:'1120px', background:'#111', border:'1px solid rgba(255,255,255,.06)' }}>
        {loading ? <p style={{padding:'2rem',color:'#666'}}>Loading…</p> : brokers.length===0 ? <p style={{padding:'2rem',color:'#666'}}>No brokers yet. Add the first approved broker above.</p> : brokers.map(b=>(
          <div key={b.id} className="broker-admin-row" style={{ display:'grid', gridTemplateColumns:'150px 1fr 1.45fr 90px 75px 130px', gap:'12px', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <BrokerMiniPreview broker={b}/>
            <div>
              <strong style={{fontSize:'.82rem'}}>{b.name}</strong>
              <span style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'.55rem',marginTop:'5px',color:(b.tutorial_video_url||b.tutorial_video_storage_path)?'#34D399':'#777'}}>
                {(b.tutorial_video_url||b.tutorial_video_storage_path)?<PlayCircle size={12}/>:<Film size={12}/>}
                {(b.tutorial_video_url||b.tutorial_video_storage_path)?'Tutorial ready':'Video placeholder'}
              </span>
            </div>
            <span style={{fontSize:'.7rem',color:'#777',overflow:'hidden',textOverflow:'ellipsis'}}>{b.referral_link}</span>
            <span style={{fontSize:'.72rem',color:'#D4AF37'}}>${b.min_deposit}</span>
            <span style={{fontSize:'.68rem',color:b.is_active?'#34D399':'#777'}}>{b.is_active?'Active':'Hidden'}</span>
            <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}><button onClick={()=>edit(b)} style={secondaryButton}>Edit</button><button onClick={()=>remove(b)} style={{...secondaryButton,color:'#FF6B78'}}>Delete</button></div>
          </div>
        ))}
      </div>
      <style>{`@keyframes brokerSpin{to{transform:rotate(360deg)}}@media(max-width:1100px){.broker-admin-row{grid-template-columns:130px 1fr 1.4fr 80px!important}}@media(max-width:900px){.broker-tutorial-editor-grid{grid-template-columns:1fr!important}.broker-admin-row{grid-template-columns:120px 1fr!important}}`}</style>
    </div>
  );
}

function AdminTutorialPreview({brokerName,playbackUrl,uploading}:{brokerName:string;playbackUrl:string|null;uploading:boolean}) {
  const usablePlayback=playbackUrl&&(/^(https?:|blob:)/i.test(playbackUrl))?playbackUrl:null;
  const embed=usablePlayback?embedVideoUrl(usablePlayback):null;
  if(uploading)return <div style={adminVideoPlaceholder}><Loader2 size={27} color="#D4AF37" style={{animation:'brokerSpin .8s linear infinite'}}/><span>Uploading tutorial…</span></div>;
  if(!usablePlayback)return <div style={adminVideoPlaceholder}><Film size={31} color="#555"/><strong>VIDEO PLACEHOLDER</strong><span>Add a tutorial for {brokerName}</span></div>;
  if(embed)return <div style={adminVideoWrap}><iframe src={embed} title={`${brokerName} tutorial preview`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}}/></div>;
  return <video controls preload="metadata" src={usablePlayback} style={{width:'100%',height:'100%',minHeight:220,maxHeight:310,background:'#000',objectFit:'contain'}}/>;
}

function BrokerMiniPreview({broker}:{broker:BrokerRecord}){
  const playback=broker.tutorial_playback_url??broker.tutorial_video_url??null;
  if(!playback)return <div style={miniPlaceholder}><Film size={20}/><span>VIDEO</span></div>;
  const embed=embedVideoUrl(playback);
  if(embed)return <div style={miniVideo}><iframe src={embed} title={`${broker.name} tutorial`} tabIndex={-1} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,pointerEvents:'none'}}/></div>;
  return <video muted preload="metadata" src={playback} style={{width:'100%',aspectRatio:'16/9',display:'block',background:'#000',objectFit:'cover'}}/>;
}

function embedVideoUrl(raw:string){
  try{
    const url=new URL(raw);
    if(url.hostname.includes('youtube.com')){const id=url.searchParams.get('v')??url.pathname.split('/').filter(Boolean).pop();return id?`https://www.youtube-nocookie.com/embed/${id}`:null;}
    if(url.hostname==='youtu.be'){const id=url.pathname.slice(1);return id?`https://www.youtube-nocookie.com/embed/${id}`:null;}
    if(url.hostname.includes('vimeo.com')){const id=url.pathname.split('/').filter(Boolean).pop();return id?`https://player.vimeo.com/video/${id}`:null;}
    return null;
  }catch{return null;}
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label style={{display:'block',fontSize:'.58rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#777'}}>{label}<div style={{marginTop:'6px'}}>{children}</div></label>; }
const inputStyle:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#090909',border:'1px solid rgba(255,255,255,.1)',padding:'10px',color:'#fff',outline:'none'};
const goldButton:React.CSSProperties={background:'linear-gradient(135deg,#B8860B,#D4AF37)',border:'none',padding:'10px 18px',fontFamily:'Cinzel,serif',fontWeight:700,fontSize:'.68rem',cursor:'pointer'};
const secondaryButton:React.CSSProperties={background:'transparent',border:'1px solid rgba(255,255,255,.12)',color:'#aaa',padding:'8px 12px',fontSize:'.68rem',cursor:'pointer'};
const tutorialEditor:React.CSSProperties={marginTop:'16px',border:'1px solid rgba(255,255,255,.065)',background:'#0D0D0D'};
const tutorialEditorHeader:React.CSSProperties={display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',padding:'11px 13px',borderBottom:'1px solid rgba(255,255,255,.055)'};
const tutorialEditorGrid:React.CSSProperties={display:'grid',gridTemplateColumns:'minmax(300px,1fr) minmax(280px,.85fr)',gap:'14px',padding:'14px'};
const adminVideoPlaceholder:React.CSSProperties={minHeight:220,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'9px',padding:'20px',background:'radial-gradient(circle at center,#171717,#070707)',border:'1px dashed rgba(212,175,55,.2)',color:'#666',fontSize:'.58rem',textAlign:'center'};
const adminVideoWrap:React.CSSProperties={position:'relative',paddingTop:'56.25%',background:'#000'};
const orRow:React.CSSProperties={display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:'8px',color:'#555',fontSize:'.48rem'};
const orLine:React.CSSProperties={height:1,background:'rgba(255,255,255,.07)'};
const uploadButton:React.CSSProperties={display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',padding:'10px',border:'1px solid rgba(212,175,55,.3)',background:'rgba(212,175,55,.06)',color:'#D4AF37',fontFamily:'Cinzel,serif',fontSize:'.58rem',letterSpacing:'1px'};
const miniPlaceholder:React.CSSProperties={aspectRatio:'16/9',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px',border:'1px dashed rgba(212,175,55,.18)',background:'radial-gradient(circle at center,#171717,#080808)',color:'#555',fontSize:'.42rem',letterSpacing:'1px'};
const miniVideo:React.CSSProperties={position:'relative',paddingTop:'56.25%',background:'#000',overflow:'hidden'};

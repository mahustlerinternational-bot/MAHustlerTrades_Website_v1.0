'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/utils/authFetch';

type Billing = 'monthly'|'quarterly'|'annual'|'lifetime';
interface AdminPackage {
  id:string; name:string; slug:string; description:string|null; price:number; billing_period:Billing;
  is_active:boolean; is_featured:boolean; sort_order:number; payment_url:string;
  features:{feature_text:string}[];
}
const EMPTY = {name:'',slug:'',description:'',price:0,billing_period:'monthly' as Billing,is_active:true,is_featured:false,sort_order:0,payment_url:'',featuresText:''};

export default function AdminPackagesPage() {
  const [packages,setPackages]=useState<AdminPackage[]>([]);
  const [form,setForm]=useState(EMPTY);
  const [editing,setEditing]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try { const r=await authFetch('/api/admin/packages'); const d=await r.json(); if(!r.ok) throw new Error(d.error); setPackages(Array.isArray(d)?d:[]); }
    catch(e){toast.error(e instanceof Error?e.message:'Failed to load packages');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  function beginEdit(pkg:AdminPackage){setEditing(pkg.id);setForm({name:pkg.name,slug:pkg.slug,description:pkg.description??'',price:Number(pkg.price),billing_period:pkg.billing_period,is_active:pkg.is_active,is_featured:pkg.is_featured,sort_order:pkg.sort_order,payment_url:pkg.payment_url??'',featuresText:(pkg.features??[]).sort((a:any,b:any)=>(a.sort_order??0)-(b.sort_order??0)).map(f=>f.feature_text).join('\n')});}
  function reset(){setEditing(null);setForm(EMPTY);}

  async function save(e:FormEvent){
    e.preventDefault();setSaving(true);
    try{
      const payload={...form,features:form.featuresText.split('\n').map(x=>x.trim()).filter(Boolean)};
      const r=await authFetch(editing?`/api/admin/packages/${editing}`:'/api/admin/packages',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await r.json();if(!r.ok){toast.error(d.error??'Save failed');return;}toast.success(editing?'Package updated':'Package created');reset();await load();
    }finally{setSaving(false);}
  }
  async function remove(pkg:AdminPackage){if(!confirm(`Delete membership package "${pkg.name}"?`))return;const r=await authFetch(`/api/admin/packages/${pkg.id}`,{method:'DELETE'});const d=await r.json();if(!r.ok)return toast.error(d.error??'Delete failed');toast.success('Package deleted');await load();}

  return <div style={{padding:'2.5rem',minHeight:'100vh',background:'#0A0A0A',color:'#fff',fontFamily:'Montserrat,sans-serif'}}>
    <p style={{fontFamily:'Cinzel,serif',fontSize:'.58rem',letterSpacing:'5px',textTransform:'uppercase',color:'#D4AF37',marginBottom:'8px'}}>Revenue</p>
    <h1 style={{fontFamily:'Cinzel,serif',fontSize:'2rem',fontWeight:900}}>Membership Packages</h1>
    <p style={{color:'#666',fontSize:'.75rem',marginTop:'6px',marginBottom:'2rem'}}>Edit portal pricing, benefits, visibility, and optional direct Ziina payment links.</p>

    <form onSubmit={save} style={{maxWidth:'960px',background:'#111',border:'1px solid rgba(212,175,55,.2)',padding:'1.5rem',marginBottom:'1.5rem'}}>
      <p style={{fontFamily:'Cinzel,serif',color:'#D4AF37',fontSize:'.76rem',marginBottom:'14px'}}>{editing?'Edit Package':'Create Package'}</p>
      <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr .65fr .8fr .45fr',gap:'10px'}}>
        <Field label="Name"><input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={input}/></Field>
        <Field label="Slug"><input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} placeholder="auto-generated" style={input}/></Field>
        <Field label="Price USD"><input type="number" min="0" step=".01" value={form.price} onChange={e=>setForm(f=>({...f,price:Number(e.target.value)}))} style={input}/></Field>
        <Field label="Billing"><select value={form.billing_period} onChange={e=>setForm(f=>({...f,billing_period:e.target.value as Billing}))} style={input}>{['monthly','quarterly','annual','lifetime'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Order"><input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:Number(e.target.value)}))} style={input}/></Field>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'10px'}}>
        <Field label="Description"><textarea rows={4} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{...input,resize:'vertical'}}/></Field>
        <Field label="Features (one per line)"><textarea rows={4} value={form.featuresText} onChange={e=>setForm(f=>({...f,featuresText:e.target.value}))} style={{...input,resize:'vertical'}}/></Field>
      </div>
      <div style={{marginTop:'10px'}}><Field label="Direct Ziina Link (optional)"><input type="url" value={form.payment_url} onChange={e=>setForm(f=>({...f,payment_url:e.target.value}))} placeholder="https://pay.ziina.com/..." style={input}/><span style={{display:'block',fontSize:'.62rem',color:'#666',marginTop:'5px'}}>When set, members go directly to this link. Manual links require admin confirmation/grant unless the payment is also connected to the API webhook.</span></Field></div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'14px'}}>
        <div style={{display:'flex',gap:'16px'}}><Check label="Active" checked={form.is_active} onChange={v=>setForm(f=>({...f,is_active:v}))}/><Check label="Featured" checked={form.is_featured} onChange={v=>setForm(f=>({...f,is_featured:v}))}/></div>
        <div style={{display:'flex',gap:'8px'}}>{editing&&<button type="button" onClick={reset} style={secondary}>Cancel</button>}<button disabled={saving} style={gold}>{saving?'Saving...':editing?'Save Package':'Create Package'}</button></div>
      </div>
    </form>

    <div style={{maxWidth:'960px',background:'#111',border:'1px solid rgba(255,255,255,.06)'}}>{loading?<p style={{padding:'2rem',color:'#666'}}>Loading…</p>:packages.map(pkg=><div key={pkg.id} style={{display:'grid',gridTemplateColumns:'1.2fr .7fr .8fr 1.2fr 130px',gap:'12px',alignItems:'center',padding:'1rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
      <div><strong style={{fontSize:'.82rem'}}>{pkg.name}</strong><p style={{fontSize:'.64rem',color:'#666',marginTop:'3px'}}>{pkg.features?.length??0} features · {pkg.slug}</p></div>
      <span style={{fontFamily:'Cinzel,serif',color:'#D4AF37'}}>${Number(pkg.price).toFixed(2)}</span>
      <span style={{fontSize:'.68rem',color:pkg.is_active?'#34D399':'#777'}}>{pkg.is_active?'Active':'Hidden'}{pkg.is_featured?' · Featured':''}</span>
      <span style={{fontSize:'.65rem',color:pkg.payment_url?'#60A5FA':'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pkg.payment_url||'Ziina API checkout'}</span>
      <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}><button onClick={()=>beginEdit(pkg)} style={secondary}>Edit</button><button onClick={()=>remove(pkg)} style={{...secondary,color:'#FF6B78'}}>Delete</button></div>
    </div>)}</div>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{display:'block',fontSize:'.58rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#777'}}>{label}<div style={{marginTop:'6px'}}>{children}</div></label>}
function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label style={{fontSize:'.72rem',color:'#999'}}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{accentColor:'#D4AF37',marginRight:'7px'}}/>{label}</label>}
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#090909',border:'1px solid rgba(255,255,255,.1)',padding:'10px',color:'#fff',outline:'none'};
const gold:React.CSSProperties={background:'linear-gradient(135deg,#B8860B,#D4AF37)',border:'none',padding:'10px 18px',fontFamily:'Cinzel,serif',fontWeight:700,fontSize:'.68rem',cursor:'pointer'};
const secondary:React.CSSProperties={background:'transparent',border:'1px solid rgba(255,255,255,.12)',color:'#aaa',padding:'8px 12px',fontSize:'.68rem',cursor:'pointer'};

'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/utils/authFetch';
import type { BrokerRecord } from '@/app/api/admin/brokers/route';

const EMPTY = { name: '', referral_link: '', min_deposit: 500, sort_order: 0, is_active: true };

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<BrokerRecord[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setEditingId(null); setForm(EMPTY); await load();
    } finally { setSaving(false); }
  }

  function edit(broker: BrokerRecord) {
    setEditingId(broker.id);
    setForm({ name: broker.name, referral_link: broker.referral_link, min_deposit: broker.min_deposit, sort_order: broker.sort_order, is_active: broker.is_active });
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

      <form onSubmit={submit} style={{ background:'#111', border:'1px solid rgba(212,175,55,.2)', padding:'1.5rem', maxWidth:'900px', marginBottom:'1.5rem' }}>
        <p style={{ fontFamily:'Cinzel,serif', color:'#D4AF37', fontSize:'.75rem', marginBottom:'1rem' }}>{editingId ? 'Edit Broker' : 'Add Broker'}</p>
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 2fr .7fr .5fr', gap:'12px' }}>
          <Field label="Broker Name"><input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={inputStyle}/></Field>
          <Field label="Referral Link"><input required type="url" value={form.referral_link} onChange={e=>setForm(f=>({...f,referral_link:e.target.value}))} placeholder="https://..." style={inputStyle}/></Field>
          <Field label="Min. Deposit"><input type="number" min="0" value={form.min_deposit} onChange={e=>setForm(f=>({...f,min_deposit:Number(e.target.value)}))} style={inputStyle}/></Field>
          <Field label="Order"><input type="number" value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:Number(e.target.value)}))} style={inputStyle}/></Field>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'14px' }}>
          <label style={{ fontSize:'.75rem', color:'#999' }}><input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} style={{accentColor:'#D4AF37',marginRight:'8px'}}/>Available to members</label>
          <div style={{display:'flex',gap:'8px'}}>
            {editingId && <button type="button" onClick={()=>{setEditingId(null);setForm(EMPTY);}} style={secondaryButton}>Cancel</button>}
            <button disabled={saving} style={goldButton}>{saving?'Saving...':editingId?'Save Broker':'Add Broker'}</button>
          </div>
        </div>
      </form>

      <div style={{ maxWidth:'900px', background:'#111', border:'1px solid rgba(255,255,255,.06)' }}>
        {loading ? <p style={{padding:'2rem',color:'#666'}}>Loading…</p> : brokers.length===0 ? <p style={{padding:'2rem',color:'#666'}}>No brokers yet. Add the first approved broker above.</p> : brokers.map(b=>(
          <div key={b.id} style={{ display:'grid', gridTemplateColumns:'1fr 2fr 110px 90px 130px', gap:'12px', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <strong style={{fontSize:'.82rem'}}>{b.name}</strong>
            <span style={{fontSize:'.7rem',color:'#777',overflow:'hidden',textOverflow:'ellipsis'}}>{b.referral_link}</span>
            <span style={{fontSize:'.72rem',color:'#D4AF37'}}>${b.min_deposit}</span>
            <span style={{fontSize:'.68rem',color:b.is_active?'#34D399':'#777'}}>{b.is_active?'Active':'Hidden'}</span>
            <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}><button onClick={()=>edit(b)} style={secondaryButton}>Edit</button><button onClick={()=>remove(b)} style={{...secondaryButton,color:'#FF6B78'}}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <label style={{display:'block',fontSize:'.58rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#777'}}>{label}<div style={{marginTop:'6px'}}>{children}</div></label>; }
const inputStyle:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#090909',border:'1px solid rgba(255,255,255,.1)',padding:'10px',color:'#fff',outline:'none'};
const goldButton:React.CSSProperties={background:'linear-gradient(135deg,#B8860B,#D4AF37)',border:'none',padding:'10px 18px',fontFamily:'Cinzel,serif',fontWeight:700,fontSize:'.68rem',cursor:'pointer'};
const secondaryButton:React.CSSProperties={background:'transparent',border:'1px solid rgba(255,255,255,.12)',color:'#aaa',padding:'8px 12px',fontSize:'.68rem',cursor:'pointer'};

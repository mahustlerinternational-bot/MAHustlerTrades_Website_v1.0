'use client';
// src/app/admin/settings/page.tsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/utils/authFetch';
import IntegrationSettingsPanel from '@/components/admin/settings/IntegrationSettingsPanel';

type Tab = 'hero' | 'stats' | 'ib' | 'quant' | 'integrations' | 'assistant';

interface IBStep { title: string; body: string; }

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('hero');
  const [settings,  setSettings]  = useState<Record<string, any>>({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [assistantStatus,setAssistantStatus]=useState<{openai_configured:boolean;model:string;built_in_topics:number}|null>(null);

  useEffect(() => {
    authFetch('/api/admin/settings')
      .then(r => r.json())
      .then((data: any[]) => {
        const map: Record<string, any> = {};
        if (Array.isArray(data)) data.forEach(s => { map[s.key] = s.value; });
        setSettings(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(()=>{authFetch('/api/admin/assistant/status').then(r=>r.ok?r.json():null).then(setAssistantStatus).catch(()=>null);},[]);

  async function save(key: string, value: unknown) {
    setSaving(true);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
        toast.success('Settings saved successfully');
      } else {
        const e = await res.json();
        toast.error(e.error ?? 'Save failed');
      }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'hero',  label: 'Hero Section',  icon: '🏠' },
    { id: 'stats', label: 'Statistics',    icon: '📊' },
    { id: 'ib',    label: 'IB Guide',      icon: '🔗' },
    { id: 'quant', label: 'Quant AI',      icon: '⚡' },
    { id: 'integrations', label: 'Signal Hub', icon: '📡' },
    { id: 'assistant', label: 'AI Assistant', icon: '🤖' },
  ];

  if (loading) return (
    <div style={{ padding:'2.5rem', background:'#0A0A0A', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'24px', height:'24px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Configuration</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Site Settings</h1>
        <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>Edit global site content without modifying code</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'2px', marginBottom:'2rem', borderBottom:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'.75rem', fontWeight:500, letterSpacing:'.5px', transition:'all .2s', borderBottom: activeTab === id ? '2px solid #D4AF37' : '2px solid transparent', marginBottom:'-1px', color: activeTab === id ? '#D4AF37' : '#666' }}>
            <span style={{ fontSize:'14px' }}>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Panel wrapper */}
      <div style={{ maxWidth:['integrations','assistant'].includes(activeTab)?'860px':'680px', animation:'fadeUp .5s .14s ease forwards', opacity:0 }}>

        {/* ── HERO ── */}
        {activeTab === 'hero' && (() => {
          const d = settings['hero'] ?? {};
          return (
            <SettingsCard title="Home Page Hero" onSave={() => save('hero', d)} saving={saving}>
              {[
                { label:'Badge Text',      key:'badge_text',   placeholder:'e.g. The Premier Trading Collective' },
                { label:'Main Headline',   key:'headline',     placeholder:'e.g. Master The Markets.' },
                { label:'Sub Headline',    key:'subheadline',  placeholder:'e.g. Dominate Your Future.' },
              ].map(({ label, key, placeholder }) => (
                <Field key={key} label={label}>
                  <input defaultValue={d[key] ?? ''} onChange={e => { d[key] = e.target.value; setSettings(s => ({ ...s, hero: { ...d } })); }}
                    placeholder={placeholder} style={iStyle}
                    onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                    onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                </Field>
              ))}
              <Field label="Body Copy">
                <textarea defaultValue={d['sub_copy'] ?? ''} rows={3} onChange={e => { d['sub_copy'] = e.target.value; setSettings(s => ({ ...s, hero: { ...d } })); }}
                  placeholder="Supporting paragraph below the headline..."
                  style={{ ...iStyle, resize:'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                  onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              </Field>
            </SettingsCard>
          );
        })()}

        {/* ── STATS ── */}
        {activeTab === 'stats' && (() => {
          const d = settings['stats'] ?? {};
          return (
            <SettingsCard title="Statistics Bar" onSave={() => save('stats', d)} saving={saving}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                {[
                  { label:'Members Count',      key:'members',      placeholder:'12,400+' },
                  { label:'Total Volume',        key:'volume',       placeholder:'$4.2B'   },
                  { label:'Satisfaction Rate',   key:'satisfaction', placeholder:'94%'     },
                  { label:'Expert Instructors',  key:'instructors',  placeholder:'38'      },
                  { label:'Courses & Sessions',  key:'courses',      placeholder:'200+'    },
                ].map(({ label, key, placeholder }) => (
                  <Field key={key} label={label}>
                    <input defaultValue={d[key] ?? ''} onChange={e => { d[key] = e.target.value; setSettings(s => ({ ...s, stats: { ...d } })); }}
                      placeholder={placeholder} style={iStyle}
                      onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                      onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                  </Field>
                ))}
              </div>
            </SettingsCard>
          );
        })()}

        {/* ── IB GUIDE ── */}
        {activeTab === 'ib' && (() => {
          const d: any = { ...(settings['ib_guide'] ?? {}) };
          if (!Array.isArray(d.steps)) d.steps = [{title:'',body:''},{title:'',body:''},{title:'',body:''},{title:'',body:''}];
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <SettingsCard title="Broker Details" onSave={() => save('ib_guide', d)} saving={saving}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <Field label="Broker Name">
                    <input defaultValue={d.broker_name ?? ''} onChange={e => { d.broker_name = e.target.value; setSettings(s => ({ ...s, ib_guide: { ...d } })); }}
                      placeholder="IC Markets" style={iStyle}
                      onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                      onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                  </Field>
                  <Field label="Minimum Deposit (USD)">
                    <input type="number" defaultValue={d.min_deposit ?? 500} onChange={e => { d.min_deposit = parseInt(e.target.value); setSettings(s => ({ ...s, ib_guide: { ...d } })); }}
                      placeholder="500" style={iStyle}
                      onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                      onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                  </Field>
                </div>
                <Field label="Referral / IB Link">
                  <input defaultValue={d.referral_link ?? ''} onChange={e => { d.referral_link = e.target.value; setSettings(s => ({ ...s, ib_guide: { ...d } })); }}
                    placeholder="https://..." style={iStyle}
                    onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                    onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                </Field>
              </SettingsCard>

              {(d.steps as IBStep[]).map((step, i) => (
                <div key={i} style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.25rem' }}>
                  <p style={{ fontFamily:'Cinzel,serif', fontSize:'.6rem', letterSpacing:'3px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'12px' }}>Step {i + 1}</p>
                  <Field label="Step Title">
                    <input defaultValue={step.title} onChange={e => { d.steps[i].title = e.target.value; setSettings(s => ({ ...s, ib_guide: { ...d } })); }}
                      placeholder={`Step ${i+1} title`} style={iStyle}
                      onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                      onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                  </Field>
                  <Field label="Step Body">
                    <textarea defaultValue={step.body} rows={2} onChange={e => { d.steps[i].body = e.target.value; setSettings(s => ({ ...s, ib_guide: { ...d } })); }}
                      placeholder="Step description..." style={{ ...iStyle, resize:'none' }}
                      onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                      onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                  </Field>
                </div>
              ))}

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <SaveBtn onClick={() => save('ib_guide', d)} saving={saving} />
              </div>
            </div>
          );
        })()}

        {/* ── QUANT AI ── */}
        {activeTab === 'quant' && (() => {
          const d = settings['quant_ai'] ?? {};
          return (
            <SettingsCard title="Quant AI System" onSave={() => save('quant_ai', d)} saving={saving}>
              <Field label="System Name">
                <input defaultValue={d['system_name'] ?? ''} onChange={e => { d['system_name'] = e.target.value; setSettings(s => ({ ...s, quant_ai: { ...d } })); }}
                  placeholder="MAHustler Master AI System v1.0" style={iStyle}
                  onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                  onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              </Field>
              <Field label="Status Label">
                <select defaultValue={d['status'] ?? 'active'} onChange={e => { d['status'] = e.target.value; setSettings(s => ({ ...s, quant_ai: { ...d } })); }} style={{ ...iStyle, cursor:'pointer' }}>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                </select>
              </Field>
            </SettingsCard>
          );
        })()}
        {activeTab === 'integrations' && <IntegrationSettingsPanel />}
        {activeTab === 'assistant' && (()=>{const d={enabled:true,provider:'built_in',name:'MAHustler Assistant',welcome:'Hi! How can I help with your membership today?',instructions:'Be concise, friendly, and escalate account-specific changes to an administrator.',knowledge_base:'',...(settings['assistant']??{})};return <SettingsCard title="AI Member Support" onSave={()=>save('assistant',d)} saving={saving}>
          <div style={{padding:'10px 12px',background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',fontSize:'.68rem',color:'#34D399'}}>Built-in Local active · {assistantStatus?.built_in_topics??'30+'} curated topics · zero model API calls</div>
          <label style={{fontSize:'.72rem',color:'#AAA'}}><input type="checkbox" defaultChecked={d.enabled!==false} onChange={e=>{d.enabled=e.target.checked;setSettings(s=>({...s,assistant:{...d}}));}} style={{accentColor:'#D4AF37',marginRight:'8px'}}/>Enable member assistant</label>
          <Field label="Answer Provider"><select defaultValue={d.provider} onChange={e=>{d.provider=e.target.value;setSettings(s=>({...s,assistant:{...d}}));}} style={{...iStyle,cursor:'pointer'}}><option value="built_in">Built-in Local — Free / No API Calls</option><option value="openai" disabled={!assistantStatus?.openai_configured}>OpenAI API {assistantStatus?.openai_configured?`— ${assistantStatus.model}`:'— key not configured'}</option><option value="anthropic" disabled>Claude API — Future Provider</option><option value="custom" disabled>Custom Model API — Future Provider</option></select></Field>
          <Field label="Assistant Name"><input defaultValue={d.name} onChange={e=>{d.name=e.target.value;setSettings(s=>({...s,assistant:{...d}}));}} style={iStyle}/></Field>
          <Field label="Welcome Message"><textarea rows={2} defaultValue={d.welcome} onChange={e=>{d.welcome=e.target.value;setSettings(s=>({...s,assistant:{...d}}));}} style={{...iStyle,resize:'vertical'}}/></Field>
          <Field label="Admin Knowledge / Answering Instructions"><textarea rows={7} defaultValue={d.instructions} onChange={e=>{d.instructions=e.target.value;setSettings(s=>({...s,assistant:{...d}}));}} placeholder="Add company policies, support hours, common answers, and escalation rules…" style={{...iStyle,resize:'vertical'}}/></Field>
          <Field label="Custom Local Knowledge (one entry per line: keywords | answer)"><textarea rows={10} defaultValue={d.knowledge_base} onChange={e=>{d.knowledge_base=e.target.value;setSettings(s=>({...s,assistant:{...d}}));}} placeholder={'office hours contact support | Our support hours are…\nnew policy refund | Your curated answer…'} style={{...iStyle,resize:'vertical',fontFamily:'JetBrains Mono,monospace'}}/></Field>
          <p style={{fontSize:'.63rem',color:'#666',lineHeight:1.6}}>The assistant receives only the signed-in member&apos;s access status and verified-platform flags. It cannot see secrets, tokens, full Discord email addresses, or other members.</p>
        </SettingsCard>;})()}
      </div>
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────
function SettingsCard({ title, onSave, saving, children }: { title:string; onSave:()=>void; saving:boolean; children:React.ReactNode }) {
  return (
    <div>
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
          <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>{title}</p>
        </div>
        {children}
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'12px' }}>
        <SaveBtn onClick={onSave} saving={saving} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666', marginBottom:'6px' }}>{label}</label>
      {children}
    </div>
  );
}

function SaveBtn({ onClick, saving }: { onClick:()=>void; saving:boolean }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ display:'flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'10px 24px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', opacity: saving ? .6 : 1, transition:'opacity .2s' }}>
      {saving ? '⏳' : '💾'} {saving ? 'Saving...' : 'Save Changes'}
    </button>
  );
}

const iStyle: React.CSSProperties = {
  width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)',
  color:'#fff', fontSize:'.78rem', padding:'10px 12px', outline:'none',
  fontFamily:'inherit', transition:'border-color .3s', boxSizing:'border-box',
};

'use client';

import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {authFetch} from '@/lib/utils/authFetch';

type State={
  telegram:{enabled:boolean;chat_id:string;invite_url:string;bot_token_configured:boolean;bot_token:string;inbound_enabled:boolean;source_chat_id:string;webhook_secret_configured:boolean};
  discord:{enabled:boolean;invite_url:string;webhook_url_configured:boolean;webhook_url:string;oauth_enabled:boolean;client_id:string;client_secret_configured:boolean;client_secret:string};
  ea:{enabled:boolean;webhook_secret_configured:boolean;webhook_secret:string};endpoint:string;telegram_webhook_endpoint:string;
};
const EMPTY:State={telegram:{enabled:false,chat_id:'',invite_url:'',bot_token_configured:false,bot_token:'',inbound_enabled:false,source_chat_id:'',webhook_secret_configured:false},discord:{enabled:false,invite_url:'',webhook_url_configured:false,webhook_url:'',oauth_enabled:false,client_id:'',client_secret_configured:false,client_secret:''},ea:{enabled:true,webhook_secret_configured:false,webhook_secret:''},endpoint:'',telegram_webhook_endpoint:''};

export default function IntegrationSettingsPanel(){
  const [state,setState]=useState<State>(EMPTY);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [generated,setGenerated]=useState('');
  useEffect(()=>{authFetch('/api/admin/integrations').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setState({...EMPTY,...d,telegram:{...EMPTY.telegram,...d.telegram},discord:{...EMPTY.discord,...d.discord},ea:{...EMPTY.ea,...d.ea}});}).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));},[]);
  async function save(){setSaving(true);try{const r=await authFetch('/api/admin/integrations',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});const d=await r.json();if(!r.ok)throw new Error(d.error);setState(s=>({...s,...d,telegram:{...s.telegram,...d.telegram,bot_token:''},discord:{...s.discord,...d.discord,webhook_url:'',client_secret:''},ea:{...s.ea,...d.ea,webhook_secret:''}}));toast.success('Signal hub settings saved');}catch(e){toast.error(e instanceof Error?e.message:'Save failed');}finally{setSaving(false);}}
  async function action(name:string){const r=await authFetch('/api/admin/integrations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name})});const d=await r.json();if(!r.ok){toast.error(d.error??'Action failed');return;}if(name==='rotate_ea_secret'){setGenerated(d.secret);setState(s=>({...s,ea:{...s.ea,enabled:true,webhook_secret_configured:true,webhook_secret:''}}));toast.success('New EA secret generated — copy it now');}else if(name==='configure_telegram_webhook'){setState(s=>({...s,telegram:{...s.telegram,inbound_enabled:true,webhook_secret_configured:true}}));toast.success('Telegram channel receiver activated');}else if(name==='disable_telegram_webhook'){setState(s=>({...s,telegram:{...s.telegram,inbound_enabled:false}}));toast.success('Telegram channel receiver disabled');}else if(name==='telegram_webhook_status'){toast.success(d.last_error_message?`Webhook error: ${d.last_error_message}`:`Webhook active · ${d.pending_update_count} pending update(s)`);}else toast.success('Connection test succeeded');}
  if(loading)return <p style={{color:'#666'}}>Loading integrations…</p>;
  return <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
    <Card title="Telegram Signals" color="#2AABEE">
      <Toggle label="Enable Telegram broadcasting" checked={state.telegram.enabled} onChange={v=>setState(s=>({...s,telegram:{...s.telegram,enabled:v}}))}/>
      <Field label="Bot Token"><input type="password" value={state.telegram.bot_token} onChange={e=>setState(s=>({...s,telegram:{...s.telegram,bot_token:e.target.value}}))} placeholder={state.telegram.bot_token_configured?'Configured — leave blank to keep':'123456:ABC...'} style={input}/></Field>
      <Field label="Channel / Group Chat ID"><input value={state.telegram.chat_id} onChange={e=>setState(s=>({...s,telegram:{...s.telegram,chat_id:e.target.value}}))} placeholder="@channelname or -1001234567890" style={input}/></Field>
      <Field label="Fallback Invite Link"><input type="url" value={state.telegram.invite_url} onChange={e=>setState(s=>({...s,telegram:{...s.telegram,invite_url:e.target.value}}))} placeholder="https://t.me/+..." style={input}/></Field>
      <button onClick={()=>action('test_telegram')} style={secondary}>Test Telegram</button>
      <p style={hint}>The bot must be an administrator to post signals and generate one-use IB invite links.</p>
      <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:'13px',display:'flex',flexDirection:'column',gap:'11px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong style={{fontSize:'.7rem'}}>Telegram → Website Receiver</strong><span style={{fontSize:'.58rem',color:state.telegram.inbound_enabled?'#34D399':'#777'}}>{state.telegram.inbound_enabled?'ACTIVE':'INACTIVE'}</span></div>
        <Field label="Inbound Source Channel"><input value={state.telegram.source_chat_id} onChange={e=>setState(s=>({...s,telegram:{...s.telegram,source_chat_id:e.target.value}}))} placeholder="@channelusername or -1001234567890" style={input}/></Field>
        <Field label="Telegram Webhook Endpoint"><CopyBox value={state.telegram_webhook_endpoint||`${typeof window!=='undefined'?window.location.origin:''}/api/integrations/telegram/webhook`}/></Field>
        <div style={{display:'flex',gap:'7px',flexWrap:'wrap'}}><button onClick={save} style={secondary}>Save Receiver Settings</button><button onClick={()=>action('configure_telegram_webhook')} style={secondary}>Activate Receiver</button><button onClick={()=>action('telegram_webhook_status')} style={secondary}>Check Status</button>{state.telegram.inbound_enabled&&<button onClick={()=>action('disable_telegram_webhook')} style={{...secondary,color:'#FF6B78',borderColor:'rgba(255,71,87,.3)'}}>Disable</button>}</div>
        <p style={hint}>Telegram permits only one webhook per bot. Activating this replaces any previous webhook/getUpdates receiver. If the EA posts through this same bot, verify with a live channel test because bots may not receive their own outgoing posts.</p>
      </div>
    </Card>
    <Card title="Discord Signals" color="#5865F2">
      <Toggle label="Enable Discord broadcasting" checked={state.discord.enabled} onChange={v=>setState(s=>({...s,discord:{...s.discord,enabled:v}}))}/>
      <Field label="Incoming Webhook URL"><input type="password" value={state.discord.webhook_url} onChange={e=>setState(s=>({...s,discord:{...s.discord,webhook_url:e.target.value}}))} placeholder={state.discord.webhook_url_configured?'Configured — leave blank to keep':'https://discord.com/api/webhooks/...'} style={input}/></Field>
      <Field label="Server Invite Link"><input type="url" value={state.discord.invite_url} onChange={e=>setState(s=>({...s,discord:{...s.discord,invite_url:e.target.value}}))} placeholder="https://discord.gg/..." style={input}/></Field>
      <button onClick={()=>action('test_discord')} style={secondary}>Test Discord</button>
      <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:'13px',display:'flex',flexDirection:'column',gap:'11px'}}>
        <Toggle label="Require verified Discord account before showing invite" checked={state.discord.oauth_enabled} onChange={v=>setState(s=>({...s,discord:{...s.discord,oauth_enabled:v}}))}/>
        <Field label="Discord Application Client ID"><input value={state.discord.client_id} onChange={e=>setState(s=>({...s,discord:{...s.discord,client_id:e.target.value}}))} placeholder="Discord Developer Portal client ID" style={input}/></Field>
        <Field label="Discord OAuth Client Secret"><input type="password" value={state.discord.client_secret} onChange={e=>setState(s=>({...s,discord:{...s.discord,client_secret:e.target.value}}))} placeholder={state.discord.client_secret_configured?'Configured — leave blank to keep':'Discord OAuth client secret'} style={input}/></Field>
        <Field label="OAuth Redirect URL"><CopyBox value={`${typeof window!=='undefined'?window.location.origin:''}/api/community/discord/callback`}/></Field>
      </div>
      <p style={hint}>The webhook broadcasts signals. OAuth verifies the member&apos;s real Discord identity before the approved-IB invite is revealed.</p>
    </Card>
    <Card title="EA Signal Input" color="#D4AF37">
      <Toggle label="Enable EA webhook" checked={state.ea.enabled} onChange={v=>setState(s=>({...s,ea:{...s.ea,enabled:v}}))}/>
      <Field label="Website Endpoint"><CopyBox value={state.endpoint||`${typeof window!=='undefined'?window.location.origin:''}/api/integrations/ea/signals`}/></Field>
      <Field label="Webhook Secret"><input type="password" value={state.ea.webhook_secret} onChange={e=>setState(s=>({...s,ea:{...s.ea,webhook_secret:e.target.value}}))} placeholder={state.ea.webhook_secret_configured?'Configured — leave blank to keep':'Enter a strong secret or generate one'} style={input}/></Field>
      <button onClick={()=>action('rotate_ea_secret')} style={secondary}>Generate New EA Secret</button>
      {generated&&<div style={{background:'#090909',border:'1px solid rgba(212,175,55,.35)',padding:'12px'}}><p style={{...hint,color:'#D4AF37',marginBottom:'6px'}}>Copy now — it will not be shown again.</p><CopyBox value={generated}/></div>}
      <Field label="Open Signal JSON"><CopyBox value={'{"action":"open","external_id":"EA-12345","instrument":"XAUUSD","signal_type":"buy","entry_price":2350.50,"tp_price":2370,"sl_price":2340}'}/></Field>
      <p style={hint}>Send JSON with <code>Authorization: Bearer YOUR_SECRET</code>. For closing, send action <code>close</code>, the same external_id, status <code>tp</code>/<code>sl</code>, and optional closed_price.</p>
    </Card>
    <div style={{display:'flex',justifyContent:'flex-end'}}><button onClick={save} disabled={saving} style={gold}>{saving?'Saving…':'Save All Integrations'}</button></div>
  </div>;
}
function Card({title,color,children}:{title:string;color:string;children:React.ReactNode}){return <div style={{background:'#111',border:`1px solid ${color}33`,padding:'1.5rem',display:'flex',flexDirection:'column',gap:'13px'}}><div style={{display:'flex',gap:'9px',alignItems:'center'}}><span style={{width:'3px',height:'17px',background:color}}/><strong style={{fontFamily:'Cinzel,serif',fontSize:'.76rem'}}>{title}</strong></div>{children}</div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label style={{fontSize:'.58rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#666'}}>{label}<div style={{marginTop:'6px'}}>{children}</div></label>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label style={{fontSize:'.72rem',color:'#AAA'}}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{accentColor:'#D4AF37',marginRight:'8px'}}/>{label}</label>}
function CopyBox({value}:{value:string}){return <div style={{display:'flex',gap:'6px'}}><code style={{...input,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textTransform:'none',letterSpacing:0}}>{value}</code><button type="button" onClick={()=>{navigator.clipboard.writeText(value);toast.success('Copied');}} style={secondary}>Copy</button></div>}
const input:React.CSSProperties={width:'100%',boxSizing:'border-box',background:'#090909',border:'1px solid rgba(255,255,255,.1)',padding:'10px 11px',color:'#fff',outline:'none',fontFamily:'inherit'};
const secondary:React.CSSProperties={alignSelf:'flex-start',background:'transparent',border:'1px solid rgba(212,175,55,.28)',color:'#D4AF37',padding:'8px 12px',fontSize:'.68rem',cursor:'pointer',whiteSpace:'nowrap'};
const gold:React.CSSProperties={background:'linear-gradient(135deg,#B8860B,#D4AF37)',border:0,padding:'11px 20px',fontFamily:'Cinzel,serif',fontWeight:700,fontSize:'.68rem',cursor:'pointer'};
const hint:React.CSSProperties={fontSize:'.63rem',color:'#666',lineHeight:1.6,textTransform:'none',letterSpacing:0};

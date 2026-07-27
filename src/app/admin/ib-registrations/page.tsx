'use client';
// src/app/admin/ib-registrations/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast }   from 'sonner';
import { format }  from 'date-fns';
import type { IbRegistration } from '@/types';
import { authFetch } from '@/lib/utils/authFetch';

type FilterStatus = '' | 'pending' | 'approved' | 'rejected';
type IBWithProfile = IbRegistration & { profile?: { full_name: string | null; role: string } };

const STATUS_STYLE: Record<string,{ color:string; bg:string; border:string }> = {
  pending:  { color:'#F59E0B', bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.3)'  },
  approved: { color:'#34D399', bg:'rgba(52,211,153,.08)',  border:'rgba(52,211,153,.3)'  },
  rejected: { color:'#FF4757', bg:'rgba(255,71,87,.08)',   border:'rgba(255,71,87,.3)'   },
};

export default function IBRegistrationsPage() {
  const [regs,     setRegs]     = useState<IBWithProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<FilterStatus>('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes,    setNotes]    = useState<Record<string,string>>({});
  const [saving,   setSaving]   = useState<string | null>(null);

  const fetchRegs = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/ib-registrations${filter ? `?status=${filter}` : ''}`;
      const res = await authFetch(url);
      const d   = await res.json();
      setRegs(Array.isArray(d) ? d : []);
    } catch { setRegs([]); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchRegs(); }, [fetchRegs]);

  async function review(userId: string, status: 'approved' | 'rejected') {
    setSaving(userId + status);
    try {
      const res = await authFetch(`/api/admin/members/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review_ib', status, admin_notes: notes[userId] ?? '' }),
      });
      const result=await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      if(status==='approved'&&result.email?.status!=='sent'){
        toast.warning(`Elite access approved, but email needs attention: ${result.email?.message??'delivery status unavailable'}`);
      }else{
        toast.success(status==='approved'?`Elite access approved · approval email sent · all courses are now free · ${result.community?.length??0} community invite(s) prepared`:`Elite registration ${status}`);
      }
      fetchRegs();
    } finally { setSaving(null); }
  }

  const counts = {
    all:      regs.length,
    pending:  regs.filter(r => r.status === 'pending').length,
    approved: regs.filter(r => r.status === 'approved').length,
    rejected: regs.filter(r => r.status === 'rejected').length,
  };

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ib-card:hover{background:rgba(255,255,255,.015)!important}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>IB Programme</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>IB Registrations</h1>
        <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>Review and approve Introducing Broker membership applications</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'1.75rem', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
        {([['', 'All', counts.all], ['pending','Pending',counts.pending,true], ['approved','Approved',counts.approved], ['rejected','Rejected',counts.rejected]] as [FilterStatus,string,number,boolean?][]).map(([val,label,count,urgent]) => (
          <button key={String(val)} onClick={() => setFilter(val)}
            style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 16px', background: filter===val ? 'rgba(212,175,55,.08)' : 'none', border:`1px solid ${filter===val ? 'rgba(212,175,55,.35)' : 'rgba(255,255,255,.07)'}`, color: filter===val ? '#D4AF37' : '#666', fontSize:'.72rem', letterSpacing:'.5px', cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}>
            {label}
            {count > 0 && (
              <span style={{ fontSize:'.6rem', padding:'1px 6px', borderRadius:'999px', background: urgent && count > 0 ? 'rgba(245,158,11,.2)' : 'rgba(255,255,255,.06)', color: urgent && count > 0 ? '#F59E0B' : '#555' }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:'8px', animation:'fadeUp .5s .14s ease forwards', opacity:0 }}>
        {loading && (
          <div style={{ padding:'4rem', display:'flex', justifyContent:'center' }}>
            <div style={{ width:'20px', height:'20px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
          </div>
        )}
        {!loading && regs.length === 0 && (
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'4rem', textAlign:'center' }}>
            <p style={{ fontSize:'2rem', marginBottom:'10px' }}>🔗</p>
            <p style={{ fontSize:'.8rem', color:'#555' }}>No {filter || ''} IB registrations.</p>
          </div>
        )}
        {!loading && regs.map(reg => {
          const ss = STATUS_STYLE[reg.status] ?? STATUS_STYLE.pending;
          const isOpen = expanded === reg.id;
          return (
            <div key={reg.id} className="ib-card" style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', overflow:'hidden', transition:'background .15s' }}>
              {/* Collapsed row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem', cursor:'pointer' }}
                onClick={() => setExpanded(isOpen ? null : reg.id)}>
                <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#1A1000,#B8860B)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cinzel,serif', fontSize:'.8rem', fontWeight:700, color:'#D4AF37', flexShrink:0 }}>
                    {reg.profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p style={{ fontSize:'.82rem', fontWeight:500 }}>{reg.profile?.full_name ?? `User ${reg.user_id.slice(0,8)}`}</p>
                    <p style={{ fontSize:'.65rem', color:'#555', marginTop:'2px' }}>
                      {reg.broker_name} · Acc: {reg.account_number}
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                  <span style={{ fontSize:'.65rem', color:'#555' }}>{format(new Date(reg.submitted_at),'dd MMM yyyy')}</span>
                  <span style={{ fontSize:'.6rem', letterSpacing:'1.5px', textTransform:'uppercase', padding:'3px 9px', border:`1px solid ${ss.border}`, color:ss.color, background:ss.bg }}>
                    {reg.status}
                  </span>
                  <span style={{ color:'#555', fontSize:'12px', transition:'transform .2s', display:'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                </div>
              </div>

              {/* Expanded panel */}
              {isOpen && (
                <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', padding:'1.25rem 1.5rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'1.25rem' }}>
                    {[['Broker Name',reg.broker_name],['Account Number',reg.account_number],['Submitted',format(new Date(reg.submitted_at),'dd MMM yyyy HH:mm')]].map(([l,v]) => (
                      <div key={l} style={{ background:'#0A0A0A', border:'1px solid rgba(255,255,255,.06)', padding:'12px 14px' }}>
                        <p style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#555', marginBottom:'4px' }}>{l}</p>
                        <p style={{ fontSize:'.78rem', fontFamily:'JetBrains Mono,monospace', color:'#fff' }}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {reg.admin_notes && (
                    <div style={{ background:'rgba(212,175,55,.04)', border:'1px solid rgba(212,175,55,.15)', padding:'10px 14px', marginBottom:'1rem' }}>
                      <p style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'4px' }}>Admin Notes</p>
                      <p style={{ fontSize:'.75rem', color:'#888' }}>{reg.admin_notes}</p>
                    </div>
                  )}

                  {reg.status === 'pending' && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      <div>
                        <label style={{ display:'block', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#555', marginBottom:'6px' }}>Review Notes (optional)</label>
                        <textarea value={notes[reg.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [reg.id]: e.target.value }))} rows={2}
                          placeholder="Internal notes for this decision..."
                          style={{ width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.75rem', padding:'10px 12px', outline:'none', fontFamily:'inherit', resize:'none', transition:'border-color .3s' }}
                          onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                          onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
                      </div>
                      <div style={{ display:'flex', gap:'10px' }}>
                        <button onClick={() => review(reg.user_id,'approved')} disabled={saving === reg.user_id+'approved'}
                          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 22px', background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.3)', color:'#34D399', fontSize:'.72rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .2s', opacity: saving === reg.user_id+'approved' ? .5 : 1 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(52,211,153,.15)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(52,211,153,.08)'}>
                          ✓ {saving === reg.user_id+'approved' ? 'Approving...' : 'Approve & Grant Access'}
                        </button>
                        <button onClick={() => review(reg.user_id,'rejected')} disabled={saving === reg.user_id+'rejected'}
                          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 22px', background:'rgba(255,71,87,.08)', border:'1px solid rgba(255,71,87,.3)', color:'#FF4757', fontSize:'.72rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .2s', opacity: saving === reg.user_id+'rejected' ? .5 : 1 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(255,71,87,.15)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background='rgba(255,71,87,.08)'}>
                          ✕ {saving === reg.user_id+'rejected' ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                      <p style={{ fontSize:'.68rem', color:'#444' }}>
                        ℹ Approving will automatically upgrade the member role to <strong style={{color:'#888'}}>ib_member</strong> and activate IB access.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

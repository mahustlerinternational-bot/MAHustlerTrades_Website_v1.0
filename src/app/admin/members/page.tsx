'use client';
// src/app/admin/members/page.tsx
import { useState, useEffect, useCallback } from 'react';
import MemberDetailDrawer from '@/components/admin/members/MemberDetailDrawer';
import { ensureArray }    from '@/lib/utils/fetchApi';
import type { Profile }   from '@/types';

type MemberRow = Profile & { package?: { name: string } | null };

const ROLE_COLOR: Record<string, string> = {
  admin:     '#A78BFA',
  member:    '#D4AF37',
  ib_member: '#60A5FA',
};
const IB_COLOR: Record<string, string> = {
  none: '#555', pending: '#F59E0B', active: '#34D399', rejected: '#FF4757',
};

export default function AdminMembersPage() {
  const [members,    setMembers]    = useState<MemberRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<string | null>(null);
  const LIMIT = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT), ...(search && { search }), ...(roleFilter && { role: roleFilter }) });
      const res  = await fetch(`/api/admin/members?${p}`);
      const json = await res.json();
      setMembers(Array.isArray(json?.data) ? json.data : []);
      setTotal(json?.total ?? 0);
    } catch { setMembers([]); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { const id = setTimeout(() => { setPage(1); fetchMembers(); }, 400); return () => clearTimeout(id); }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .member-row:hover{background:rgba(255,255,255,.025)!important;cursor:pointer}
        .pg-btn:hover{border-color:rgba(212,175,55,.35)!important;color:#D4AF37!important}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <div>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Management</p>
          <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Members</h1>
          <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>{total.toLocaleString()} total members</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'1.5rem', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
        <div style={{ position:'relative', flex:1, maxWidth:'360px' }}>
          <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#555', fontSize:'13px' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
            style={{ width:'100%', background:'#111', border:'1px solid rgba(255,255,255,.07)', color:'#fff', fontSize:'.78rem', padding:'10px 12px 10px 36px', outline:'none', fontFamily:'inherit', transition:'border-color .3s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')} />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ background:'#111', border:'1px solid rgba(255,255,255,.07)', color: roleFilter ? '#fff' : '#555', fontSize:'.78rem', padding:'10px 14px', outline:'none', fontFamily:'inherit', minWidth:'160px', cursor:'pointer' }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="ib_member">IB Member</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', animation:'fadeUp .5s .14s ease forwards', opacity:0 }}>
        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 120px 120px 80px 110px 60px', gap:'1rem', padding:'.75rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
          {['Member','Role','Package','IB Status','Joined',''].map(h => (
            <p key={h} style={{ fontSize:'.58rem', letterSpacing:'2.5px', textTransform:'uppercase', color:'#444', fontWeight:500 }}>{h}</p>
          ))}
        </div>

        {loading && (
          <div style={{ padding:'4rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' }}>
            <div style={{ width:'20px', height:'20px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
            <span style={{ fontSize:'.78rem', color:'#555' }}>Loading members...</span>
          </div>
        )}
        {!loading && members.length === 0 && (
          <div style={{ padding:'4rem', textAlign:'center' }}>
            <p style={{ fontSize:'2rem', marginBottom:'10px' }}>👥</p>
            <p style={{ fontSize:'.8rem', color:'#555' }}>No members found.</p>
          </div>
        )}
        {!loading && members.map(m => (
          <div key={m.id} className="member-row"
            style={{ display:'grid', gridTemplateColumns:'1fr 120px 120px 80px 110px 60px', gap:'1rem', padding:'.85rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.03)', alignItems:'center', transition:'background .15s' }}
            onClick={() => setSelected(m.id)}>
            {/* Avatar + name */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
              <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#1A1000,#B8860B)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cinzel,serif', fontSize:'.75rem', fontWeight:700, color:'#D4AF37', flexShrink:0 }}>
                {m.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:'.8rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.full_name ?? '—'}</p>
                <p style={{ fontSize:'.6rem', color:'#444', fontFamily:'JetBrains Mono,monospace', marginTop:'1px' }}>{m.id.slice(0,10)}…</p>
              </div>
            </div>
            {/* Role */}
            <div>
              <span style={{ fontSize:'.6rem', letterSpacing:'1.5px', textTransform:'uppercase', padding:'3px 8px', border:'1px solid', color: ROLE_COLOR[m.role] ?? '#888', borderColor:`${ROLE_COLOR[m.role] ?? '#888'}44`, background:`${ROLE_COLOR[m.role] ?? '#888'}11` }}>
                {m.role.replace('_',' ')}
              </span>
            </div>
            {/* Package */}
            <p style={{ fontSize:'.75rem', color:'#888' }}>{(m as any).package?.name ?? '—'}</p>
            {/* IB */}
            <p style={{ fontSize:'.75rem', fontWeight:500, color: IB_COLOR[m.ib_status] ?? '#555', textTransform:'capitalize' }}>{m.ib_status}</p>
            {/* Joined */}
            <p style={{ fontSize:'.7rem', color:'#555' }}>{new Date(m.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</p>
            {/* Arrow */}
            <p style={{ fontSize:'.72rem', color:'#444', textAlign:'right' }}>→</p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'1rem', fontSize:'.72rem', color:'#555' }}>
          <span>Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} of {total.toLocaleString()}</span>
          <div style={{ display:'flex', gap:'6px' }}>
            <button className="pg-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              style={{ padding:'6px 12px', background:'none', border:'1px solid rgba(255,255,255,.07)', color:'#555', cursor:page===1?'not-allowed':'pointer', opacity:page===1?.4:1, transition:'all .2s', fontFamily:'inherit', fontSize:'.72rem' }}>←</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const pg=page<=3?i+1:page-2+i;if(pg>totalPages)return null;return(
              <button key={pg} className="pg-btn" onClick={() => setPage(pg)}
                style={{ padding:'6px 12px', background:pg===page?'rgba(212,175,55,.1)':'none', border:'1px solid', borderColor:pg===page?'rgba(212,175,55,.35)':'rgba(255,255,255,.07)', color:pg===page?'#D4AF37':'#555', cursor:'pointer', transition:'all .2s', fontFamily:'inherit', fontSize:'.72rem' }}>{pg}</button>
            );})}
            <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              style={{ padding:'6px 12px', background:'none', border:'1px solid rgba(255,255,255,.07)', color:'#555', cursor:page===totalPages?'not-allowed':'pointer', opacity:page===totalPages?.4:1, transition:'all .2s', fontFamily:'inherit', fontSize:'.72rem' }}>→</button>
          </div>
        </div>
      )}

      {selected && (
        <MemberDetailDrawer memberId={selected} onClose={() => setSelected(null)} onUpdated={fetchMembers} />
      )}
    </div>
  );
}

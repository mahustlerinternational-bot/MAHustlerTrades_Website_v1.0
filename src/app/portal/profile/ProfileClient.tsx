'use client';
// src/app/portal/profile/ProfileClient.tsx
import { useState }              from 'react';
import { useForm }               from 'react-hook-form';
import { zodResolver }           from '@hookform/resolvers/zod';
import { z }                     from 'zod';
import { toast }                 from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthStore }          from '@/lib/auth/store';
import Link                      from 'next/link';

const schema = z.object({ full_name: z.string().min(2, 'At least 2 characters') });
type FormData = z.infer<typeof schema>;

const ROLE_INFO: Record<string,{label:string;color:string;bg:string;border:string}> = {
  admin:     { label:'Administrator',   color:'#A78BFA', bg:'rgba(167,139,250,.08)', border:'rgba(167,139,250,.25)' },
  member:    { label:'Member',          color:'#D4AF37', bg:'rgba(212,175,55,.08)',  border:'rgba(212,175,55,.25)'  },
  ib_member: { label:'IB Elite Member', color:'#60A5FA', bg:'rgba(96,165,250,.08)',  border:'rgba(96,165,250,.25)'  },
};
const IB_INFO: Record<string,{label:string;color:string;desc:string}> = {
  none:     { label:'Not Applied',  color:'#555',    desc:'Apply for free Elite access via IB registration.' },
  pending:  { label:'Under Review', color:'#F59E0B', desc:'Your application is being reviewed (24–48 hrs).' },
  active:   { label:'IB Active ✓',  color:'#34D399', desc:'Your IB Elite access is fully active.' },
  rejected: { label:'Not Approved', color:'#FF4757', desc:'Application not approved. Contact support.' },
};

const iS: React.CSSProperties = { width:'100%', background:'#0A0A0A', border:'1px solid rgba(255,255,255,.08)', color:'#fff', fontSize:'.78rem', padding:'10px 12px', outline:'none', fontFamily:'inherit', transition:'border-color .3s', boxSizing:'border-box' };
const lblS: React.CSSProperties = { display:'block', fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', color:'#666', marginBottom:'6px' };

export default function ProfileClient() {
  const supabase = createClientComponentClient();
  const { user, setUser } = useAuthStore();
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading] = useState(false);
  const [newPw,    setNewPw]    = useState('');
  const [changingPw,setChangingPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: user?.full_name ?? '' },
  });

  async function onSave(values: FormData) {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: values.full_name }).eq('id', user.id);
      if (error) { toast.error(error.message); return; }
      setUser({ ...user, full_name: values.full_name });
      toast.success('Profile updated');
    } finally { setSaving(false); }
  }

  async function onChangePw() {
    if (newPw.length < 8) { toast.error('Minimum 8 characters'); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { toast.error(error.message); return; }
      setNewPw('');
      toast.success('Password updated');
    } finally { setChangingPw(false); }
  }

  async function onUploadAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) { toast.error('Upload failed: ' + upErr.message); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      setUser({ ...user, avatar_url: data.publicUrl });
      toast.success('Avatar updated');
    } finally { setUploading(false); }
  }

  if (!user) return <div style={{ padding:'2rem', color:'#888', fontFamily:'Montserrat,sans-serif' }}>Loading...</div>;

  const roleInfo = ROLE_INFO[user.role] ?? ROLE_INFO.member;
  const ibInfo   = IB_INFO[user.ib_status] ?? IB_INFO.none;
  const pkg      = (user as any)?.package;

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:'2rem', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Account</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>My Profile</h1>
      </div>

      <div style={{ maxWidth:'680px', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

        {/* Avatar + Role card */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
            {/* Avatar with upload */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:'linear-gradient(135deg,#B8860B,#D4AF37)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Cinzel,serif', fontSize:'1.5rem', fontWeight:700, color:'#000', overflow:'hidden', border:'2px solid rgba(212,175,55,.3)' }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <label style={{ position:'absolute', bottom:'-2px', right:'-2px', width:'24px', height:'24px', background:'#1E1E1E', border:'1px solid rgba(212,175,55,.3)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'12px', transition:'border-color .2s' }}
                title="Change avatar"
                onMouseEnter={e => (e.currentTarget.style.borderColor='#D4AF37')}
                onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.3)')}>
                {uploading
                  ? <div style={{ width:'10px', height:'10px', border:'1.5px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                  : '📷'}
                <input type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && onUploadAvatar(e.target.files[0])} />
              </label>
            </div>

            {/* Info */}
            <div style={{ flex:1 }}>
              <h2 style={{ fontFamily:'Cinzel,serif', fontSize:'1.25rem', fontWeight:700, marginBottom:'8px' }}>{user.full_name ?? 'Member'}</h2>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 9px', border:`1px solid ${roleInfo.border}`, color:roleInfo.color, background:roleInfo.bg }}>
                  {roleInfo.label}
                </span>
                {pkg && (
                  <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 9px', border:'1px solid rgba(255,255,255,.1)', color:'#888' }}>
                    {pkg.name} Plan
                  </span>
                )}
                {user.ib_status === 'active' && (
                  <span style={{ fontSize:'.6rem', letterSpacing:'2px', textTransform:'uppercase', padding:'3px 9px', border:'1px solid rgba(52,211,153,.3)', color:'#34D399', background:'rgba(52,211,153,.08)' }}>
                    IB Elite ✓
                  </span>
                )}
              </div>
              <p style={{ fontSize:'.62rem', color:'#444', marginTop:'8px', fontFamily:'JetBrains Mono,monospace' }}>
                ID: {user.id.slice(0,16)}…
              </p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem', animation:'fadeUp .5s .14s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1.25rem' }}>
            <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Profile Details</p>
          </div>
          <form onSubmit={handleSubmit(onSave)} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div>
              <label style={lblS}>Full Name</label>
              <input {...register('full_name')} placeholder="Your full name" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
              {errors.full_name && <p style={{ fontSize:'.65rem', color:'#FF4757', marginTop:'4px' }}>{errors.full_name.message}</p>}
            </div>
            <div>
              <button type="submit" disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg,#B8860B,#D4AF37)', color:'#000', border:'none', padding:'10px 24px', fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer', opacity:saving?.6:1, transition:'opacity .2s' }}>
                {saving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Security */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem', animation:'fadeUp .5s .2s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1.25rem' }}>
            <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#60A5FA,#2563EB)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Security</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div>
              <label style={lblS}>New Password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" style={iS}
                onFocus={e => (e.currentTarget.style.borderColor='rgba(212,175,55,.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor='rgba(255,255,255,.08)')} />
            </div>
            <button onClick={onChangePw} disabled={changingPw || newPw.length < 8}
              style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'none', border:'1px solid rgba(255,255,255,.1)', color:'#888', padding:'9px 20px', fontSize:'.72rem', cursor: newPw.length >= 8 ? 'pointer' : 'not-allowed', fontFamily:'inherit', opacity: newPw.length < 8 ? .4 : 1, transition:'all .2s', alignSelf:'flex-start' }}
              onMouseEnter={e => { if (newPw.length >= 8) { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(212,175,55,.3)'; (e.currentTarget as HTMLButtonElement).style.color='#D4AF37'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.1)'; (e.currentTarget as HTMLButtonElement).style.color='#888'; }}>
              {changingPw ? '⏳ Updating...' : '🔒 Update Password'}
            </button>
          </div>
        </div>

        {/* Membership status */}
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'1.5rem', animation:'fadeUp .5s .26s ease forwards', opacity:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'1.25rem' }}>
            <div style={{ width:'3px', height:'16px', background:'linear-gradient(180deg,#A78BFA,#7C3AED)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Membership Status</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {/* Package card */}
            <div style={{ background:'#0A0A0A', border:'1px solid rgba(255,255,255,.06)', padding:'1rem' }}>
              <p style={{ fontSize:'.58rem', letterSpacing:'2px', textTransform:'uppercase', color:'#555', marginBottom:'8px' }}>💎 Package</p>
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'1rem', fontWeight:700, color: pkg ? '#D4AF37' : '#555', marginBottom:'6px' }}>
                {pkg?.name ?? 'None Active'}
              </p>
              <Link href="/portal/packages" style={{ fontSize:'.68rem', color:'#D4AF37', textDecoration:'none', transition:'opacity .2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity='.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
                {pkg ? 'Change Plan →' : 'Choose a Plan →'}
              </Link>
            </div>

            {/* IB status card */}
            <div style={{ background:'#0A0A0A', border:'1px solid rgba(255,255,255,.06)', padding:'1rem' }}>
              <p style={{ fontSize:'.58rem', letterSpacing:'2px', textTransform:'uppercase', color:'#555', marginBottom:'8px' }}>🔗 IB Status</p>
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.95rem', fontWeight:700, color:ibInfo.color, marginBottom:'4px' }}>{ibInfo.label}</p>
              <p style={{ fontSize:'.68rem', color:'#555', lineHeight:1.5, marginBottom:'6px' }}>{ibInfo.desc}</p>
              {user.ib_status === 'none' && (
                <Link href="/portal/ib" style={{ fontSize:'.68rem', color:'#D4AF37', textDecoration:'none' }}>Apply for IB Access →</Link>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

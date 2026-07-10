// src/app/portal/ib/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import IBRegistrationWizard from '@/components/portal/ib/IBRegistrationWizard';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [settingsRes, ibRes] = await Promise.all([
      supabaseAdmin.from('site_settings').select('value').eq('key', 'ib_guide').maybeSingle(),
      supabaseAdmin.from('ib_registrations').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    return { guide: settingsRes.data?.value ?? {}, existing: ibRes.data ?? null };
  } catch { return { guide: {}, existing: null }; }
}

const DEFAULT_GUIDE = {
  broker_name: 'IC Markets', referral_link: 'https://icmarkets.com/?camp=MAHUSTLER',
  min_deposit: 500,
  steps: [
    { title: 'Create Your Broker Account', body: 'Open a live trading account with our approved broker partner using your exclusive referral link.' },
    { title: 'Fund Your Account', body: 'Deposit the minimum required amount ($500+) to activate your trading account and qualify for IB membership.' },
    { title: 'Submit Your Details', body: 'Enter your broker name and account number. Our team will verify your account within 24-48 hours.' },
    { title: 'Access Granted', body: 'Once approved, you receive full Elite membership access at no monthly cost, as long as your account remains active.' },
  ],
};

export default async function IBPortalPage() {
  let session = null;
  try { const sb = createSupabaseServerClient(); const { data } = await sb.auth.getSession(); session = data.session; } catch {}
  if (!session?.user) return <div style={{padding:'2rem',color:'#888',fontFamily:'Montserrat,sans-serif'}}>Please <a href="/portal" style={{color:'#D4AF37'}}>sign in</a>.</div>;

  const { guide, existing } = await getData(session.user.id);
  const mergedGuide = { ...DEFAULT_GUIDE, ...(guide as object) };

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom:'2.5rem', maxWidth:'680px', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Alternative Access</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900, marginBottom:'10px' }}>IB Elite Registration</h1>
        <p style={{ fontSize:'.82rem', color:'#888', lineHeight:1.75, fontWeight:300 }}>
          Get full Elite membership at <strong style={{color:'#D4AF37',fontWeight:600}}>zero monthly cost</strong> by opening a live trading account with our approved broker partner through your dedicated IB referral link.
        </p>
      </div>

      <div style={{ maxWidth:'640px', animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        <div style={{ background:'#111', border:'1px solid rgba(212,175,55,.2)', padding:'2rem' }}>
          <IBRegistrationWizard guide={mergedGuide as any} existing={existing as any} />
        </div>
      </div>
    </div>
  );
}

// src/app/portal/ib/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import IBRegistrationWizard from '@/components/portal/ib/IBRegistrationWizard';
import { loadIntegrationSettings } from '@/lib/integrations/settings';
import { provisionCommunityInvites } from '@/lib/community/invites';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [settingsRes, brokersRes, ibRes, inviteRes,accountsRes,integrationSettings] = await Promise.all([
      supabaseAdmin.from('site_settings').select('value').eq('key', 'ib_guide').maybeSingle(),
      supabaseAdmin.from('site_settings').select('value').eq('key', 'ib_brokers').maybeSingle(),
      supabaseAdmin.from('ib_registrations').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('community_invites').select('platform,invite_url,expires_at,status').eq('user_id',userId).eq('status','active'),
      supabaseAdmin.from('member_community_accounts').select('platform,username,display_name,email_masked,email_matches_account,verified_at').eq('user_id',userId),
      loadIntegrationSettings(),
    ]);
    let communityInvites=inviteRes.data??[];
    const expired=communityInvites.some(invite=>invite.expires_at&&new Date(invite.expires_at).getTime()<=Date.now());
    const missingTelegram=integrationSettings.telegram.enabled&&!communityInvites.some(invite=>invite.platform==='telegram');
    const missingDiscord=integrationSettings.discord.enabled&&!communityInvites.some(invite=>invite.platform==='discord');
    if(ibRes.data?.status==='approved'&&(expired||communityInvites.length===0||missingTelegram||missingDiscord))communityInvites=await provisionCommunityInvites(userId);
    return { guide: settingsRes.data?.value ?? {}, brokers: brokersRes.data?.value ?? [], existing: ibRes.data ?? null, communityInvites,communityAccounts:accountsRes.data??[],linking:{telegram:Boolean(integrationSettings.telegram.enabled&&integrationSettings.telegram.bot_token&&integrationSettings.telegram.inbound_enabled),discord:Boolean(integrationSettings.discord.oauth_enabled&&integrationSettings.discord.client_id&&integrationSettings.discord.client_secret)} };
  } catch { return { guide: {}, brokers: [], existing: null, communityInvites:[],communityAccounts:[],linking:{telegram:false,discord:false} }; }
}

const ELITE_FUNDING_COPY =
  'Deposit the minimum required amount ($100+) to activate your trading account and qualify for Elite Membership';

const LEGACY_FUNDING_COPY = new Set([
  'Deposit the minimum required amount ($500+) to activate your trading account and qualify for Elite membership.',
  'Deposit the minimum required amount ($500+) to activate your trading account and qualify for IB membership.',
]);

const DEFAULT_GUIDE = {
  broker_name: 'IC Markets', referral_link: 'https://icmarkets.com/?camp=MAHUSTLER',
  min_deposit: 500,
  steps: [
    { title: 'Create Your Broker Account', body: 'Open a live trading account with our approved broker partner using your exclusive referral link.' },
    { title: 'Fund Your Account', body: ELITE_FUNDING_COPY },
    { title: 'Submit Your Details', body: 'Enter your broker name and account number. Our team will verify your account within 24-48 hours.' },
    { title: 'Access Granted', body: 'Once approved, you receive full Elite membership access at no monthly cost, as long as your account remains active.' },
  ],
};

export default async function IBPortalPage() {
  let user = null;
  try { const sb = await createSupabaseServerClient(); const { data } = await sb.auth.getUser(); user = data.user; } catch {}
  if (!user) return <div style={{padding:'2rem',color:'#888',fontFamily:'Montserrat,sans-serif'}}>Please <a href="/portal" style={{color:'#D4AF37'}}>sign in</a>.</div>;

  const { guide, brokers, existing, communityInvites,communityAccounts,linking } = await getData(user.id);
  const storedGuide = guide as Partial<typeof DEFAULT_GUIDE>;
  const storedSteps = Array.isArray(storedGuide.steps) ? storedGuide.steps : DEFAULT_GUIDE.steps;
  const mergedGuide = {
    ...DEFAULT_GUIDE,
    ...storedGuide,
    steps: storedSteps.map((step, index) =>
      index === 1 && LEGACY_FUNDING_COPY.has(step.body)
        ? {...step, body: ELITE_FUNDING_COPY}
        : step,
    ),
  };

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom:'2.5rem', maxWidth:'680px', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Alternative Access</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900, marginBottom:'10px' }}>Elite Access Registration</h1>
        <p style={{ fontSize:'.82rem', color:'#888', lineHeight:1.75, fontWeight:300 }}>
          Get full Elite membership at <strong style={{color:'#D4AF37',fontWeight:600}}>zero monthly cost</strong> by opening a live trading account with our approved broker partner through your dedicated referral link.
        </p>
      </div>

      <div style={{ maxWidth:'640px', animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        <div style={{ background:'#111', border:'1px solid rgba(212,175,55,.2)', padding:'2rem' }}>
          <IBRegistrationWizard guide={mergedGuide as any} brokers={Array.isArray(brokers) ? brokers as any : []} existing={existing as any} communityInvites={communityInvites as any} communityAccounts={communityAccounts as any} linking={linking} />
        </div>
      </div>
    </div>
  );
}

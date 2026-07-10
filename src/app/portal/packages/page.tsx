// src/app/portal/packages/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import PackageCards from '@/components/portal/packages/PackageCards';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [pkgRes, profileRes] = await Promise.all([
      supabaseAdmin.from('packages').select('*, features:package_features(*)').eq('is_active', true).order('sort_order'),
      supabaseAdmin.from('profiles').select('package_id').eq('id', userId).single(),
    ]);
    return { packages: pkgRes.data ?? [], currentPackageId: profileRes.data?.package_id ?? null };
  } catch { return { packages: [], currentPackageId: null }; }
}

export default async function PackagesPage() {
  let session = null;
  try { const sb = createSupabaseServerClient(); const { data } = await sb.auth.getSession(); session = data.session; } catch {}
  if (!session?.user) return <div style={{padding:'2rem',color:'#888',fontFamily:'Montserrat,sans-serif'}}>Please <a href="/portal" style={{color:'#D4AF37'}}>sign in</a>.</div>;

  const { packages, currentPackageId } = await getData(session.user.id);

  return (
    <div style={{ padding:'2.5rem', minHeight:'100vh', background:'#0A0A0A', fontFamily:'Montserrat,sans-serif', color:'#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ marginBottom:'2.5rem', animation:'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Membership</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>Choose Your Package</h1>
        <p style={{ fontSize:'.78rem', color:'#555', marginTop:'8px', maxWidth:'500px', lineHeight:1.7 }}>
          Unlock premium access to AI signals, live trading rooms, exclusive courses, and VIP events. Upgrade or change your plan at any time.
        </p>
      </div>

      <div style={{ animation:'fadeUp .5s .1s ease forwards', opacity:0 }}>
        <PackageCards packages={packages as any} currentPackageId={currentPackageId} />
      </div>
    </div>
  );
}

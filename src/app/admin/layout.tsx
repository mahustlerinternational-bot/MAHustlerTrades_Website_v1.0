// src/app/admin/layout.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import AdminNav     from '@/components/admin/layout/AdminNav';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Panel — MAHustler Trades',
  robots: 'noindex,nofollow',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: never render admin HTML until Supabase has verified both
  // the session and the admin role. API routes independently repeat this check.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal?tab=login&returnTo=/admin/dashboard');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/portal/dashboard');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <AdminSidebar />
      <div style={{ flex: 1, marginLeft: '256px', display: 'flex', flexDirection: 'column' }}>
        <AdminNav />
        <main style={{ flex: 1, paddingTop: '64px', background: '#0A0A0A' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

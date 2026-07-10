// src/app/admin/layout.tsx
import type { Metadata } from 'next';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import AdminNav     from '@/components/admin/layout/AdminNav';

export const metadata: Metadata = {
  title: 'Admin Panel — MAHustler Trades',
  robots: 'noindex,nofollow',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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

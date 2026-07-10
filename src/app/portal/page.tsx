// src/app/portal/page.tsx
// This page intentionally redirects /portal → /portal/dashboard
// The PortalAuthGate in the layout handles authentication.
// If not logged in → shows AuthModal. If logged in → goes to dashboard.
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PortalRootPage() {
  redirect('/portal/dashboard');
}

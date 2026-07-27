// src/app/portal/layout.tsx
import type { Metadata } from 'next';
import PortalNav      from '@/components/portal/layout/PortalNav';
import PortalSidebar  from '@/components/portal/layout/PortalSidebar';
import PortalAuthGate from '@/components/portal/layout/PortalAuthGate';
import AssistantWidget from '@/components/portal/support/AssistantWidget';
import AssistantErrorBoundary from '@/components/portal/support/AssistantErrorBoundary';
import PortalThemeProvider from '@/components/theme/PortalThemeProvider';

export const metadata: Metadata = {
  title: 'Members Portal — MAHustler Trades',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGate>
      <PortalThemeProvider>
        {/* Top navigation bar */}
        <PortalNav />
        {/* Body: sidebar + main content */}
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A', paddingTop: '72px' }}>
          <PortalSidebar />
          <main style={{ flex: 1, minHeight: '100vh', marginLeft: '224px', background: '#0A0A0A' }}>
            {children}
          </main>
          <AssistantErrorBoundary><AssistantWidget /></AssistantErrorBoundary>
        </div>
      </PortalThemeProvider>
    </PortalAuthGate>
  );
}

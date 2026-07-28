// src/app/portal/layout.tsx
import type { Metadata } from 'next';
import PortalNav      from '@/components/portal/layout/PortalNav';
import PortalSidebar  from '@/components/portal/layout/PortalSidebar';
import PortalAuthGate from '@/components/portal/layout/PortalAuthGate';
import AssistantWidget from '@/components/portal/support/AssistantWidget';
import AssistantErrorBoundary from '@/components/portal/support/AssistantErrorBoundary';
import PortalThemeProvider from '@/components/theme/PortalThemeProvider';
import styles from './PortalLayout.module.css';

export const metadata: Metadata = {
  title: 'Members Portal — MAHustler Trades',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGate>
      <PortalThemeProvider>
        <PortalNav />
        <div className={styles.body}>
          <PortalSidebar />
          <main className={styles.main}>
            {children}
          </main>
          <AssistantErrorBoundary><AssistantWidget /></AssistantErrorBoundary>
        </div>
      </PortalThemeProvider>
    </PortalAuthGate>
  );
}

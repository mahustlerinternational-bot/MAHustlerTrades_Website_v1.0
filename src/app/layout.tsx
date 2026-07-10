// src/app/layout.tsx
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';


export const viewport = {
  themeColor: '#D4AF37',
};

export const metadata: Metadata = {
  title:       'MAHustler Trades — Elite Trading Education',
  description: 'Institutional-grade trading education, AI-powered signals, and an exclusive community for serious traders.',
  keywords:    'trading, forex, crypto, academy, signals, smart money',
  openGraph: {
    title:       'MAHustler Trades',
    description: 'Institutional-grade trading education and AI-powered signals.',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts via CDN link tag (works in any environment) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Montserrat:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Tabler Icons */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.14.0/tabler-icons.min.css"
        />
      </head>
      <body className="bg-[#0A0A0A] text-white antialiased" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:  '#1E1E1E',
              border:      '1px solid rgba(212,175,55,0.2)',
              color:       '#fff',
              fontFamily:  "'Montserrat', sans-serif",
              fontSize:    '13px',
            },
          }}
        />
      </body>
    </html>
  );
}

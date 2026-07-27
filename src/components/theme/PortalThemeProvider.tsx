'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

export type PortalTheme = 'dark' | 'light';

type PortalThemeContextValue = {
  theme: PortalTheme;
  setTheme: (theme: PortalTheme) => void;
  toggleTheme: () => void;
  ready: boolean;
};

const STORAGE_KEY = 'maht:portal-theme';
const PortalThemeContext = createContext<PortalThemeContextValue | null>(null);

function storedTheme(): PortalTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export default function PortalThemeProvider({children}: {children: React.ReactNode}) {
  const [theme, setThemeState] = useState<PortalTheme>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(storedTheme());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.dataset.mahtPortalTheme = theme;
    return () => {
      delete document.documentElement.dataset.mahtPortalTheme;
    };
  }, [ready, theme]);

  const setTheme = useCallback((nextTheme: PortalTheme) => setThemeState(nextTheme), []);
  const toggleTheme = useCallback(() => {
    setThemeState(current => current === 'dark' ? 'light' : 'dark');
  }, []);
  const value = useMemo(
    () => ({theme, setTheme, toggleTheme, ready}),
    [ready, setTheme, theme, toggleTheme],
  );

  return (
    <PortalThemeContext.Provider value={value}>
      <div
        className="portal-theme-root"
        data-portal-theme={theme}
        suppressHydrationWarning
        style={{minHeight: '100vh'}}
      >
        {children}
      </div>
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme() {
  const context = useContext(PortalThemeContext);
  if (!context) throw new Error('usePortalTheme must be used inside PortalThemeProvider');
  return context;
}

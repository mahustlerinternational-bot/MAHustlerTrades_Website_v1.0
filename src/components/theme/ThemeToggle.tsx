'use client';

import {Moon, Sun} from 'lucide-react';

import {usePortalTheme} from './PortalThemeProvider';

export default function ThemeToggle({compact = false}: {compact?: boolean}) {
  const {theme, toggleTheme, ready} = usePortalTheme();
  const light = theme === 'light';
  const next = light ? 'dark' : 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!ready}
      className="portal-theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      aria-pressed={light}
    >
      <span className="portal-theme-toggle-track" aria-hidden="true">
        <span className="portal-theme-toggle-thumb">
          {light ? <Sun size={12} /> : <Moon size={12} />}
        </span>
      </span>
      {!compact && <span className="portal-theme-toggle-label">{light ? 'Light' : 'Dark'}</span>}
    </button>
  );
}

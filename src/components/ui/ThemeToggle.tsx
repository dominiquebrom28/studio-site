import { useEffect, useState } from 'react';
import { applyTheme, getCurrentTheme, type Theme } from '@/lib/theme';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

function InkwellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 9h12l-1.2 9.5a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9L6 9Z" />
      <path d="M4.5 9h15M9 6h6l-.6-2H9.6L9 6Z" />
      <path d="M12 12v4" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-hairline text-ink transition-colors hover:bg-paper-raised"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <InkwellIcon /> : <SunIcon />}
    </button>
  );
}

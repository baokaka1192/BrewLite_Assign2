'use client';
import { useEffect, useState } from 'react';
import { applyTheme, currentTheme, writeStoredTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** Sun/moon button that flips the warm light and dark palettes. Icon renders only after mount to avoid hydration mismatch. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => setTheme(currentTheme()), []);

  const toggle = () => {
    if (!theme) return;
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    writeStoredTheme(next);
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const label = theme === null ? 'Toggle color theme' : isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={theme === null}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors duration-200 hover:text-accent-text disabled:opacity-60 md:h-9 md:w-9',
        className,
      )}
    >
      {theme !== null && (
        <>
          <SunIcon
            className={cn(
              'absolute h-[18px] w-[18px] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0',
            )}
          />
          <MoonIcon
            className={cn(
              'absolute h-[18px] w-[18px] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
              isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100',
            )}
          />
        </>
      )}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'carbon-acx-theme';

const prefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (err) {
    console.warn('carbon-acx: unable to read prefers-color-scheme', err);
    return false;
  }
};

const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('color-scheme', theme);
};

const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return prefersDark() ? 'dark' : 'light';
};

// Apply theme immediately on load to prevent flash
if (typeof document !== 'undefined') {
  applyTheme(resolveInitialTheme());
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: MediaQueryListEvent) => {
      setMode((prev) => {
        const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
        if (stored === 'light' || stored === 'dark') {
          return stored;
        }
        return event.matches ? 'dark' : 'light';
      });
    };

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const toggle = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = mode === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
      onClick={toggle}
      aria-pressed={mode === 'dark'}
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5 text-text-secondary" />
    </button>
  );
}

export default ThemeToggle;

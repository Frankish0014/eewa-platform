import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const LEGACY_STORAGE_KEY = 'eewa_theme';

export type ThemePreference = 'light' | 'dark';

function themeKeyForUser(userId: string | null): string {
  return `eewa_theme:${userId ?? 'guest'}`;
}

function readStoredTheme(userId: string | null): ThemePreference {
  try {
    const key = themeKeyForUser(userId);
    const s = localStorage.getItem(key);
    if (s === 'dark' || s === 'light') return s;
    // Old builds used a single key for everyone — only migrate that into the logged-out slot so
    // each signed-in account keeps its own preference without inheriting one global choice.
    if (userId === null) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy === 'dark' || legacy === 'light') {
        localStorage.setItem(key, legacy);
        return legacy;
      }
    }
  } catch {
    /* ignore */
  }
  return 'light';
}

function applyDataTheme(theme: ThemePreference) {
  document.documentElement.setAttribute('data-theme', theme);
}

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.userId ?? null;

  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredTheme(null));

  // Load the correct slot when we know who is signed in (each account has its own preference).
  useEffect(() => {
    if (loading) return;
    const next = readStoredTheme(userId);
    setThemeState(next);
    applyDataTheme(next);
  }, [loading, userId]);

  useEffect(() => {
    applyDataTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (t: ThemePreference) => {
      setThemeState(t);
      if (loading) return;
      try {
        localStorage.setItem(themeKeyForUser(userId), t);
      } catch {
        /* ignore */
      }
    },
    [loading, userId],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

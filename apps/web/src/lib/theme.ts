import { useEffect, useState } from 'react';

// The app areas follow the device unless the person chose otherwise. The
// choice is kept in this browser under the user's id, so two people sharing
// a phone each keep their own. The forest pages ignore all of this: they put
// `dark` on their own root and are always night.

export type Theme = 'light' | 'dark' | 'system';
export const THEMES: Theme[] = ['system', 'light', 'dark'];

const key = (userId: string) => `theme:${userId}`;
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readTheme(userId: string): Theme {
  try {
    const saved = localStorage.getItem(key(userId));
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

const resolveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'dark' || (theme === 'system' && darkQuery().matches)
    ? 'dark'
    : 'light';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle(
    'dark',
    resolveTheme(theme) === 'dark',
  );
}

// Applies the user's theme to <html> while the area is mounted and keeps it in
// step with the device when it is on "system". Returns the choice, what it
// resolves to right now, and a setter.
export function useTheme(userId: string) {
  const [theme, setThemeState] = useState<Theme>(() => readTheme(userId));

  useEffect(() => {
    applyTheme(theme);
    const query = darkQuery();
    const onChange = () => theme === 'system' && applyTheme(theme);
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
      document.documentElement.classList.remove('dark');
    };
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(key(userId), next);
    } catch {
      // storage unavailable: the choice lasts for this page load only
    }
  };

  return { theme, resolved: resolveTheme(theme), setTheme };
}

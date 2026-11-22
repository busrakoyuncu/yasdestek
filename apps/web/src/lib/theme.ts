import { useEffect, useState } from 'react';

// The app areas are night by default, like the forest pages before them.
// The user menu offers light and "follow the device" as well; the choice is
// kept in this browser under the user's id, so two people sharing a phone
// each keep their own. The forest pages ignore all of this: they put `dark`
// on their own root and are always night.

export type Theme = 'light' | 'dark' | 'system';
export const THEMES: Theme[] = ['dark', 'light', 'system'];

const key = (userId: string) => `theme:${userId}`;
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readTheme(userId: string): Theme {
  try {
    const saved = localStorage.getItem(key(userId));
    return saved === 'light' || saved === 'system' ? saved : 'dark';
  } catch {
    return 'dark';
  }
}

const resolveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'dark' || (theme === 'system' && darkQuery().matches)
    ? 'dark'
    : 'light';

// The browser and installed-app top bar, in the page background colour.
const barColor = { dark: '#0B1530', light: '#F3F2EC' };
const setBar = (mode: 'light' | 'dark') =>
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', barColor[mode]);

function applyTheme(theme: Theme) {
  const mode = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', mode === 'dark');
  setBar(mode);
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
      setBar('dark');
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

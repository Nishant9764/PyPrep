import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'pyprep-theme';

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

export function applyTheme(t: ThemeChoice): void {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  try {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event('pyprep-theme'));
}

export function isDarkNow(): boolean {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit) return explicit === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useDark(): boolean {
  const [dark, setDark] = useState(isDarkNow);
  useEffect(() => {
    const update = () => setDark(isDarkNow());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    window.addEventListener('pyprep-theme', update);
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('pyprep-theme', update);
      mq.removeEventListener('change', update);
    };
  }, []);
  return dark;
}

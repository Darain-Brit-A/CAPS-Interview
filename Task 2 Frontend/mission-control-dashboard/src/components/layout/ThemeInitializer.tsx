import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeInitializer() {
  const { theme, getEffectiveTheme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = getEffectiveTheme();

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, getEffectiveTheme]);

  return null;
}

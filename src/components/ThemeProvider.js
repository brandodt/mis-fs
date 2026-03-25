'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';

export function ThemeProvider({ children }) {
  const { isDarkMode, isLoaded } = useTheme();
  const setIsDarkMode = useAppStore((s) => s.setIsDarkMode);

  useEffect(() => {
    if (isLoaded) {
      setIsDarkMode(isDarkMode);
    }
  }, [isDarkMode, isLoaded, setIsDarkMode]);

  if (!isLoaded) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

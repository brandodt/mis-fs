import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mis-fs-dark-mode');
    if (saved) {
      setIsDarkMode(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  // Update localStorage and HTML element when theme changes
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem('mis-fs-dark-mode', JSON.stringify(isDarkMode));

    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDarkMode, isLoaded]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return { isDarkMode, toggleTheme, isLoaded };
}

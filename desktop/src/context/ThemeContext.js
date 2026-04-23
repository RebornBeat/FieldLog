import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  // Sync on load from config
  useEffect(() => {
    const el = window.electronAPI;
    if (el) {
      el.getConfig().then(cfg => {
        const t = cfg?.theme || 'dark';
        setTheme(t);
        applyTheme(t);
      }).catch(() => {});
    }
  }, []);

  const applyTheme = (t) => {
    document.body.classList.toggle('theme-light', t === 'light');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    if (window.electronAPI) window.electronAPI.saveConfig({ theme: next }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

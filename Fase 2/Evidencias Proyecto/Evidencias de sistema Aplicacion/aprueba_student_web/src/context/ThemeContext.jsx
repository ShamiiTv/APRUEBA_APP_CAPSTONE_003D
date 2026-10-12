import { useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';
import { ThemeContext } from './themeContext';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') === 'en' ? 'en' : 'es');
  const applyPreferences = useCallback(profile => {
    if (['light','dark'].includes(profile.theme)) setTheme(profile.theme);
    if (['es','en'].includes(profile.locale)) setLang(profile.locale);
  },[]);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const t = translations[lang] || translations.es;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, lang, setLang, t, applyPreferences }}>
      {children}
    </ThemeContext.Provider>
  );
}

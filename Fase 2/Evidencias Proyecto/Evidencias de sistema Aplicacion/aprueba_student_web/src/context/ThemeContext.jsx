import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { translations } from '../i18n/translations';
import { ThemeContext } from './themeContext';
import {paintTheme} from './themeMotion';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') === 'en' ? 'en' : 'es');
  const animateRef=useRef(false),profileLoaded=useRef(false),originRef=useRef(null);
  const prepareThemeChange=event=>{
    const rect=event?.currentTarget?.getBoundingClientRect();
    originRef.current=rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;
  };
  const applyPreferences = useCallback(profile => {
    if (['light','dark'].includes(profile.theme)){animateRef.current=profileLoaded.current;setTheme(profile.theme);}
    profileLoaded.current=true;
    if (['es','en'].includes(profile.locale)) setLang(profile.locale);
  },[]);

  useLayoutEffect(() => {
    paintTheme(theme,{animate:animateRef.current,origin:originRef.current});
    animateRef.current=false;originRef.current=null;
  },[theme]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleTheme = event => {
    prepareThemeChange(event);animateRef.current=true;
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const t = translations[lang] || translations.es;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, lang, setLang, t, applyPreferences, prepareThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}

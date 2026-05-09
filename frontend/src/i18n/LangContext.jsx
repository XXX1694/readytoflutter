import { createContext, useContext, useEffect, useState } from 'react';

const LangContext = createContext({ lang: 'en', setLang: () => {} });

// Hydrate <html lang> synchronously on module load so screen-readers and
// crawlers see the right language tag before React mounts. Writing it again
// inside an effect keeps it in sync after every toggle.
const initialLang = typeof window !== 'undefined' ? localStorage.getItem('lang') || 'en' : 'en';
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

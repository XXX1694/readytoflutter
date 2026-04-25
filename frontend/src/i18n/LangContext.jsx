import { createContext, useContext, useState } from 'react';

const LangContext = createContext({ lang: 'en', setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

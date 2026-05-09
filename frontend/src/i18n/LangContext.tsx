import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ru';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: 'en', setLang: () => {} });

// Hydrate <html lang> synchronously on module load so screen-readers and
// crawlers see the right language tag before React mounts. Writing it again
// inside an effect keeps it in sync after every toggle.
const initialLang: Lang = (() => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('lang');
  return saved === 'ru' ? 'ru' : 'en';
})();
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang): void => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = (): LangContextValue => useContext(LangContext);

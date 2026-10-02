import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { translations } from './translations.ts'
import type { Locale } from './translations.ts'

const STORAGE_KEY = 'locale';

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'sr') return stored;
  } catch {
    // localStorage can throw in some contexts (private browsing, etc.) —
    // just fall back to the default below.
  }
  return 'en';
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  // Looks up a dot-path key (e.g. "header.greeting") in the current
  // language's dictionary and substitutes any {placeholder} tokens from
  // `vars`. Falls back to the key itself (and warns) if it's missing, so a
  // typo shows up loudly instead of silently rendering nothing.
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore — the choice just won't persist across reloads.
    }
  }

  const t = useMemo(() => {
    const dict = translations[locale];
    return (key: string, vars?: Record<string, string | number>) => {
      const parts = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- walking an arbitrary dot-path through the dictionary
      let value: any = dict;
      for (const part of parts) {
        value = value?.[part];
      }
      if (typeof value !== 'string') {
        console.warn(`Missing translation for key "${key}"`);
        return key;
      }
      if (!vars) return value;
      return Object.entries(vars).reduce(
        (str, [varName, varValue]) => str.replaceAll(`{${varName}}`, String(varValue)),
        value
      );
    };
  }, [locale]);

  const api = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, t]);

  return <LocaleContext.Provider value={api}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to LocaleProvider above
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}

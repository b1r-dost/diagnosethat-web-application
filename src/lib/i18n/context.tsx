import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from './translations';

type Translations = typeof translations.en | typeof translations.tr;

interface I18nContextType {
  language: Language;
  t: Translations;
  brandName: string;
  clinicRef: string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Determine language based on domain
    const hostname = window.location.hostname;
    
    if (hostname.includes('taniyorum.net') || hostname.includes('taniyorum')) {
      setLanguageState('tr');
    } else if (hostname.includes('diagnosethat.net') || hostname.includes('diagnosethat')) {
      setLanguageState('en');
    } else {
      // Default: check browser language for local development
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('tr')) {
        setLanguageState('tr');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = translations[language];
  const brandName = t.brand.name;
  const clinicRef = language === 'tr' ? 'TanıYorum' : 'DiagnoseThat';

  return (
    <I18nContext.Provider value={{ language, t, brandName, clinicRef, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t, language } = useI18n();
  return { t, language };
}

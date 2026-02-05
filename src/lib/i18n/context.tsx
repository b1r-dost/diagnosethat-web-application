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

// Helper function to update favicon
function updateFavicon(href: string) {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (link) {
    link.href = href;
  } else {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = href;
    document.head.appendChild(link);
  }
}

// Helper function to update document title and favicon based on language
function updateBranding(lang: Language) {
  const title = lang === 'tr' ? 'TanıYorum' : 'DiagnoseThat';
  const favicon = lang === 'tr' ? '/favicon-tr.svg' : '/favicon-en.svg';
  document.title = title;
  updateFavicon(favicon);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Determine language based on domain
    const hostname = window.location.hostname;
    let detectedLang: Language = 'en';
    
    if (hostname.includes('taniyorum.net') || hostname.includes('taniyorum')) {
      detectedLang = 'tr';
    } else if (hostname.includes('diagnosethat.net') || hostname.includes('diagnosethat')) {
      detectedLang = 'en';
    } else {
      // Default: check browser language for local development
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('tr')) {
        detectedLang = 'tr';
      } else {
        detectedLang = 'en';
      }
    }
    
    setLanguageState(detectedLang);
    updateBranding(detectedLang);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    updateBranding(lang);
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

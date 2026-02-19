'use client';

import React, { createContext, useContext, useState } from 'react';
import { siteConfig } from '../../site.config';
import { translations, Language, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tWith: (key: TranslationKey, params: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initial state from localStorage or default
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('amytis-language') as Language;
      if (savedLang && translations[savedLang]) {
        return savedLang;
      }
      const browserLang = navigator.language.split('-')[0] as Language;
      if (translations[browserLang]) {
        return browserLang;
      }
    }
    return siteConfig.i18n.defaultLocale as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('amytis-language', lang);
  };

  const t = (key: TranslationKey) => {
    return translations[language][key] || key;
  };

  const tWith = (key: TranslationKey, params: Record<string, string | number>) => {
    let result = translations[language][key] || key;
    for (const [name, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tWith }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { siteConfig } from '../../site.config';
import { translations, Language, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  isHydrated: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tWith: (key: TranslationKey, params: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always initialize with site default to match server-side rendering
  const [language, setLanguageState] = useState<Language>(siteConfig.i18n.defaultLocale as Language);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Only access localStorage and browser language after component is mounted (client-side)
    const savedLang = localStorage.getItem('amytis-language') as Language;
    
    // Use requestAnimationFrame to avoid cascading render lint error
    requestAnimationFrame(() => {
      if (savedLang && translations[savedLang]) {
        setLanguageState(savedLang);
      } else {
        const browserLang = navigator.language.split('-')[0] as Language;
        if (translations[browserLang]) {
          setLanguageState(browserLang);
        }
      }
      setIsHydrated(true);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('amytis-language', lang);
  };

  /**
   * Translates a key. 
   * Returns the default locale translation if not hydrated to prevent hydration mismatch.
   */
  const t = (key: TranslationKey) => {
    const activeLang = isHydrated ? language : (siteConfig.i18n.defaultLocale as Language);
    return translations[activeLang][key] || key;
  };

  /**
   * Translates a key with parameters.
   */
  const tWith = (key: TranslationKey, params: Record<string, string | number>) => {
    const activeLang = isHydrated ? language : (siteConfig.i18n.defaultLocale as Language);
    let result = translations[activeLang][key] || key;
    for (const [name, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, isHydrated, setLanguage, t, tWith }}>
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

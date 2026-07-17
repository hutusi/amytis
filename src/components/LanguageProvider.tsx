'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { siteConfig } from '../../site.config';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { buildFeatureOverrides } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  isHydrated: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  tWith: (key: TranslationKey, params: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const isI18nEnabled = siteConfig.i18n.enabled !== false && siteConfig.i18n.locales.length >= 2;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always initialize with site default to match server-side rendering
  const [language, setLanguageState] = useState<Language>(siteConfig.i18n.defaultLocale as Language);
  // When i18n is disabled there is nothing to hydrate — mark as ready immediately
  const [isHydrated, setIsHydrated] = useState(!isI18nEnabled);

  useEffect(() => {
    if (!isI18nEnabled) return;
    // Only access localStorage after mount (client-side). Reads can throw in
    // Safari private mode / when storage is disabled — a failure must fall back
    // to the default locale, never propagate and blank the tree.
    let savedLang: Language | null = null;
    try {
      savedLang = localStorage.getItem('amytis-language') as Language | null;
    } catch {
      savedLang = null;
    }

    // Use requestAnimationFrame to avoid cascading render lint error
    const rafId = requestAnimationFrame(() => {
      if (savedLang && translations[savedLang]) {
        setLanguageState(savedLang);
      }
      setIsHydrated(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const setLanguage = (lang: Language) => {
    if (!isI18nEnabled) return;
    setLanguageState(lang);
    try {
      localStorage.setItem('amytis-language', lang);
    } catch {
      // Preference won't persist across reloads, but the in-memory switch works.
    }
  };

  const activeLang = (isHydrated ? language : siteConfig.i18n.defaultLocale) as Language;

  // Keep <html lang> in sync with the active language for screen readers and
  // translation UAs. The layout renders defaultLocale at SSR and carries
  // suppressHydrationWarning, so updating it on the client is safe.
  useEffect(() => {
    document.documentElement.lang = activeLang;
  }, [activeLang]);

  // Recompute only when the active language changes; siteConfig is static
  const featureOverrides = useMemo(
    () => buildFeatureOverrides(activeLang),
    [activeLang],
  );

  /**
   * Translates a key.
   * Returns the default locale translation if not hydrated to prevent hydration mismatch.
   * Feature name overrides from siteConfig.features.*.name take precedence.
   */
  const t = (key: TranslationKey) => {
    if (key in featureOverrides) return featureOverrides[key]!;
    return translations[activeLang][key] || key;
  };

  /**
   * Translates a key with parameters.
   */
  const tWith = (key: TranslationKey, params: Record<string, string | number>) => {
    let result = (key in featureOverrides ? featureOverrides[key]! : translations[activeLang][key]) || key;
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

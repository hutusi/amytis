'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { siteConfig } from '../../site.config';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { buildFeatureOverrides } from '@/lib/i18n';
import { localeFromPathname } from '@/lib/locale-urls';
import { useRenderedPathname } from '@/hooks/useRenderedPathname';

/**
 * Per-locale switch manifest, computed on the server and passed down through
 * the root layout: each non-default locale maps to the unprefixed-form paths
 * that EXIST in it (content, chrome, pagination); the default locale maps to
 * the default-side paths reachable from any locale page. LanguageSwitch
 * checks the TARGET's entry to decide between "navigate to this page's
 * version there" and "fall back to that locale's home".
 */
export type TwinnedPathManifest = Record<string, string[]>;

interface LanguageContextType {
  language: Language;
  t: (key: TranslationKey) => string;
  tWith: (key: TranslationKey, params: Record<string, string | number>) => string;
  twinnedPaths: TwinnedPathManifest;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const isI18nEnabled = siteConfig.i18n.enabled !== false && siteConfig.i18n.locales.length >= 2;

const LOCALE_CONFIG = {
  locales: isI18nEnabled ? siteConfig.i18n.locales : [],
  defaultLocale: siteConfig.i18n.defaultLocale,
};

/**
 * Language context, derived from the URL. The locale prefix in the pathname
 * (/zh/…) is authoritative, so the server and every client render agree from
 * the first paint — no localStorage, no hydration gate, no post-hydration
 * language swap. The one exception is the exported 404.html, which hosts
 * serve for every unknown URL: it hydrates in the language it was rendered
 * in, then switches to the URL's (see useRenderedPathname). An explicit
 * `locale` prop wins over pathname derivation (used by tests and available
 * to locale-aware layouts).
 */
export function LanguageProvider({
  locale,
  twinnedPaths,
  children,
}: {
  locale?: Language;
  twinnedPaths?: TwinnedPathManifest;
  children: React.ReactNode;
}) {
  // Returns null outside a Next router (unit-test renders) — the helper
  // falls back to the default locale there.
  const pathname = useRenderedPathname();
  const language = (locale ?? localeFromPathname(pathname, LOCALE_CONFIG)) as Language;
  const table = translations[language] ?? translations[LOCALE_CONFIG.defaultLocale as Language] ?? translations.en;

  // Keep <html lang> honest in dev and across client-side navigations; the
  // exported HTML gets its attribute rewritten per locale at build time.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Recompute only when the language changes; siteConfig is static
  const featureOverrides = useMemo(() => buildFeatureOverrides(language), [language]);

  /**
   * Translates a key. Feature name overrides from siteConfig.features.*.name
   * take precedence.
   */
  const t = useCallback((key: TranslationKey) => {
    if (key in featureOverrides) return featureOverrides[key]!;
    return table[key] || key;
  }, [featureOverrides, table]);

  /**
   * Translates a key with parameters.
   */
  const tWith = useCallback((key: TranslationKey, params: Record<string, string | number>) => {
    let result = t(key);
    for (const [name, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
    return result;
  }, [t]);

  const value = useMemo(
    () => ({ language, t, tWith, twinnedPaths: twinnedPaths ?? {} }),
    [language, t, tWith, twinnedPaths],
  );

  return (
    <LanguageContext.Provider value={value}>
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

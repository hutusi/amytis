import { translations, Language } from '@/i18n/translations';
import { siteConfig } from '../../site.config';

/**
 * Server-side translation helper.
 * For client components, use the `useLanguage()` hook instead.
 */
export const t = (key: keyof typeof translations.en) =>
  translations[siteConfig.i18n.defaultLocale as Language]?.[key] || translations.en[key];

export const tWith = (key: keyof typeof translations.en, params: Record<string, string | number>) => {
  let result = t(key);
  Object.entries(params).forEach(([k, v]) => {
    result = result.split(`{${k}}`).join(String(v));
  });
  return result;
};

/**
 * Resolve a locale-aware config value given an explicit language.
 * Shared by both server-side resolveLocale() and client-side components.
 */
export function resolveLocaleValue(value: string | Record<string, string>, lang: string): string {
  if (typeof value === 'string') return value;
  return value[lang] || value.en || Object.values(value)[0] || '';
}

/**
 * Resolve a config value that may be a plain string or a locale map.
 * Uses the default locale from site config (server-side / build-time).
 * e.g. "Hello" or { en: "Hello", zh: "你好" }
 */
export function resolveLocale(value: string | Record<string, string>): string {
  return resolveLocaleValue(value, siteConfig.i18n.defaultLocale);
}

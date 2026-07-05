'use client';

import { useLanguage } from './LanguageProvider';
import { resolveLocaleValue } from '@/lib/i18n';
import type { TranslationKey } from '@/i18n/translations';

/**
 * Client leaf components for translated text inside Server Components.
 *
 * The language toggle is client state, so any component calling
 * useLanguage() directly must be a client component — which historically
 * dragged whole presentational trees (Footer, Hero, PageHeader, …) into the
 * client bundle just to render a few strings. These leaves keep the language
 * reactivity while letting the structural component stay on the server.
 *
 * Each renders a <span> with suppressHydrationWarning: the server emits the
 * default locale and LanguageProvider swaps to the stored locale after
 * hydration, so the swap is concentrated here instead of scattering
 * suppressHydrationWarning across every consumer.
 */

/** One translated string: `t(k)`, or `tWith(k, params)` when params given. */
export function T({
  k,
  params,
}: {
  k: TranslationKey;
  params?: Record<string, string | number>;
}) {
  const { t, tWith } = useLanguage();
  return <span suppressHydrationWarning>{params ? tWith(k, params) : t(k)}</span>;
}

/** A locale-aware config value (`string | Record<locale, string>`). */
export function TLocale({ value }: { value: string | Record<string, string> | undefined }) {
  const { language } = useLanguage();
  if (value === undefined) return null;
  return <span suppressHydrationWarning>{resolveLocaleValue(value, language)}</span>;
}

/**
 * Translate-by-name with fallback: lowercases `name` as a translation key
 * and falls back to the raw name when no translation exists — the label
 * convention used by nav/footer items configured in site.config.ts.
 */
export function TLabel({ name }: { name: string }) {
  const { t } = useLanguage();
  const key = name.toLowerCase() as TranslationKey;
  const translated = t(key);
  return <span suppressHydrationWarning>{translated !== key ? translated : name}</span>;
}

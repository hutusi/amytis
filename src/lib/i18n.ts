import { translations, Language, TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';
import { DEFAULT_CATEGORY } from './content/types';

// ── Feature name overrides ────────────────────────────────────────────────
//
// When a user configures e.g. features.series.name.zh = "专栏", these maps
// tell us which translation keys should reflect that name.

/** Translation keys whose value IS the feature name (simple substitution). */
const FEATURE_SIMPLE_KEYS: Record<string, TranslationKey[]> = {
  series: ['series'],
  books:  ['books', 'book'],
  flow:   ['flow'],
  posts:  ['posts'],
};

/** Translation keys that CONTAIN the feature name as a substring (compound substitution). */
const FEATURE_COMPOUND_KEYS: Record<string, TranslationKey[]> = {
  series: ['curated_series', 'all_series', 'view_full_series'],
  books:  ['all_books', 'selected_books'],
  flow:   ['all_flows', 'recent_notes'],
  posts:  [],
};

function substituteInTranslation(original: string, from: string, to: string): string | null {
  if (original.includes(from)) return original.replaceAll(from, to);
  // Case-insensitive fallback for languages like English
  if (original.toLowerCase().includes(from.toLowerCase())) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return original.replace(new RegExp(escaped, 'gi'), to);
  }
  return null;
}

/**
 * Build a map of translation overrides derived from siteConfig.features.*.name.
 * Called once per language; results are cached below.
 */
export function buildFeatureOverrides(lang: string): Partial<Record<TranslationKey, string>> {
  const overrides: Partial<Record<TranslationKey, string>> = {};
  // A feature name is a plain string (single-language config) or a per-locale map.
  const features = siteConfig.features as Record<string, { name?: string | Record<string, string> } | undefined>;
  const langT = translations[lang as Language] ?? translations.en;

  for (const [featureKey, featureConfig] of Object.entries(features)) {
    if (!featureConfig?.name) continue;
    const { name } = featureConfig;
    const configuredName = typeof name === 'string' ? name : name[lang] ?? name['en'];
    if (!configuredName) continue;

    const simpleKeys = FEATURE_SIMPLE_KEYS[featureKey] ?? [];
    const defaultName = langT[simpleKeys[0]];
    // Skip if no default mapping or name hasn't changed
    if (!defaultName || configuredName === defaultName) continue;

    for (const key of simpleKeys) {
      overrides[key] = configuredName;
    }

    for (const key of (FEATURE_COMPOUND_KEYS[featureKey] ?? [])) {
      const original = langT[key];
      if (!original) continue;
      const substituted = substituteInTranslation(original, defaultName, configuredName);
      if (substituted) overrides[key] = substituted;
    }
  }

  return overrides;
}

// Module-level cache — siteConfig is static so overrides never change
const _overridesCache: Record<string, Partial<Record<TranslationKey, string>>> = {};

function getOverrides(lang: string): Partial<Record<TranslationKey, string>> {
  if (!_overridesCache[lang]) _overridesCache[lang] = buildFeatureOverrides(lang);
  return _overridesCache[lang];
}

export interface Translator {
  t: (key: TranslationKey) => string;
  tWith: (key: TranslationKey, params: Record<string, string | number>) => string;
}

const _translatorCache: Record<string, Translator> = {};

/**
 * Server-side translator for an explicit locale. Route files bind the segment
 * locale; components receive it as a prop. For client components, use the
 * `useLanguage()` hook instead.
 */
export function getTranslator(locale: string): Translator {
  if (_translatorCache[locale]) return _translatorCache[locale];
  const overrides = getOverrides(locale);
  const t = (key: TranslationKey): string => {
    if (key in overrides) return overrides[key]!;
    return translations[locale as Language]?.[key] || translations.en[key];
  };
  const tWith = (key: TranslationKey, params: Record<string, string | number>): string => {
    let result = t(key);
    for (const [k, v] of Object.entries(params)) {
      result = result.split(`{${k}}`).join(String(v));
    }
    return result;
  };
  _translatorCache[locale] = { t, tWith };
  return _translatorCache[locale];
}

/** A post's category as shown: the default category reads in the page's language. */
export function categoryLabel(category: string, locale: string): string {
  return category === DEFAULT_CATEGORY ? getTranslator(locale).t('uncategorized') : category;
}

/**
 * Resolve a locale-aware config value given an explicit language.
 * Shared by server components (via their `locale` prop) and client components.
 */
export function resolveLocaleValue(value: string | Record<string, string>, lang: string): string {
  if (typeof value === 'string') return value;
  return value[lang] || value.en || Object.values(value)[0] || '';
}

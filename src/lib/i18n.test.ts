import { describe, expect, test } from 'bun:test';
import { buildFeatureOverrides, resolveLocale, resolveLocaleValue, t, tWith } from './i18n';
import { translations, TranslationKey, Language } from '@/i18n/translations';
import { siteConfig } from '../../site.config';

const defaultLocale = siteConfig.i18n.defaultLocale;

describe('resolveLocaleValue', () => {
  test('passes plain strings through for any locale', () => {
    expect(resolveLocaleValue('Hello', 'en')).toBe('Hello');
    expect(resolveLocaleValue('Hello', 'zh')).toBe('Hello');
    expect(resolveLocaleValue('Hello', 'nope')).toBe('Hello');
  });

  test('looks up the requested locale in a record', () => {
    const value = { en: 'Hello', zh: '你好' };
    expect(resolveLocaleValue(value, 'en')).toBe('Hello');
    expect(resolveLocaleValue(value, 'zh')).toBe('你好');
  });

  test('falls back to en for an unknown locale', () => {
    expect(resolveLocaleValue({ en: 'Hello', zh: '你好' }, 'fr')).toBe('Hello');
  });

  test('falls back to the first value when en is absent', () => {
    expect(resolveLocaleValue({ zh: '你好' }, 'fr')).toBe('你好');
  });

  test('returns an empty string for an empty record', () => {
    expect(resolveLocaleValue({}, 'en')).toBe('');
  });

  test('an empty string for the requested locale falls through to en', () => {
    expect(resolveLocaleValue({ en: 'Hello', zh: '' }, 'zh')).toBe('Hello');
  });
});

describe('resolveLocale', () => {
  test('passes plain strings through', () => {
    expect(resolveLocale('Hello')).toBe('Hello');
  });

  test('resolves a record using the configured default locale', () => {
    expect(resolveLocale({ [defaultLocale]: 'picked', ['x-other']: 'not picked' })).toBe('picked');
  });
});

describe('t', () => {
  test('returns a non-empty string for every translation key', () => {
    for (const key of Object.keys(translations.en) as TranslationKey[]) {
      const value = t(key);
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('resolves keys against the default locale, falling back to en', () => {
    const expected =
      translations[defaultLocale as Language]?.back_to_top || translations.en.back_to_top;
    expect(t('back_to_top')).toBe(expected);
  });
});

describe('tWith', () => {
  test('substitutes named parameters', () => {
    const result = tWith('page_of_total', { page: 2, total: 5 });
    expect(result).toContain('2');
    expect(result).toContain('5');
    expect(result).not.toContain('{page}');
    expect(result).not.toContain('{total}');
  });

  test('substitutes multiple distinct parameters', () => {
    const result = tWith('archive_subtitle', { count: 42, years: 3 });
    expect(result).toContain('42');
    expect(result).toContain('3');
    expect(result).not.toMatch(/\{\w+\}/);
  });

  test('leaves the string unchanged when no placeholders match', () => {
    expect(tWith('back_to_top', { irrelevant: 'x' })).toBe(t('back_to_top'));
  });
});

describe('buildFeatureOverrides', () => {
  test('no override when the configured name equals the default translation', () => {
    const original = siteConfig.features.series.name;
    try {
      siteConfig.features.series.name = {
        en: translations.en.series,
        zh: translations.zh.series,
      };
      expect('series' in buildFeatureOverrides('en')).toBe(false);
      expect('series' in buildFeatureOverrides('zh')).toBe(false);
    } finally {
      siteConfig.features.series.name = original;
    }
  });

  test('a renamed feature overrides its simple keys', () => {
    const original = siteConfig.features.series.name;
    try {
      siteConfig.features.series.name = { en: 'Collections', zh: '合集' };
      expect(buildFeatureOverrides('en').series).toBe('Collections');
      expect(buildFeatureOverrides('zh').series).toBe('合集');
    } finally {
      siteConfig.features.series.name = original;
    }
  });

  test('a renamed feature substitutes into compound keys', () => {
    const original = siteConfig.features.series.name;
    try {
      siteConfig.features.series.name = { en: 'Collections', zh: '合集' };

      const en = buildFeatureOverrides('en');
      for (const key of ['curated_series', 'all_series', 'view_full_series'] as const) {
        const value = en[key];
        expect(value).toBeDefined();
        expect(value!.toLowerCase()).toContain('collections');
        expect(value!.toLowerCase()).not.toContain('series');
      }

      const zh = buildFeatureOverrides('zh');
      expect(zh.all_series).toContain('合集');
      expect(zh.all_series).not.toContain('系列');
    } finally {
      siteConfig.features.series.name = original;
    }
  });

  test('falls back to the en feature name for a locale without one', () => {
    const original = siteConfig.features.series.name;
    try {
      // Missing zh: the zh overrides should use the en name
      siteConfig.features.series.name = { en: 'Collections' } as { en: string; zh: string };
      expect(buildFeatureOverrides('zh').series).toBe('Collections');
    } finally {
      siteConfig.features.series.name = original;
    }
  });

  test('an unknown locale resolves against en translations without crashing', () => {
    const overrides = buildFeatureOverrides('fr');
    expect(typeof overrides).toBe('object');
    for (const value of Object.values(overrides)) {
      expect(typeof value).toBe('string');
    }
  });
});

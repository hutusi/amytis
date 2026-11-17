import { describe, expect, test } from 'bun:test';
import { buildFeatureOverrides, getTranslator, resolveLocaleValue } from './i18n';
import { translations, TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';

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

describe('getTranslator t', () => {
  const { t } = getTranslator('en');

  test('returns a non-empty string for every translation key', () => {
    for (const key of Object.keys(translations.en) as TranslationKey[]) {
      const value = t(key);
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('resolves keys against the requested locale', () => {
    expect(t('back_to_top')).toBe(translations.en.back_to_top);
  });

  test('a zh translator resolves keys against the zh table', () => {
    expect(getTranslator('zh').t('back_to_top')).toBe('返回顶部');
  });

  test('an unknown locale falls back to en', () => {
    expect(getTranslator('fr').t('back_to_top')).toBe(translations.en.back_to_top);
  });

  test('returns the same cached translator per locale', () => {
    expect(getTranslator('en')).toBe(getTranslator('en'));
  });
});

describe('getTranslator tWith', () => {
  const { t, tWith } = getTranslator('en');

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
  // The demo config names features with { en, zh } maps and the starter with
  // plain strings; writing through this type compiles against either.
  const seriesFeature = siteConfig.features.series as { name: string | Record<string, string> };

  test('no override when the configured name equals the default translation', () => {
    const original = seriesFeature.name;
    try {
      seriesFeature.name = {
        en: translations.en.series,
        zh: translations.zh.series,
      };
      expect('series' in buildFeatureOverrides('en')).toBe(false);
      expect('series' in buildFeatureOverrides('zh')).toBe(false);
    } finally {
      seriesFeature.name = original;
    }
  });

  test('a renamed feature overrides its simple keys', () => {
    const original = seriesFeature.name;
    try {
      seriesFeature.name = { en: 'Collections', zh: '合集' };
      expect(buildFeatureOverrides('en').series).toBe('Collections');
      expect(buildFeatureOverrides('zh').series).toBe('合集');
    } finally {
      seriesFeature.name = original;
    }
  });

  test('a renamed feature substitutes into compound keys', () => {
    const original = seriesFeature.name;
    try {
      seriesFeature.name = { en: 'Collections', zh: '合集' };

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
      seriesFeature.name = original;
    }
  });

  test('a plain-string name (single-language config) applies in every language', () => {
    const original = seriesFeature.name;
    try {
      seriesFeature.name = 'Collections';
      expect(buildFeatureOverrides('en').series).toBe('Collections');
      expect(buildFeatureOverrides('zh').series).toBe('Collections');
    } finally {
      seriesFeature.name = original;
    }
  });

  test('falls back to the en feature name for a locale without one', () => {
    const original = seriesFeature.name;
    try {
      // Missing zh: the zh overrides should use the en name
      seriesFeature.name = { en: 'Collections' };
      expect(buildFeatureOverrides('zh').series).toBe('Collections');
    } finally {
      seriesFeature.name = original;
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

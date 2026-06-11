import { describe, expect, test } from 'bun:test';
import { safeDecodeParam, paramVariants, resolveFromParam } from './route-params';

describe('route-params', () => {
  describe('safeDecodeParam', () => {
    test('decodes percent-encoded params', () => {
      expect(safeDecodeParam('hello%20world')).toBe('hello world');
      expect(safeDecodeParam('%E4%B8%AD%E6%96%87')).toBe('中文');
    });

    test('returns malformed input unchanged instead of throwing', () => {
      expect(safeDecodeParam('%E0%A4%A')).toBe('%E0%A4%A');
      expect(safeDecodeParam('100%')).toBe('100%');
    });

    test('passes plain params through', () => {
      expect(safeDecodeParam('hello-world')).toBe('hello-world');
    });
  });

  describe('paramVariants', () => {
    test('plain ASCII collapses to a single variant', () => {
      expect(paramVariants('hello-world')).toEqual(['hello-world']);
    });

    test('encoded Unicode yields decoded + raw forms', () => {
      const variants = paramVariants('%E4%B8%AD%E6%96%87');
      expect(variants[0]).toBe('中文');
      expect(variants).toContain('%E4%B8%AD%E6%96%87');
    });

    test('NFC and NFD forms are both present for decomposable input', () => {
      const nfd = 'é'; // e + combining acute
      const variants = paramVariants(nfd);
      expect(variants).toContain('é'.normalize('NFC'));
      expect(variants).toContain(nfd);
    });

    test('variants are deduplicated', () => {
      const variants = paramVariants('abc');
      expect(new Set(variants).size).toBe(variants.length);
    });
  });

  describe('resolveFromParam', () => {
    test('tries variants in order until the lookup hits', () => {
      const store = new Map([['中文', 'found']]);
      expect(resolveFromParam('%E4%B8%AD%E6%96%87', s => store.get(s) ?? null)).toBe('found');
    });

    test('resolves NFD-typed param against NFC-stored content', () => {
      const store = new Map([['é'.normalize('NFC'), 'accent']]);
      expect(resolveFromParam('é', s => store.get(s) ?? null)).toBe('accent');
    });

    test('returns null when nothing matches', () => {
      expect(resolveFromParam('missing', () => null)).toBeNull();
    });
  });
});

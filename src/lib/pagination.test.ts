import { describe, expect, test } from 'bun:test';
import { firstPage, paginate, paginationStaticParams } from './pagination';

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe('pagination', () => {
  describe('paginate', () => {
    test('slices the requested page', () => {
      const slice = paginate(items, 2, 10);
      expect(slice).not.toBeNull();
      expect(slice!.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      expect(slice!.totalPages).toBe(3);
      expect(slice!.start).toBe(10);
    });

    test('last page may be partial', () => {
      expect(paginate(items, 3, 10)!.items).toEqual([21, 22, 23, 24, 25]);
    });

    test('page 1 of an empty list is a valid empty page', () => {
      const slice = paginate([], 1, 10);
      expect(slice).not.toBeNull();
      expect(slice!.items).toEqual([]);
      expect(slice!.totalPages).toBe(1);
    });

    test('out-of-range, sub-1, and NaN pages return null', () => {
      expect(paginate(items, 4, 10)).toBeNull();
      expect(paginate(items, 0, 10)).toBeNull();
      expect(paginate(items, -1, 10)).toBeNull();
      expect(paginate(items, NaN, 10)).toBeNull();
      expect(paginate(items, 1.5, 10)).toBeNull();
      expect(paginate([], 2, 10)).toBeNull(); // the '2' sentinel 404s when empty
    });
  });

  describe('paginationStaticParams', () => {
    test('emits pages 2..N', () => {
      expect(paginationStaticParams(25, 10)).toEqual([{ page: '2' }, { page: '3' }]);
    });

    test('single page emits the sentinel (never [])', () => {
      expect(paginationStaticParams(5, 10)).toEqual([{ page: '2' }]);
      expect(paginationStaticParams(0, 10)).toEqual([{ page: '2' }]);
    });

    test('disabled listings emit the sentinel, honoring a custom one', () => {
      expect(paginationStaticParams(100, 10, { enabled: false })).toEqual([{ page: '2' }]);
      expect(paginationStaticParams(100, 10, { enabled: false, disabledSentinel: '_' })).toEqual([{ page: '_' }]);
    });

    test('invalid pageSize throws (strict build)', () => {
      expect(() => paginationStaticParams(10, 0)).toThrow(/Invalid pagination page size/);
      expect(() => paginationStaticParams(10, -5)).toThrow(/Invalid pagination page size/);
      expect(() => paginationStaticParams(10, 2.5)).toThrow(/Invalid pagination page size/);
      expect(() => paginate(items, 1, 0)).toThrow(/Invalid pagination page size/);
    });

    test('firstPage is always non-null, even for empty listings', () => {
      expect(firstPage([], 10).items).toEqual([]);
      expect(firstPage(items, 10).items.length).toBe(10);
    });

    test('exact page boundary', () => {
      expect(paginationStaticParams(20, 10)).toEqual([{ page: '2' }]);
      expect(paginationStaticParams(21, 10)).toEqual([{ page: '2' }, { page: '3' }]);
    });
  });
});

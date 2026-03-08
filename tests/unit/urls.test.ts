import { describe, test, expect } from 'bun:test';
import { getPostUrl, getSeriesAutoPaths, validateSeriesAutoPaths } from '../../src/lib/urls';

describe('getSeriesAutoPaths', () => {
  test('returns false by default', () => {
    expect(getSeriesAutoPaths()).toBe(false);
  });
});

describe('getPostUrl — autoPaths disabled (default)', () => {
  test('post with no series uses basePath', () => {
    expect(getPostUrl({ slug: 'hello' })).toBe('/posts/hello');
  });

  test('post with series falls back to basePath when autoPaths is disabled', () => {
    expect(getPostUrl({ slug: 'hello', series: 'my-series' })).toBe('/posts/hello');
  });
});

describe('validateSeriesAutoPaths — autoPaths disabled (default)', () => {
  test('does not throw for any slug when autoPaths is false', () => {
    // validateSeriesAutoPaths is a no-op when autoPaths is disabled
    const reserved = ['tags', 'series', 'books', 'flows', 'archive', 'posts'];
    expect(() => validateSeriesAutoPaths(reserved)).not.toThrow();
  });

  test('does not throw even with extraReserved slugs when autoPaths is false', () => {
    expect(() => validateSeriesAutoPaths(['about'], ['about'])).not.toThrow();
  });
});

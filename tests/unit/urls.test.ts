import { describe, test, expect } from 'bun:test';
import { getPostUrl, getSeriesAutoPaths, validateSeriesAutoPaths } from '../../src/lib/urls';

describe('getSeriesAutoPaths', () => {
  test('returns true by default', () => {
    expect(getSeriesAutoPaths()).toBe(true);
  });
});

describe('getPostUrl — autoPaths enabled (default)', () => {
  test('post with no series uses basePath', () => {
    expect(getPostUrl({ slug: 'hello' })).toBe('/posts/hello');
  });

  test('post with series uses series slug as prefix when autoPaths is enabled', () => {
    expect(getPostUrl({ slug: 'hello', series: 'my-series' })).toBe('/my-series/hello');
  });
});

describe('validateSeriesAutoPaths — autoPaths enabled (default)', () => {
  test('throws for a reserved route slug', () => {
    expect(() => validateSeriesAutoPaths(['tags'])).toThrow('[amytis]');
  });

  test('throws for an extra reserved slug', () => {
    expect(() => validateSeriesAutoPaths(['about'], ['about'])).toThrow('[amytis]');
  });
});

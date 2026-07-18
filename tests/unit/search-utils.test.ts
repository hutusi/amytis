import { describe, test, expect } from 'bun:test';
import { parseRecentSearches, getResultType } from '@/lib/search-utils';

describe('parseRecentSearches', () => {
  test('returns valid string arrays unchanged (capped)', () => {
    expect(parseRecentSearches('["a","b"]', 5)).toEqual(['a', 'b']);
    expect(parseRecentSearches('["a","b","c"]', 2)).toEqual(['a', 'b']);
  });

  test('null / empty / invalid JSON yields an empty list', () => {
    expect(parseRecentSearches(null, 5)).toEqual([]);
    expect(parseRecentSearches('', 5)).toEqual([]);
    expect(parseRecentSearches('not json', 5)).toEqual([]);
  });

  test('non-array JSON yields an empty list', () => {
    expect(parseRecentSearches('{"a":1}', 5)).toEqual([]);
    expect(parseRecentSearches('42', 5)).toEqual([]);
    expect(parseRecentSearches('"a string"', 5)).toEqual([]);
  });

  test('drops non-string members from a mixed array', () => {
    // '[{}]' parses fine but an object rendered as a list child would throw.
    expect(parseRecentSearches('[{}]', 5)).toEqual([]);
    expect(parseRecentSearches('["keep", 42, null, {"x":1}, "also"]', 5)).toEqual(['keep', 'also']);
  });
});

describe('getResultType', () => {
  test('derives content type from the URL', () => {
    expect(getResultType('/flows/2026/01/15/')).toBe('Flow');
    expect(getResultType('/books/dmla/intro/')).toBe('Book');
    expect(getResultType('/notes/zettelkasten/')).toBe('Note');
    expect(getResultType('/posts/hello/')).toBe('Post');
    expect(getResultType('/anything-else/')).toBe('Post');
  });
});

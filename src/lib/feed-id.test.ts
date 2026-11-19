import { describe, expect, test } from 'bun:test';
import { isValidFeedId } from './feed-id';

describe('isValidFeedId', () => {
  test('accepts absolute URIs, used verbatim', () => {
    expect(isValidFeedId('https://example.com/posts/old-slug/')).toBe(true);
    // A pre-2.0 bare-URL id can be restored exactly
    expect(isValidFeedId('https://example.com/posts/old-slug')).toBe(true);
    expect(isValidFeedId('tag:example.com,2026:old-slug')).toBe(true);
    expect(isValidFeedId('urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a')).toBe(true);
  });

  test('rejects values that are not an absolute URI', () => {
    expect(isValidFeedId('/posts/old-slug/')).toBe(false);
    expect(isValidFeedId('old-slug')).toBe(false);
    expect(isValidFeedId('')).toBe(false);
    expect(isValidFeedId('https://example.com/old slug/')).toBe(false);
    expect(isValidFeedId('https://')).toBe(false);
  });
});

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

  // Illegal in feed XML, so the feed would strip them and emit a different
  // id than the author wrote; `\S` / `new URL()` let them through.
  test('rejects characters that are illegal or invisible in feed XML', () => {
    for (const ch of ['\u0001', '\u001F', '\u007F', '\u0085', '\uD800', '\uDC00', '\uFFFE', '\uFFFF']) {
      expect(isValidFeedId(`tag:example.com,2026:a${ch}b`)).toBe(false);
    }
  });

  test('keeps non-ASCII ids, as posts with CJK slugs have', () => {
    expect(isValidFeedId('https://example.com/zh/posts/中文标题/')).toBe(true);
    expect(isValidFeedId('https://example.com/posts/café/')).toBe(true);
    // A well-formed surrogate pair (astral character) is fine
    expect(isValidFeedId('tag:example.com,2026:\u{1F600}')).toBe(true);
  });
});

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

  // new URL() accepts these (a non-fatal validation error), but an Atom <id>
  // must be an IRI, and the feed emits the original string.
  test('rejects malformed percent escapes and characters IRIs never carry raw', () => {
    for (const id of [
      'https://example.com/%ZZ',
      'https://example.com/a%2',
      'https://example.com/a%',
      'tag:example.com,2026:50%off',
      'https://example.com/a<b',
      'https://example.com/a>b',
      'https://example.com/a"b',
      'https://example.com/a{b}',
      'https://example.com/a|b',
      'https://example.com/a\\b',
      'https://example.com/a^b',
      'https://example.com/a`b',
    ]) {
      expect(isValidFeedId(id)).toBe(false);
    }
  });

  test('allows brackets only around an IPv6 host', () => {
    for (const id of [
      'https://example.com/a[b]',
      'https://example.com/a?q=[1]',
      'https://example.com/a#[x]',
      'tag:example.com,2026:[draft]',
      'https://exa[mple.com/',
    ]) {
      expect(isValidFeedId(id)).toBe(false);
    }
    expect(isValidFeedId('https://[::1]/a')).toBe(true);
    expect(isValidFeedId('https://[2001:db8::1]:8080/posts/a/')).toBe(true);
    expect(isValidFeedId('https://example.com/a%5Bb%5D')).toBe(true);
  });

  test('keeps valid percent escapes exactly as written', () => {
    expect(isValidFeedId('https://example.com/posts/100%25-done/')).toBe(true);
    expect(isValidFeedId('https://example.com/posts/%E4%B8%AD%E6%96%87/')).toBe(true);
    expect(isValidFeedId('tag:example.com,2026:a%2fb')).toBe(true);
  });

  test('keeps non-ASCII ids, as posts with CJK slugs have', () => {
    expect(isValidFeedId('https://example.com/zh/posts/中文标题/')).toBe(true);
    expect(isValidFeedId('https://example.com/posts/café/')).toBe(true);
    // A well-formed surrogate pair (astral character) is fine
    expect(isValidFeedId('tag:example.com,2026:\u{1F600}')).toBe(true);
  });
});

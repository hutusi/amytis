import { describe, expect, test } from 'bun:test';
import { isValidFeedId } from './feed-id';

describe('isValidFeedId', () => {
  test('accepts absolute ids, used verbatim', () => {
    expect(isValidFeedId('https://example.com/posts/old-slug/')).toBe(true);
    // A pre-2.0 bare-URL id can be restored exactly
    expect(isValidFeedId('https://example.com/posts/old-slug')).toBe(true);
    expect(isValidFeedId('tag:example.com,2026:old-slug')).toBe(true);
    expect(isValidFeedId('urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a')).toBe(true);
  });

  test('requires a URI scheme: site-relative and bare values are rejected', () => {
    expect(isValidFeedId('/posts/old-slug/')).toBe(false);
    expect(isValidFeedId('old-slug')).toBe(false);
    expect(isValidFeedId('://example.com/')).toBe(false);
    expect(isValidFeedId('1tag:example.com')).toBe(false);
    expect(isValidFeedId('tag:')).toBe(false);
    expect(isValidFeedId('')).toBe(false);
  });

  // Invisible in the source, and the XML-illegal ones are stripped from the
  // feed, so readers would get a different id than the author wrote.
  test('rejects whitespace and control characters', () => {
    const chars = [
      ' ', '\t', '\n', '\r', '\u00A0', '\u2028', '\u3000', '\uFEFF',
      '\u0000', '\u0001', '\u001F', '\u007F', '\u0085',
      '\uD800', '\uDC00', '\uFFFE', '\uFFFF',
    ];
    for (const ch of chars) {
      expect(isValidFeedId(`tag:example.com,2026:a${ch}b`)).toBe(false);
    }
  });

  // Opaque on purpose: the id is not checked against the IRI grammar. These
  // aren't valid IRIs, but readers compare ids as strings and the feed
  // XML-escapes them, so they round-trip exactly (see feed-routes.test.ts).
  test('accepts ids the IRI grammar would reject', () => {
    for (const id of [
      'https://example.com/%ZZ',
      'https://user[name]@example.com/a',
      'https://example.com/a[b]#c#d',
      'tag:example.com,2026:a<b>&"c\'d]]>',
    ]) {
      expect(isValidFeedId(id)).toBe(true);
    }
  });

  test('keeps non-ASCII ids, as posts with CJK slugs have', () => {
    expect(isValidFeedId('https://example.com/zh/posts/中文标题/')).toBe(true);
    expect(isValidFeedId('https://example.com/posts/caf\u00E9/')).toBe(true);
    // A well-formed surrogate pair (astral character) is fine
    expect(isValidFeedId('tag:example.com,2026:\u{1F600}')).toBe(true);
  });
});

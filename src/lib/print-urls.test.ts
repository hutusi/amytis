import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypePrintLinkUrls, { shouldPrintLinkUrl } from './print-urls';

describe('shouldPrintLinkUrl', () => {
  test('external links with their own text print their address', () => {
    expect(shouldPrintLinkUrl('https://en.wikipedia.org/wiki/Zettelkasten', 'Zettelkasten')).toBe(true);
  });

  test('not when the text already is the address', () => {
    expect(shouldPrintLinkUrl('https://example.com/', 'https://example.com')).toBe(false);
    expect(shouldPrintLinkUrl('https://example.com/a', 'example.com/a')).toBe(false);
  });

  test('not internal, fragment, mail or image links', () => {
    expect(shouldPrintLinkUrl('/posts/hello/', 'Hello')).toBe(false);
    expect(shouldPrintLinkUrl('#setup', 'Setup')).toBe(false);
    expect(shouldPrintLinkUrl('mailto:me@example.com', 'Mail me')).toBe(false);
    expect(shouldPrintLinkUrl('https://example.com/', '', true)).toBe(false);
    expect(shouldPrintLinkUrl(undefined, 'x')).toBe(false);
  });
});

describe('rehypePrintLinkUrls', () => {
  const run = (html: string) =>
    String(unified().use(rehypeParse, { fragment: true }).use(rehypePrintLinkUrls).use(rehypeStringify).processSync(html));

  test('marks only the links that should print', () => {
    expect(run('<a href="https://example.org/doc">the docs</a>')).toContain('data-print-url="true"');
    expect(run('<a href="https://example.org/"><img src="/a.png" alt=""></a>')).not.toContain('data-print-url');
    expect(run('<a class="wikilink" href="/notes/x/">x</a>')).not.toContain('data-print-url');
  });
});

import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { renderAsync } from '@/test-utils/render';
import { isExternalUrl } from '@/lib/urls';
import { siteConfig } from '../../site.config';

describe('Unit: isExternalUrl', () => {
  test('absolute http(s) to a different host is external', () => {
    expect(isExternalUrl('https://en.wikipedia.org/wiki/Feature_engineering')).toBe(true);
    expect(isExternalUrl('http://example.com/')).toBe(true);
  });

  test('absolute URL pointing back at siteConfig.baseUrl is internal', () => {
    const u = new URL(siteConfig.baseUrl);
    expect(isExternalUrl(`${u.origin}/posts/foo`)).toBe(false);
  });

  test('protocol-relative URL is compared by host', () => {
    expect(isExternalUrl('//en.wikipedia.org/wiki/Vector')).toBe(true);
    const u = new URL(siteConfig.baseUrl);
    expect(isExternalUrl(`//${u.host}/posts/foo`)).toBe(false);
  });

  test('protocol-relative with auth or port: classified by parsed host', () => {
    // `//user:pass@host/...` — host is `host`, NOT `user:pass@host`. Substring
    // splitting on `/` would have got this wrong.
    expect(isExternalUrl('//user:pass@en.wikipedia.org/wiki/Vector')).toBe(true);
    // `//host:8080/...` — port is part of host.
    expect(isExternalUrl('//en.wikipedia.org:8080/wiki/Vector')).toBe(true);
    // `//:80/path` — no host, URL parsing rejects it → false (non-external).
    expect(isExternalUrl('//:80/path')).toBe(false);
  });

  test('relative paths, hash, and query are internal', () => {
    expect(isExternalUrl('/posts/foo')).toBe(false);
    expect(isExternalUrl('foo.md')).toBe(false);
    expect(isExternalUrl('#section')).toBe(false);
    expect(isExternalUrl('?tab=2')).toBe(false);
  });

  test('non-http schemes are not treated as external links', () => {
    // Semantically external, but click semantics differ — no outward arrow.
    expect(isExternalUrl('mailto:foo@bar.com')).toBe(false);
    expect(isExternalUrl('tel:+1234')).toBe(false);
    expect(isExternalUrl('ftp://example.com/')).toBe(false);
    expect(isExternalUrl('javascript:void(0)')).toBe(false);
  });

  test('empty / nullish / malformed returns false', () => {
    expect(isExternalUrl('')).toBe(false);
    expect(isExternalUrl(undefined)).toBe(false);
    expect(isExternalUrl(null)).toBe(false);
    expect(isExternalUrl('http://[malformed')).toBe(false);
  });
});

describe('Integration: external-link icon in MarkdownRenderer', () => {
  test('external link gets the LuArrowUpRight icon and target=_blank', async () => {
    const content = 'See [Wikipedia](https://en.wikipedia.org/wiki/Vector) for details.';
    const html = await renderAsync(MarkdownRenderer({ content }));
    // react-icons/lu renders an inline <svg>; LuArrowUpRight has a distinctive path.
    // We assert on stable surface: presence of an <svg> inside the anchor + new-tab attrs.
    expect(html).toMatch(/<a [^>]*href="https:\/\/en\.wikipedia\.org\/wiki\/Vector"[^>]*target="_blank"/);
    expect(html).toContain('rel="noopener noreferrer"');
    // The icon is an inline svg appended directly after the link text inside the anchor.
    expect(html).toMatch(/Wikipedia<svg/);
  });

  test('internal link gets no icon and no target=_blank', async () => {
    const content = 'See [vectors](/books/dmla/maths/linear/vectors/) for details.';
    const html = await renderAsync(MarkdownRenderer({ content }));
    expect(html).toContain('href="/books/dmla/maths/linear/vectors/"');
    expect(html).not.toMatch(/href="\/books\/dmla\/maths\/linear\/vectors\/"[^>]*target="_blank"/);
    // No svg inside this specific anchor.
    expect(html).not.toMatch(/vectors<\/a>[^<]*<svg/);
  });

  test('mailto link is not decorated', async () => {
    const content = 'Email [me](mailto:foo@bar.com).';
    const html = await renderAsync(MarkdownRenderer({ content }));
    expect(html).toContain('href="mailto:foo@bar.com"');
    expect(html).not.toMatch(/href="mailto:[^"]+"[^>]*target="_blank"/);
  });

  test('absolute URL to the site host stays internal', async () => {
    const u = new URL(siteConfig.baseUrl);
    const content = `See [home](${u.origin}/posts/foo).`;
    const html = await renderAsync(MarkdownRenderer({ content }));
    // Escape regex metacharacters in the interpolated origin — without this,
    // dots in e.g. `amytis.vercel.app` would match any character, making the
    // `not.toMatch` assertion too lax.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(html).not.toMatch(new RegExp(`href="${escapeRegex(u.origin)}/posts/foo"[^>]*target="_blank"`));
  });

  test('image-as-link skips the icon (image already signals the destination)', async () => {
    const content = '[![logo](/logo.png)](https://example.com/)';
    const html = await renderAsync(MarkdownRenderer({ content }));
    // Anchor is still external (target=_blank), but no icon appended after the <img>.
    expect(html).toContain('target="_blank"');
    expect(html).not.toMatch(/<img[^>]*>\s*<svg/);
  });
});

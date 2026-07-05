import { describe, expect, test } from 'bun:test';
import sitemap from '@/app/sitemap';
import { getAllPosts } from '@/lib/content/posts';
import { getPostUrl, withTrailingSlash } from '@/lib/urls';
import { siteConfig } from '../../site.config';

// The sitemap reads real content, so these tests assert invariants that must
// hold for any content set — never specific slugs or titles.
describe('Integration: sitemap', () => {
  const entries = sitemap();
  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const urls = entries.map((entry) => entry.url);

  test('returns a non-empty list of entries', () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test('every URL is absolute and starts with the site base URL', () => {
    for (const url of urls) {
      expect(typeof url).toBe('string');
      expect(url.startsWith(baseUrl)).toBe(true);
      // Must parse as a URL with an http(s) protocol
      const parsed = new URL(url);
      expect(['http:', 'https:']).toContain(parsed.protocol);
    }
  });

  test('no URL contains unresolved placeholders or interpolation artifacts', () => {
    for (const url of urls) {
      expect(url).not.toContain('undefined');
      expect(url).not.toContain('null');
      expect(url).not.toContain('[');
      expect(url).not.toContain(']');
      expect(url).not.toMatch(/\s/);
      // No accidental double slashes in the path (protocol separator aside)
      expect(new URL(url).pathname).not.toContain('//');
    }
  });

  test('contains no duplicate URLs', () => {
    const seen = new Set(urls);
    expect(seen.size).toBe(urls.length);
  });

  test('includes the home page', () => {
    expect(urls.some((url) => url === baseUrl || url === `${baseUrl}/`)).toBe(true);
  });

  test('includes the unconditional listing pages', () => {
    for (const path of ['/archive', '/tags', '/books', '/flows']) {
      // Canonical form under trailingSlash: true — see withTrailingSlash.
      expect(urls).toContain(`${baseUrl}${path}/`);
    }
  });

  test('includes every post at its canonical URL', () => {
    const urlSet = new Set(urls);
    for (const post of getAllPosts()) {
      expect(urlSet.has(withTrailingSlash(`${baseUrl}${getPostUrl(post)}`))).toBe(true);
    }
  });

  test('lastModified values are valid dates in a sane range', () => {
    const earliest = new Date('1990-01-01').getTime();
    const oneYearFromNow = Date.now() + 366 * 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (entry.lastModified == null) continue;
      const time = new Date(entry.lastModified).getTime();
      expect(Number.isNaN(time)).toBe(false);
      expect(time).toBeGreaterThanOrEqual(earliest);
      expect(time).toBeLessThanOrEqual(oneYearFromNow);
    }
  });

  test('priorities, when set, are within [0, 1]', () => {
    for (const entry of entries) {
      if (entry.priority == null) continue;
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });
});

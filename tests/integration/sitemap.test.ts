import { describe, expect, test, mock } from 'bun:test';
import sitemap from '@/app/sitemap';
import { getAllPosts } from '@/lib/content/posts';
import { getAllNotes } from '@/lib/content/notes';
import * as realSeriesNs from '@/lib/content/series';
import { getAllSeries } from '@/lib/content/series';

// Shallow snapshot taken before any mock.module so restore puts back the real exports.
const realSeriesModule = { ...realSeriesNs };
import { getAllAuthors, getAuthorSlug } from '@/lib/content/authors';
import { getAllTags } from '@/lib/content/discovery';
import { getPostUrl, getNoteUrl, getSeriesUrl, withTrailingSlash } from '@/lib/urls';
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

  test('includes the notes and series listing pages (features enabled)', () => {
    for (const path of ['/notes', '/series']) {
      expect(urls).toContain(`${baseUrl}${path}/`);
    }
  });

  test('includes every note, series, author-slug, and tag exactly once', () => {
    const urlSet = new Set(urls);
    for (const note of getAllNotes()) {
      expect(urlSet.has(withTrailingSlash(`${baseUrl}${getNoteUrl(note.slug)}`))).toBe(true);
    }
    for (const slug of Object.keys(getAllSeries())) {
      expect(urlSet.has(withTrailingSlash(`${baseUrl}${getSeriesUrl(slug)}`))).toBe(true);
    }
    for (const name of Object.keys(getAllAuthors())) {
      expect(urlSet.has(withTrailingSlash(`${baseUrl}/authors/${getAuthorSlug(name)}`))).toBe(true);
    }
    for (const tag of Object.keys(getAllTags())) {
      expect(urlSet.has(withTrailingSlash(`${baseUrl}/tags/${encodeURIComponent(tag.toLowerCase())}`))).toBe(true);
    }
  });

  test('advertises authors only by canonical slug, never the legacy name form', () => {
    const authorUrls = urls.filter((u) => u.startsWith(`${baseUrl}/authors/`));
    // One entry per author — no duplicate name-form URL alongside the slug.
    expect(authorUrls.length).toBe(Object.keys(getAllAuthors()).length);
    for (const url of authorUrls) {
      const segment = new URL(url).pathname.replace(/^\/authors\//, '').replace(/\/$/, '');
      expect(segment).not.toMatch(/[A-Z\s]/); // slugs are lowercase and space-free
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

describe('Integration: sitemap — empty series', () => {
  test('a series with no posts omits lastModified instead of emitting an empty date', () => {
    // getAllSeries can include empty series directories; reduce would then yield
    // '' — an invalid <lastmod>. Verify the entry omits the date instead.
    mock.module('@/lib/content/series', () => ({
      ...realSeriesModule,
      getAllSeries: () => ({ '__empty-series__': [] }),
      getSeriesData: () => null,
    }));
    try {
      const entries = sitemap();
      const emptyEntry = entries.find((e) => e.url.includes('__empty-series__'));
      expect(emptyEntry).toBeDefined();
      expect(emptyEntry!.lastModified).toBeUndefined();
      // No entry should ever carry an empty-string date.
      for (const e of entries) expect(e.lastModified).not.toBe('');
    } finally {
      mock.module('@/lib/content/series', () => realSeriesModule);
    }
  });
});

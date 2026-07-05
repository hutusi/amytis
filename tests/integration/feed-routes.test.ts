import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { GET as getMainRss } from '@/app/feed.xml/route';
import { GET as getMainAtom } from '@/app/feed.atom/route';
import { GET as getAllRss } from '@/app/all.xml/route';
import { GET as getAllAtom } from '@/app/all.atom/route';
import { GET as getPostsRss } from '@/app/posts/feed.xml/route';
import { GET as getPostsAtom } from '@/app/posts/feed.atom/route';
import { GET as getFlowsRss } from '@/app/flows/feed.xml/route';
import { GET as getFlowsAtom } from '@/app/flows/feed.atom/route';
import { resolveLocale } from '@/lib/i18n';
import { siteConfig } from '../../site.config';

type FeedKind = 'rss' | 'atom';
type RouteHandler = () => Promise<Response>;

const routes: Array<{ name: string; get: RouteHandler; kind: FeedKind }> = [
  { name: '/feed.xml', get: getMainRss, kind: 'rss' },
  { name: '/all.xml', get: getAllRss, kind: 'rss' },
  { name: '/posts/feed.xml', get: getPostsRss, kind: 'rss' },
  { name: '/flows/feed.xml', get: getFlowsRss, kind: 'rss' },
  { name: '/feed.atom', get: getMainAtom, kind: 'atom' },
  { name: '/all.atom', get: getAllAtom, kind: 'atom' },
  { name: '/posts/feed.atom', get: getPostsAtom, kind: 'atom' },
  { name: '/flows/feed.atom', get: getFlowsAtom, kind: 'atom' },
];

const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
const siteTitle = resolveLocale(siteConfig.title);

/** CDATA sections hold author-provided content; strip them before structural checks. */
function stripCdata(xml: string): string {
  return xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
}

/**
 * Minimal well-formedness check for the machine-generated feed XML:
 * after removing CDATA and comments, every open tag must have a matching
 * close tag in the right nesting order.
 */
function expectBalancedXml(xml: string): void {
  const body = stripCdata(xml).replace(/<!--[\s\S]*?-->/g, '');
  const tokens = body.match(/<[^>]+>/g) ?? [];
  const stack: string[] = [];
  for (const token of tokens) {
    if (token.startsWith('<?')) continue; // XML declaration
    if (token.startsWith('</')) {
      const name = /^<\/\s*([\w:.-]+)/.exec(token)?.[1];
      expect(stack.pop()).toBe(name);
    } else if (!token.endsWith('/>')) {
      const name = /^<([\w:.-]+)/.exec(token)?.[1];
      expect(name).toBeDefined();
      stack.push(name!);
    }
  }
  expect(stack).toEqual([]);
}

function extractLinks(body: string, kind: FeedKind): string[] {
  const pattern = kind === 'rss' ? /<link>([^<]+)<\/link>/g : /<link href="([^"]+)"/g;
  return Array.from(body.matchAll(pattern), (m) => m[1]);
}

interface FeedResult {
  status: number;
  contentType: string | null;
  body: string;
}

describe('Integration: feed route handlers', () => {
  const results = new Map<string, FeedResult>();
  let originalFormat: typeof siteConfig.feed.format;

  beforeAll(async () => {
    // Serve both formats so every route can be exercised regardless of config
    originalFormat = siteConfig.feed.format;
    siteConfig.feed.format = 'both';
    for (const { name, get } of routes) {
      const res = await get();
      results.set(name, {
        status: res.status,
        contentType: res.headers.get('content-type'),
        body: await res.text(),
      });
    }
  });

  afterAll(() => {
    siteConfig.feed.format = originalFormat;
  });

  for (const { name, kind } of routes) {
    describe(name, () => {
      test('responds with 200 and the correct Content-Type', () => {
        const result = results.get(name)!;
        expect(result.status).toBe(200);
        expect(result.contentType).toContain(
          kind === 'rss' ? 'application/rss+xml' : 'application/atom+xml'
        );
      });

      test('body is well-formed XML with the expected root element', () => {
        const { body } = results.get(name)!;
        expect(body.startsWith('<?xml')).toBe(true);
        const root = kind === 'rss' ? 'rss' : 'feed';
        expect(body).toMatch(new RegExp(`<${root}[\\s>]`));
        expect(body.trimEnd().endsWith(`</${root}>`)).toBe(true);
        expectBalancedXml(body);
      });

      test('feed title matches the configured site title', () => {
        const { body } = results.get(name)!;
        expect(body).toContain(siteTitle);
      });

      test('all links are absolute URLs on the site host', () => {
        const { body } = results.get(name)!;
        const links = extractLinks(body, kind);
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
          expect(link.startsWith(baseUrl)).toBe(true);
          expect(link).not.toContain('undefined');
          // Must parse as a URL
          expect(() => new URL(link)).not.toThrow();
        }
      });

      test('structural XML contains no interpolated undefined values', () => {
        const { body } = results.get(name)!;
        expect(stripCdata(body)).not.toContain('undefined');
      });

      test('item dates are valid', () => {
        const { body } = results.get(name)!;
        const pattern =
          kind === 'rss' ? /<pubDate>([^<]+)<\/pubDate>/g : /<published>([^<]+)<\/published>/g;
        for (const match of body.matchAll(pattern)) {
          expect(Number.isNaN(new Date(match[1]).getTime())).toBe(false);
        }
      });
    });
  }

  describe('format gating', () => {
    test('atom routes return 404 when the feed format is rss-only', async () => {
      const saved = siteConfig.feed.format;
      try {
        siteConfig.feed.format = 'rss';
        const res = await getMainAtom();
        expect(res.status).toBe(404);
      } finally {
        siteConfig.feed.format = saved;
      }
    });

    test('rss routes return 404 when the feed format is atom-only', async () => {
      const saved = siteConfig.feed.format;
      try {
        siteConfig.feed.format = 'atom';
        const res = await getMainRss();
        expect(res.status).toBe(404);
      } finally {
        siteConfig.feed.format = saved;
      }
    });
  });
});

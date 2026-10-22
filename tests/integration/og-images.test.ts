import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { getAllPosts } from '@/lib/content/posts';
import { getAllNotes } from '@/lib/content/notes';
import { getAllBooks, getBookChapter } from '@/lib/content/books';
import { getOgCards, getShareImage, type OgCard } from '@/lib/og-images';
import { renderOgCard } from '@/lib/og-card';
import { getBookChapterUrl, getDefaultLocale, getNonDefaultLocales, getNoteUrl, getPostUrl, localizeUrl } from '@/lib/urls';
import { GET, generateStaticParams } from '@/app/og/[...path]/route';
import { siteConfig } from '../../site.config';

const SITE = siteConfig.baseUrl.replace(/\/+$/, '');
const realFetch = globalThis.fetch;

// Outside production getOgCards re-reads all content (~1s), so read it once.
let cards: Map<string, OgCard>;
beforeAll(() => {
  cards = getOgCards();
});

afterEach(() => {
  siteConfig.generateOgImages = true;
  globalThis.fetch = realFetch;
});

function request(path: string[]) {
  return GET(new Request(`${SITE}/og/${path.join('/')}`), { params: Promise.resolve({ path }) });
}

describe('share cards from real content', () => {
  test('a coverless post gets a card with its date and authors', () => {
    expect(cards.get('/og/posts/code-block-features-showcase.png')).toMatchObject({
      kind: 'post',
      pagePath: '/posts/code-block-features-showcase',
      title: 'Code Block Features Showcase',
      date: '2026-05-25',
      authors: ['Amytis Team'],
    });
  });

  test('a post with a cover image gets none', () => {
    expect(cards.has('/og/posts/understanding-react-hooks.png')).toBe(false);
  });

  test('series posts carry the series title; Unicode slugs keep their path', () => {
    expect(cards.get('/og/markdown-showcase/中文测试文章.png')).toMatchObject({
      title: '中文测试文章',
      kicker: 'Markdown Showcase',
    });
  });

  test('locale-tree posts get their own card in their own language', () => {
    expect(cards.get('/og/zh/posts/zh-original-demo.png')).toMatchObject({ locale: 'zh', title: '中文原创示例文章' });
  });

  test('notes carry the Notes label; chapters carry the book title and authors', () => {
    expect(cards.get('/og/notes/tailwind-v4.png')).toMatchObject({ kind: 'note', title: 'Tailwind CSS v4', kicker: 'Notes' });
    expect(cards.get('/og/books/notes-on-thinking/mental-models.png')).toMatchObject({
      kind: 'chapter',
      title: 'Mental Models Are Maps',
      kicker: 'Notes on Thinking',
      authors: ['Amytis'],
    });
  });

  test("chapters of a book with a cover share the book's cover, not a card", () => {
    expect([...cards.keys()].some((imagePath) => imagePath.startsWith('/og/books/sample-book/'))).toBe(false);
  });

  test('the bundled fonts cover every title and kicker, so the build downloads no font', async () => {
    // scripts/build-og-fonts.py adds title characters beyond GB2312 to the
    // CJK subset; rerun it when this fails after adding content.
    const text = new Set<string>();
    for (const card of cards.values()) {
      for (const ch of `${card.title}${card.kicker ?? ''}`) if (ch.codePointAt(0)! > 0x7f) text.add(ch);
    }
    const fetched: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith('data:')) return realFetch(input, init); // next/og's own wasm
      fetched.push(url);
      throw new Error('no network in tests');
    }) as typeof fetch;
    const chars = [...text];
    for (let i = 0; i < chars.length; i += 60) {
      await renderOgCard({ locale: 'zh', title: chars.slice(i, i + 60).join(''), authors: [] }).arrayBuffer();
    }
    expect(fetched).toEqual([]);
  });
});

describe('getShareImage', () => {
  test('agrees with getOgCards on every post, note and chapter page', () => {
    // Metadata decides by rule; the route renders from the enumeration. A page
    // whose og:image names a card must have one.
    const generated = new Set<string>();
    const check = (share: { url: string; source: string }) => {
      if (share.source === 'card') generated.add(decodeURI(share.url.slice(SITE.length)));
    };
    for (const locale of [getDefaultLocale(), ...getNonDefaultLocales()]) {
      for (const post of getAllPosts(locale)) {
        check(getShareImage({ kind: 'post', pagePath: getPostUrl(post), coverImage: post.coverImage }));
      }
      for (const note of getAllNotes(locale)) {
        check(getShareImage({ kind: 'note', pagePath: localizeUrl(getNoteUrl(note.slug), locale) }));
      }
      for (const book of getAllBooks(locale)) {
        for (const entry of book.chapters) {
          if (!getBookChapter(book.slug, entry.id, locale)) continue;
          const pagePath = localizeUrl(getBookChapterUrl(book.slug, entry.id), locale);
          check(getShareImage({ kind: 'chapter', pagePath, coverImage: book.coverImage }));
        }
      }
    }
    expect([...generated].sort()).toEqual([...cards.keys()].sort());
  });

  test('a coverless page shares its card', () => {
    expect(getShareImage({ kind: 'post', pagePath: '/posts/code-block-features-showcase' })).toEqual({
      url: `${SITE}/og/posts/code-block-features-showcase.png`,
      source: 'card',
    });
  });

  test('Unicode card paths are percent-encoded in the URL', () => {
    expect(getShareImage({ kind: 'post', pagePath: '/markdown-showcase/中文测试文章' }).url).toBe(
      `${SITE}/og/markdown-showcase/${encodeURIComponent('中文测试文章')}.png`,
    );
  });

  test('a real cover wins; a text: cover does not', () => {
    expect(
      getShareImage({ kind: 'post', pagePath: '/posts/understanding-react-hooks', coverImage: '/images/antelope-canyon.jpg' }),
    ).toEqual({ url: `${SITE}/images/antelope-canyon.jpg`, source: 'cover' });
    expect(getShareImage({ kind: 'post', pagePath: '/posts/x', coverImage: 'text:Code' }).source).toBe('card');
  });

  test('with generateOgImages off, pages fall back to the site image and no card is built', () => {
    siteConfig.generateOgImages = false;
    expect(getShareImage({ kind: 'note', pagePath: '/notes/tailwind-v4' })).toEqual({
      url: `${SITE}${siteConfig.ogImage}`,
      source: 'site',
    });
    expect(getOgCards().size).toBe(0);
  });
});

describe('the /og/ route', () => {
  test('emits one param per card and renders it, for raw and percent-encoded Unicode segments', async () => {
    const paths = new Set(generateStaticParams().map(({ path }) => `/og/${path.join('/')}`));
    for (const imagePath of cards.keys()) expect(paths.has(imagePath)).toBe(true);

    for (const path of [['markdown-showcase', '中文测试文章.png'], ['markdown-showcase', encodeURIComponent('中文测试文章.png')]]) {
      const response = await request(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
    }
  });

  test('with no cards, the export placeholder renders and anything else 404s', async () => {
    siteConfig.generateOgImages = false;
    expect(generateStaticParams()).toEqual([{ path: ['_.png'] }]);
    expect((await request(['_.png'])).status).toBe(200);
    expect((await request(['posts', 'code-block-features-showcase.png'])).status).toBe(404);
  });
});

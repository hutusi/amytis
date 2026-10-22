import { afterEach, describe, expect, test } from 'bun:test';
import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { generateMetadata as postsSlugMetadata } from '../../src/app/posts/[slug]/page';
import { generateMetadata as secondLevelMetadata } from '../../src/app/[slug]/[postSlug]/page';
import { generateMetadata as deepMetadata } from '../../src/app/[slug]/[postSlug]/[...rest]/page';
import { generateMetadata as noteMetadata } from '../../src/app/notes/[slug]/page';
import { generateMetadata as chapterMetadata } from '../../src/app/books/[slug]/[...chapter]/page';
import RenderPostPage from '../../src/components/RenderPostPage';
import BookChapterBody from '../../src/components/page-bodies/BookChapterBody';
import { getPostBySlug } from '../../src/lib/content/posts';
import { siteConfig } from '../../site.config';

const SITE = siteConfig.baseUrl.replace(/\/+$/, '');

afterEach(() => {
  siteConfig.generateOgImages = true;
});

function shareImages(md: Metadata) {
  const og = md.openGraph?.images;
  const ogUrl = Array.isArray(og) ? (og[0] as { url: string } | undefined)?.url : undefined;
  const twitter = md.twitter as { card?: string; images?: string[] } | undefined;
  return { og: ogUrl, card: twitter?.card, twitter: twitter?.images?.[0] };
}

/** The JSON-LD graph a page body emits, found in its element tree without rendering it. */
function jsonLdOf(node: ReactNode): { '@graph': Array<{ image?: { url: string } }> } {
  const elements = (Array.isArray(node) ? node : [node]) as ReactElement<{
    children?: ReactNode;
    dangerouslySetInnerHTML?: { __html: string };
  }>[];
  for (const el of elements) {
    if (!el || typeof el !== 'object') continue;
    if (el.type === 'script') return JSON.parse(el.props.dangerouslySetInnerHTML!.__html);
    if (el.props?.children) {
      try {
        return jsonLdOf(el.props.children);
      } catch {
        // keep looking among siblings
      }
    }
  }
  throw new Error('no JSON-LD script');
}

const post = (slug: string) => postsSlugMetadata({ params: Promise.resolve({ slug }) });

describe('og:image for posts', () => {
  test('a coverless post shares its generated card in og and twitter', async () => {
    const url = `${SITE}/og/posts/code-block-features-showcase.png`;
    expect(shareImages(await post('code-block-features-showcase'))).toEqual({ og: url, card: 'summary_large_image', twitter: url });
  });

  test('a post with a cover keeps sharing the cover', async () => {
    expect(shareImages(await post('understanding-react-hooks')).og).toBe(`${SITE}/images/antelope-canyon.jpg`);
  });

  test('a series post on its autoPaths URL, with a Unicode slug', async () => {
    const md = await secondLevelMetadata({ params: Promise.resolve({ slug: 'markdown-showcase', postSlug: '中文测试文章' }) });
    expect(shareImages(md).og).toBe(`${SITE}/og/markdown-showcase/${encodeURIComponent('中文测试文章')}.png`);
  });

  test('a locale-tree post shares its own /og/zh/ card', async () => {
    const md = await deepMetadata({ params: Promise.resolve({ slug: 'zh', postSlug: 'posts', rest: ['zh-original-demo'] }) });
    expect(shareImages(md).og).toBe(`${SITE}/og/zh/posts/zh-original-demo.png`);
  });

  test('with generateOgImages off, a coverless post falls back to the site image', async () => {
    siteConfig.generateOgImages = false;
    expect(shareImages(await post('code-block-features-showcase')).og).toBe(`${SITE}${siteConfig.ogImage}`);
  });

  test('the post JSON-LD image matches og:image', () => {
    const page = RenderPostPage({ post: getPostBySlug('code-block-features-showcase')!, locale: 'en' });
    expect(jsonLdOf(page)['@graph'][0].image?.url).toBe(`${SITE}/og/posts/code-block-features-showcase.png`);
  });
});

describe('og:image for notes', () => {
  test('a note gains a card and a large twitter card', async () => {
    const url = `${SITE}/og/notes/tailwind-v4.png`;
    expect(shareImages(await noteMetadata({ params: Promise.resolve({ slug: 'tailwind-v4' }) }))).toEqual({
      og: url,
      card: 'summary_large_image',
      twitter: url,
    });
  });

  test('with generateOgImages off, a note shares no image and no twitter card, as before', async () => {
    siteConfig.generateOgImages = false;
    const md = await noteMetadata({ params: Promise.resolve({ slug: 'tailwind-v4' }) });
    expect(md.openGraph?.images).toBeUndefined();
    expect(md.twitter).toBeUndefined();
  });
});

describe('og:image for book chapters', () => {
  test("a chapter of a book with only a text: cover shares the chapter's card", async () => {
    const md = await chapterMetadata({ params: Promise.resolve({ slug: 'notes-on-thinking', chapter: ['mental-models'] }) });
    const url = `${SITE}/og/books/notes-on-thinking/mental-models.png`;
    expect(shareImages(md)).toEqual({ og: url, card: 'summary_large_image', twitter: url });
  });

  test("a chapter of a book with a cover shares the book's cover", async () => {
    const md = await chapterMetadata({ params: Promise.resolve({ slug: 'sample-book', chapter: ['setup'] }) });
    expect(shareImages(md)).toMatchObject({ og: `${SITE}/images/flowers.jpg`, card: 'summary_large_image' });
  });

  test('the chapter JSON-LD carries the same image', () => {
    const body = BookChapterBody({ locale: 'en', bookSlug: 'notes-on-thinking', chapterId: 'mental-models' });
    expect(jsonLdOf(body)['@graph'][0].image?.url).toBe(`${SITE}/og/books/notes-on-thinking/mental-models.png`);
  });
});

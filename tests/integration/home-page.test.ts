import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderAsync } from '../../src/test-utils/render';
import Home from '../../src/app/page';
import LocaleRootPage from '../../src/app/[slug]/page';
import CuratedSeriesSection from '../../src/components/CuratedSeriesSection';
import FeaturedStoriesSection from '../../src/components/FeaturedStoriesSection';
import LatestWritingSection from '../../src/components/LatestWritingSection';
import SelectedBooksSection from '../../src/components/SelectedBooksSection';
import { getAllPosts } from '../../src/lib/content/posts';
import { getPostUrl } from '../../src/lib/urls';

// The default home and the locale homes share HomeBody; the sections link
// into the home's own tree.

/** In-page `#id` hrefs with no element of that id: the hero chips jump to sections. */
function danglingFragments(html: string): string[] {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  return [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.has(id));
}

describe('home pages', () => {
  test('the default home shows flows, and each hero chip has its section', async () => {
    const html = await renderAsync(Home());
    expect(html).toContain('id="recent-flows"');
    expect(html).toContain('href="#featured-posts"');
    expect(danglingFragments(html)).toEqual([]);
  });

  test('a collection card links its posts where they live, in the collection\'s context', async () => {
    const html = await renderAsync(Home());
    // modern-web-dev is a featured collection: its items belong to other series
    // or none, so /modern-web-dev/<slug> would only reach a redirect alias.
    expect(html).toContain('href="/digital-garden/02-architecture?collection=modern-web-dev"');
    expect(html).not.toMatch(/href="\/modern-web-dev\/[^"]/);
  });

  test('/zh/ shows the zh tree\'s featured posts, series and books, without flows', async () => {
    const html = await renderAsync(LocaleRootPage({ params: Promise.resolve({ slug: 'zh' }) }), { locale: 'zh' });
    for (const id of ['featured-posts', 'latest-posts', 'featured-series', 'featured-books']) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('href="/zh/series/digital-garden"');
    expect(html).toContain('href="/zh/books/sample-book"');
    expect(html).toContain('href="/zh/posts"'); // the latest section's "all posts" link
    expect(html).not.toContain('id="recent-flows"');
    expect(html).not.toContain('href="#recent-flows"');
    expect(danglingFragments(html)).toEqual([]);
    // A post with no category (the i18n routing post) shows the default in Chinese.
    expect(html).toContain('未分类');
    expect(html).not.toContain('Uncategorized');
    // Every content link stays in the zh tree.
    const unprefixed = [...html.matchAll(/href="(\/(?:posts|series|books)[^"]*)"/g)].map((m) => m[1]);
    expect(unprefixed).toEqual([]);
  });
});

describe('home sections link into their locale tree', () => {
  const render = (element: Parameters<typeof renderAsync>[0]) => renderAsync(element, { locale: 'zh' });

  test('series', async () => {
    const html = await render(createElement(CuratedSeriesSection, {
      allSeries: [{
        name: 'garden', title: '花园', excerpt: '摘要', url: '/zh/series/garden', postCount: 1,
        topPosts: [{ slug: 'first', title: '第一篇', url: '/zh/garden/first' }], date: '2026-01-01',
      }],
      maxItems: 6,
      locale: 'zh',
    }));
    expect(html).toContain('href="/zh/series"');
    expect(html).toContain('href="/zh/series/garden"');
    expect(html).toContain('href="/zh/garden/first"');
  });

  test('books', async () => {
    const html = await render(createElement(SelectedBooksSection, {
      books: [{ slug: 'handbook', title: '手册', authors: ['Amytis'], chapterCount: 1, firstChapter: 'intro', date: '2026-01-01' }],
      locale: 'zh',
    }));
    expect(html).toContain('href="/zh/books"');
    expect(html).toContain('href="/zh/books/handbook"');
    expect(html).toContain('href="/zh/books/handbook/intro"');
  });

  test('featured posts', async () => {
    const featured = await render(createElement(FeaturedStoriesSection, {
      allFeatured: [{ slug: 'hello', title: '你好', excerpt: '摘要', date: '2026-01-01', category: 'Notes', readingMinutes: 1 }],
      maxItems: 4,
      locale: 'zh',
    }));
    expect(featured).toContain('href="/zh/posts/hello"');
  });

  test('the latest section shows its posts, and links to a listing only when one exists', async () => {
    const posts = getAllPosts('zh').slice(0, 1);
    const postLink = `href="${getPostUrl(posts[0])}`;
    const linked = await render(createElement(LatestWritingSection, { posts, locale: 'zh', allPostsUrl: '/zh/posts' }));
    expect(linked).toContain('href="/zh/posts"');
    expect(linked).toContain(postLink);
    // Every home post in an excluded series: listed here, but no /zh/posts/.
    const unlinked = await render(createElement(LatestWritingSection, { posts, locale: 'zh', allPostsUrl: null }));
    expect(unlinked).not.toContain('href="/zh/posts"');
    expect(unlinked).toContain(postLink);
    // No posts at all: no section.
    expect(await render(createElement(LatestWritingSection, { posts: [], locale: 'zh', allPostsUrl: null }))).toBe('');
  });
});

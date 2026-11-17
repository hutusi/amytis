import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderAsync } from '../../src/test-utils/render';
import Home from '../../src/app/page';
import LocaleRootPage from '../../src/app/[slug]/page';
import CuratedSeriesSection from '../../src/components/CuratedSeriesSection';
import FeaturedStoriesSection from '../../src/components/FeaturedStoriesSection';
import LatestWritingSection from '../../src/components/LatestWritingSection';
import SelectedBooksSection from '../../src/components/SelectedBooksSection';

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

  test('/zh/ has no flows section, and no hero chip points at a missing section', async () => {
    const html = await renderAsync(LocaleRootPage({ params: Promise.resolve({ slug: 'zh' }) }), { locale: 'zh' });
    expect(html).not.toContain('id="recent-flows"');
    expect(html).not.toContain('href="#recent-flows"');
    expect(danglingFragments(html)).toEqual([]);
    expect(html).toContain('href="/zh/posts"'); // the latest section's "all posts" link
  });
});

describe('home sections link into their locale tree', () => {
  const render = (element: Parameters<typeof renderAsync>[0]) => renderAsync(element, { locale: 'zh' });

  test('series', async () => {
    const html = await render(createElement(CuratedSeriesSection, {
      allSeries: [{
        name: 'garden', title: '花园', excerpt: '摘要', url: '/zh/series/garden', postCount: 1,
        topPosts: [{ slug: 'first', title: '第一篇' }], date: '2026-01-01',
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

  test('featured and latest posts', async () => {
    const featured = await render(createElement(FeaturedStoriesSection, {
      allFeatured: [{ slug: 'hello', title: '你好', excerpt: '摘要', date: '2026-01-01', category: 'Notes', readingMinutes: 1 }],
      maxItems: 4,
      locale: 'zh',
    }));
    expect(featured).toContain('href="/zh/posts/hello"');
    const latest = await render(createElement(LatestWritingSection, { posts: [], locale: 'zh' }));
    expect(latest).toContain('href="/zh/posts"');
  });
});

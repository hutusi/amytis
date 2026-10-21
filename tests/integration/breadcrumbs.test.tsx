import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getBookChapterBreadcrumbs, getPostBreadcrumbs } from '@/lib/breadcrumbs';
import { getAllPosts, getPostBySlug } from '@/lib/content/posts';
import { getSeriesData } from '@/lib/content/series';
import { getBookChapter, getBookData } from '@/lib/content/books';
import { buildBookChapterJsonLd } from '@/lib/json-ld';

const trailFor = (slug: string, locale = 'en') => {
  const post = getPostBySlug(slug, locale);
  if (!post) throw new Error(`no post ${slug} (${locale})`);
  const seriesTitle = post.series ? getSeriesData(post.series, post.locale)?.title : undefined;
  return { post, trail: getPostBreadcrumbs(post, seriesTitle, locale) };
};

describe('post trails on real content', () => {
  test('a series post goes Series › series › post', () => {
    const { post, trail } = trailFor('syntax-highlighting');
    expect(trail.map((c) => c.href)).toEqual(['/series', '/series/markdown-showcase', undefined]);
    expect(trail[1].label).toBe(getSeriesData('markdown-showcase')!.title);
    expect(trail[2].label).toBe(post.title);
  });

  test('a Unicode-slug post keeps its series trail', () => {
    const { trail } = trailFor('中文测试文章');
    expect(trail[1].href).toBe('/series/markdown-showcase');
  });

  test('a standalone post goes Articles › post', () => {
    const standalone = getAllPosts().find((p) => !p.series && (p.layout ?? 'post') === 'post');
    expect(standalone).toBeTruthy();
    const { trail } = trailFor(standalone!.slug);
    expect(trail.map((c) => c.label)).toEqual(['Articles', standalone!.title]);
  });

  test('a zh series post stays under /zh/ with zh labels', () => {
    const { trail } = trailFor('di-yi-pian', 'zh');
    expect(trail.map((c) => c.href)).toEqual(['/zh/series', '/zh/series/zh-demo-series', undefined]);
    expect(trail[0].label).toBe('系列');
  });
});

describe('chapter trails on real content', () => {
  test('a chapter in a part shows the part, and its JSON-LD keeps only pages', () => {
    const book = getBookData('sample-book')!;
    const chapter = getBookChapter('sample-book', 'setup')!;
    const trail = getBookChapterBreadcrumbs(book, { id: 'setup', title: chapter.title }, 'en');
    expect(trail.map((c) => c.label)).toEqual(['Books', book.title, 'Part I: Getting Started', chapter.title]);
    expect(trail[2].href).toBeUndefined();

    const graph = buildBookChapterJsonLd({
      chapter,
      book,
      chapterUrl: 'https://example.com/books/sample-book/setup/',
      bookUrl: 'https://example.com/books/sample-book/',
      siteTitle: 'T',
      siteUrl: 'https://example.com',
      breadcrumbs: trail,
    });
    const list = graph['@graph'][1];
    if (list['@type'] !== 'BreadcrumbList') throw new Error('expected BreadcrumbList node');
    expect(list.itemListElement.map((step) => step.item)).toEqual([
      'https://example.com/books/',
      'https://example.com/books/sample-book/',
      'https://example.com/books/sample-book/setup/',
    ]);
  });
});

describe('<Breadcrumbs>', () => {
  test('an ordered trail: links, plain-text groups, and the current page last', () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        locale="en"
        items={[{ label: 'Books', href: '/books' }, { label: 'Part I' }, { label: 'Setup' }]}
      />,
    );
    expect(html).toContain('<nav aria-label="Breadcrumb"');
    expect(html).toMatch(/<ol[^>]*><li[^>]*><a [^>]*href="\/books"[^>]*>Books<\/a><\/li>/);
    expect(html).toMatch(/<span class="max-w-\[14rem\] truncate">Part I<\/span>/);
    expect(html).toMatch(/<span aria-current="page"[^>]*>Setup<\/span><\/li><\/ol><\/nav>$/);
    expect(html.match(/aria-hidden="true">›</g)).toHaveLength(2);
  });

  test('localizes its landmark label and renders nothing for an empty trail', () => {
    expect(renderToStaticMarkup(<Breadcrumbs locale="zh" items={[{ label: '文章', href: '/zh/posts' }, { label: 'x' }]} />))
      .toContain('aria-label="面包屑导航"');
    expect(renderToStaticMarkup(<Breadcrumbs locale="en" items={[]} />)).toBe('');
  });
});

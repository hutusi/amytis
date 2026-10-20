import { describe, expect, test } from 'bun:test';
import { getBookChapterBreadcrumbs, getPostBreadcrumbs } from './breadcrumbs';

describe('getPostBreadcrumbs', () => {
  test('a series post leads back through the series', () => {
    expect(getPostBreadcrumbs({ title: 'Routing', series: 'nextjs-deep-dive' }, 'Next.js Deep Dive', 'en')).toEqual([
      { label: 'Series', href: '/series' },
      { label: 'Next.js Deep Dive', href: '/series/nextjs-deep-dive' },
      { label: 'Routing' },
    ]);
  });

  test('falls back to the series slug when the series has no title', () => {
    expect(getPostBreadcrumbs({ title: 'X', series: 'untitled' }, undefined, 'en')[1]).toEqual({
      label: 'untitled',
      href: '/series/untitled',
    });
  });

  test('a standalone post leads back to the posts list, localized', () => {
    expect(getPostBreadcrumbs({ title: 'Hello' }, undefined, 'en')).toEqual([
      { label: 'Articles', href: '/posts' },
      { label: 'Hello' },
    ]);
    expect(getPostBreadcrumbs({ title: '你好' }, undefined, 'zh')).toEqual([
      { label: '文章', href: '/zh/posts' },
      { label: '你好' },
    ]);
  });
});

describe('getBookChapterBreadcrumbs', () => {
  const book = {
    slug: 'maths',
    title: 'Maths',
    chapters: [
      { id: 'intro', title: 'Intro' },
      { id: 'part-ch', title: 'In a part', part: 'Part I' },
      { id: 'linear/vectors', title: 'Vectors', section: 'Linear', sectionPath: ['Foundations', 'Linear'] },
    ],
  };

  test('every enclosing section, outermost first, as plain text', () => {
    expect(getBookChapterBreadcrumbs(book, { id: 'linear/vectors', title: 'Vectors' }, 'en')).toEqual([
      { label: 'Books', href: '/books' },
      { label: 'Maths', href: '/books/maths' },
      { label: 'Foundations' },
      { label: 'Linear' },
      { label: 'Vectors' },
    ]);
  });

  test('a part, or nothing between the book and a top-level chapter', () => {
    expect(getBookChapterBreadcrumbs(book, { id: 'part-ch', title: 'In a part' }, 'en').map((c) => c.label))
      .toEqual(['Books', 'Maths', 'Part I', 'In a part']);
    expect(getBookChapterBreadcrumbs(book, { id: 'intro', title: 'Intro' }, 'zh').map((c) => c.href))
      .toEqual(['/zh/books', '/zh/books/maths', undefined]);
  });
});

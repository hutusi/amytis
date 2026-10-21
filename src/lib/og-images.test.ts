import { describe, expect, test } from 'bun:test';
import { indexOgCards, ogImagePathFor } from './og-images';
import { hasOwnCover } from './image-utils';

describe('ogImagePathFor', () => {
  test('mirrors the page path under /og/', () => {
    expect(ogImagePathFor('/posts/hello/')).toBe('/og/posts/hello.png');
    expect(ogImagePathFor('/posts/hello')).toBe('/og/posts/hello.png');
  });

  test('keeps locale prefixes, nested chapter ids and Unicode slugs', () => {
    expect(ogImagePathFor('/zh/notes/bar')).toBe('/og/zh/notes/bar.png');
    expect(ogImagePathFor('/books/dmla/maths/linear/vectors')).toBe('/og/books/dmla/maths/linear/vectors.png');
    expect(ogImagePathFor('/markdown-showcase/中文测试文章/')).toBe('/og/markdown-showcase/中文测试文章.png');
  });
});

describe('indexOgCards', () => {
  const entry = (pagePath: string, title: string) => ({ kind: 'post' as const, pagePath, locale: 'en', title, authors: [] });

  test('keys each card by its image path', () => {
    const cards = indexOgCards([entry('/posts/a', 'A'), entry('/zh/posts/a', 'A zh')]);
    expect([...cards.keys()]).toEqual(['/og/posts/a.png', '/og/zh/posts/a.png']);
    expect(cards.get('/og/posts/a.png')?.title).toBe('A');
  });

  test('throws when two pages claim one image', () => {
    expect(() => indexOgCards([entry('/posts/a', 'First'), entry('/posts/a/', 'Second')])).toThrow(
      /\/og\/posts\/a\.png is claimed by both "First" and "Second"/,
    );
  });
});

describe('hasOwnCover', () => {
  test('real images count; text covers and unresolved relative paths do not', () => {
    expect(hasOwnCover('/images/lake.jpg')).toBe(true);
    expect(hasOwnCover('https://cdn.example.com/a.png')).toBe(true);
    expect(hasOwnCover('text:Issue 12')).toBe(false);
    expect(hasOwnCover('./cover.png')).toBe(false);
    expect(hasOwnCover('')).toBe(false);
    expect(hasOwnCover(undefined)).toBe(false);
  });
});

import { describe, expect, test } from 'bun:test';
import { normalizeCoverImage } from './cover-image';

describe('content/cover-image', () => {
  test('returns undefined and empty values unchanged', () => {
    expect(normalizeCoverImage(undefined, '/posts/my-post')).toBeUndefined();
    expect(normalizeCoverImage('', '/posts/my-post')).toBe('');
  });

  test('leaves http(s) URLs untouched', () => {
    expect(normalizeCoverImage('https://example.com/cover.jpg', '/posts/my-post'))
      .toBe('https://example.com/cover.jpg');
    expect(normalizeCoverImage('http://example.com/cover.jpg', '/posts/my-post'))
      .toBe('http://example.com/cover.jpg');
  });

  test('a relative filename merely starting with "http" still gets prefixed', () => {
    expect(normalizeCoverImage('httpFooter.png', '/posts/my-post'))
      .toBe('/posts/my-post/httpFooter.png');
  });

  test('leaves site-absolute paths untouched', () => {
    expect(normalizeCoverImage('/images/cover.jpg', '/posts/my-post'))
      .toBe('/images/cover.jpg');
  });

  test('leaves text: pseudo-images untouched', () => {
    expect(normalizeCoverImage('text:Some Title Card', '/posts/my-post'))
      .toBe('text:Some Title Card');
  });

  test('prefixes bare relative paths with the public base path', () => {
    expect(normalizeCoverImage('cover.jpg', '/posts/my-post'))
      .toBe('/posts/my-post/cover.jpg');
    expect(normalizeCoverImage('images/cover.jpg', '/books/my-book'))
      .toBe('/books/my-book/images/cover.jpg');
  });

  test('strips a single leading ./ before prefixing', () => {
    expect(normalizeCoverImage('./cover.jpg', '/posts/my-post'))
      .toBe('/posts/my-post/cover.jpg');
    expect(normalizeCoverImage('./images/cover.jpg', '/books/my-book'))
      .toBe('/books/my-book/images/cover.jpg');
  });
});

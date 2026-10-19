import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeAbsoluteUrls, { type AbsoluteUrlsOptions } from './rehype-absolute-urls';

const base: AbsoluteUrlsOptions = {
  pageUrl: 'https://site.test/series-x/my-post/',
  siteUrl: 'https://site.test',
  imageBaseSlug: 'posts/my-post',
};

function run(html: string, options: AbsoluteUrlsOptions = base): string {
  return String(
    unified().use(rehypeParse, { fragment: true }).use(rehypeAbsoluteUrls, options).use(rehypeStringify).processSync(html),
  );
}

describe('rehypeAbsoluteUrls', () => {
  test('co-located images resolve against the asset base, not the page URL', () => {
    expect(run('<img src="./a.png">')).toBe('<img src="https://site.test/posts/my-post/a.png">');
    expect(run('<img src="a.png">')).toBe('<img src="https://site.test/posts/my-post/a.png">');
    expect(run('<img src="/images/a.png">')).toBe('<img src="https://site.test/images/a.png">');
  });

  test('applies the CDN prefix to local images', () => {
    expect(run('<img src="./a.png">', { ...base, cdnBaseUrl: 'https://cdn.test/' }))
      .toBe('<img src="https://cdn.test/posts/my-post/a.png">');
  });

  test('links and other media resolve against the page URL', () => {
    expect(run('<a href="../other/">x</a>')).toBe('<a href="https://site.test/series-x/other/">x</a>');
    expect(run('<a href="/tags/a/">x</a>')).toBe('<a href="https://site.test/tags/a/">x</a>');
    expect(run('<video poster="p.jpg" src="v.mp4"></video>'))
      .toBe('<video poster="https://site.test/series-x/my-post/p.jpg" src="https://site.test/series-x/my-post/v.mp4"></video>');
  });

  test('leaves absolute, protocol-relative, scheme and fragment URLs alone', () => {
    const html = '<a href="https://x.test/">a</a><a href="mailto:a@b.test">b</a><a href="#top">c</a><img src="//cdn.test/a.png">';
    expect(run(html)).toBe(html);
  });

  test('rewrites srcset candidates and keeps their descriptors', () => {
    expect(run('<img srcset="a.png 1x, /b.png 2x">'))
      .toBe('<img srcset="https://site.test/series-x/my-post/a.png 1x, https://site.test/b.png 2x">');
  });

  test('never touches text that only looks like an attribute', () => {
    expect(run('<pre><code>&lt;img src="x.png"&gt;</code></pre>')).toBe('<pre><code>&#x3C;img src="x.png"></code></pre>');
  });
});

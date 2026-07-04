import { describe, expect, test } from 'bun:test';
import {
  buildBookChapterJsonLd,
  buildBookJsonLd,
  buildPostJsonLd,
  buildWebsiteJsonLd,
  resolveImageUrl,
  serializeJsonLd,
} from './json-ld';

const SITE_URL = 'https://example.com';
const DEFAULT_OG = '/og-image.png';

const basePost = {
  title: 'Hello World',
  excerpt: 'A first post.',
  date: '2026-01-15',
  authors: ['Ada Lovelace', 'Alan Turing'],
  tags: ['intro', 'meta'],
};

const basePostParams = {
  post: basePost,
  postUrl: `${SITE_URL}/posts/hello-world/`,
  siteTitle: 'Example Garden',
  siteUrl: SITE_URL,
  defaultOgImage: DEFAULT_OG,
};

describe('resolveImageUrl', () => {
  test('passes external http(s) URLs through unchanged', () => {
    expect(resolveImageUrl('https://cdn.example.org/a.jpg', DEFAULT_OG, SITE_URL)).toBe(
      'https://cdn.example.org/a.jpg'
    );
    expect(resolveImageUrl('http://cdn.example.org/a.jpg', DEFAULT_OG, SITE_URL)).toBe(
      'http://cdn.example.org/a.jpg'
    );
  });

  test('prefixes site-relative paths with the site URL', () => {
    expect(resolveImageUrl('/books/x/cover.jpg', DEFAULT_OG, SITE_URL)).toBe(
      `${SITE_URL}/books/x/cover.jpg`
    );
  });

  test('inserts a slash for bare relative paths', () => {
    expect(resolveImageUrl('images/cover.jpg', DEFAULT_OG, SITE_URL)).toBe(
      `${SITE_URL}/images/cover.jpg`
    );
  });

  test('falls back to the default OG image for text: placeholders', () => {
    expect(resolveImageUrl('text:Hello', DEFAULT_OG, SITE_URL)).toBe(`${SITE_URL}${DEFAULT_OG}`);
  });

  test('falls back to the default OG image for ./ relative paths', () => {
    expect(resolveImageUrl('./images/cover.jpg', DEFAULT_OG, SITE_URL)).toBe(
      `${SITE_URL}${DEFAULT_OG}`
    );
  });

  test('falls back to the default OG image when cover is undefined', () => {
    expect(resolveImageUrl(undefined, DEFAULT_OG, SITE_URL)).toBe(`${SITE_URL}${DEFAULT_OG}`);
  });

  test('an absolute default OG image is not prefixed', () => {
    expect(resolveImageUrl(undefined, 'https://cdn.example.org/og.png', SITE_URL)).toBe(
      'https://cdn.example.org/og.png'
    );
  });
});

describe('serializeJsonLd', () => {
  test('produces valid JSON that round-trips to the input graph', () => {
    const graph = buildPostJsonLd(basePostParams);
    expect(JSON.parse(serializeJsonLd(graph))).toEqual(JSON.parse(JSON.stringify(graph)));
  });

  test('escapes < so a value cannot close an inline <script> block', () => {
    const graph = buildWebsiteJsonLd({
      siteTitle: 'Evil</script><script>alert(1)</script>',
      siteUrl: SITE_URL,
      description: 'a < b',
    });
    const out = serializeJsonLd(graph);
    expect(out).not.toContain('<');
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script');
    // Escaping must be lossless
    const parsed = JSON.parse(out) as { '@graph': { name: string }[] };
    expect(parsed['@graph'][0].name).toBe('Evil</script><script>alert(1)</script>');
  });

  test('leaves > and & intact (only < is dangerous inside <script>)', () => {
    const graph = buildWebsiteJsonLd({
      siteTitle: 'a > b & c',
      siteUrl: SITE_URL,
    });
    const out = serializeJsonLd(graph);
    const parsed = JSON.parse(out) as { '@graph': { name: string }[] };
    expect(parsed['@graph'][0].name).toBe('a > b & c');
  });
});

describe('buildWebsiteJsonLd', () => {
  test('builds a single WebSite node in a schema.org graph', () => {
    const graph = buildWebsiteJsonLd({
      siteTitle: 'Example Garden',
      siteUrl: SITE_URL,
      description: 'A garden.',
    });
    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toHaveLength(1);
    const [node] = graph['@graph'];
    expect(node['@type']).toBe('WebSite');
    if (node['@type'] !== 'WebSite') throw new Error('expected WebSite node');
    expect(node.name).toBe('Example Garden');
    expect(node.url).toBe(SITE_URL);
    expect(node.description).toBe('A garden.');
  });

  test('strips trailing slashes from the site URL', () => {
    const graph = buildWebsiteJsonLd({ siteTitle: 'T', siteUrl: `${SITE_URL}//` });
    expect(graph['@graph'][0].url).toBe(SITE_URL);
  });

  test('omits description when empty or missing', () => {
    const graph = buildWebsiteJsonLd({ siteTitle: 'T', siteUrl: SITE_URL, description: '' });
    const [node] = graph['@graph'];
    if (node['@type'] !== 'WebSite') throw new Error('expected WebSite node');
    expect(node.description).toBeUndefined();
  });
});

describe('buildPostJsonLd', () => {
  test('builds a BlogPosting node with headline, url, and dates', () => {
    const graph = buildPostJsonLd(basePostParams);
    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toHaveLength(1);
    const [node] = graph['@graph'];
    expect(node['@type']).toBe('BlogPosting');
    if (node['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(node.headline).toBe(basePost.title);
    expect(node.description).toBe(basePost.excerpt);
    expect(node.url).toBe(basePostParams.postUrl);
    expect(node.datePublished).toBe(basePost.date);
    expect(node.dateModified).toBe(basePost.date);
    expect(node.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': basePostParams.postUrl });
  });

  test('maps each author to a Person node', () => {
    const graph = buildPostJsonLd(basePostParams);
    const [node] = graph['@graph'];
    if (node['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(node.author).toEqual([
      { '@type': 'Person', name: 'Ada Lovelace' },
      { '@type': 'Person', name: 'Alan Turing' },
    ]);
  });

  test('publisher is an Organization with a trailing-slash-free absolute URL', () => {
    const graph = buildPostJsonLd({ ...basePostParams, siteUrl: `${SITE_URL}/` });
    const [node] = graph['@graph'];
    if (node['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(node.publisher).toEqual({
      '@type': 'Organization',
      name: 'Example Garden',
      url: SITE_URL,
    });
  });

  test('image resolves to an absolute URL', () => {
    const withCover = buildPostJsonLd({
      ...basePostParams,
      post: { ...basePost, coverImage: '/posts/hello/cover.jpg' },
    });
    const [coverNode] = withCover['@graph'];
    if (coverNode['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(coverNode.image).toEqual({
      '@type': 'ImageObject',
      url: `${SITE_URL}/posts/hello/cover.jpg`,
    });

    const withoutCover = buildPostJsonLd(basePostParams);
    const [defaultNode] = withoutCover['@graph'];
    if (defaultNode['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(defaultNode.image.url).toBe(`${SITE_URL}${DEFAULT_OG}`);
    expect(defaultNode.image.url.startsWith('https://')).toBe(true);
  });

  test('joins tags into keywords, undefined when there are no tags', () => {
    const tagged = buildPostJsonLd(basePostParams)['@graph'][0];
    if (tagged['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(tagged.keywords).toBe('intro, meta');

    const untagged = buildPostJsonLd({
      ...basePostParams,
      post: { ...basePost, tags: [] },
    })['@graph'][0];
    if (untagged['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(untagged.keywords).toBeUndefined();
  });

  test('empty excerpt becomes an undefined description', () => {
    const graph = buildPostJsonLd({ ...basePostParams, post: { ...basePost, excerpt: '' } });
    const [node] = graph['@graph'];
    if (node['@type'] !== 'BlogPosting') throw new Error('expected BlogPosting node');
    expect(node.description).toBeUndefined();
  });
});

describe('buildBookJsonLd', () => {
  const baseBookParams = {
    book: {
      title: 'A Long Book',
      excerpt: 'About things.',
      date: '2025-06-01',
      authors: ['Ada Lovelace'],
      coverImage: '/books/long/cover.jpg',
    },
    bookUrl: `${SITE_URL}/books/long/`,
    siteTitle: 'Example Garden',
    siteUrl: SITE_URL,
    defaultOgImage: DEFAULT_OG,
  };

  test('builds a Book node with name, url, date, author, and publisher', () => {
    const graph = buildBookJsonLd(baseBookParams);
    expect(graph['@context']).toBe('https://schema.org');
    const [node] = graph['@graph'];
    expect(node['@type']).toBe('Book');
    if (node['@type'] !== 'Book') throw new Error('expected Book node');
    expect(node.name).toBe('A Long Book');
    expect(node.description).toBe('About things.');
    expect(node.url).toBe(baseBookParams.bookUrl);
    expect(node.datePublished).toBe('2025-06-01');
    expect(node.author).toEqual([{ '@type': 'Person', name: 'Ada Lovelace' }]);
    expect(node.publisher).toEqual({
      '@type': 'Organization',
      name: 'Example Garden',
      url: SITE_URL,
    });
    expect(node.image).toEqual({
      '@type': 'ImageObject',
      url: `${SITE_URL}/books/long/cover.jpg`,
    });
  });

  test('falls back to the default OG image when the book has no cover', () => {
    const graph = buildBookJsonLd({
      ...baseBookParams,
      book: { ...baseBookParams.book, coverImage: undefined },
    });
    const [node] = graph['@graph'];
    if (node['@type'] !== 'Book') throw new Error('expected Book node');
    expect(node.image?.url).toBe(`${SITE_URL}${DEFAULT_OG}`);
  });

  test('missing excerpt becomes an undefined description', () => {
    const graph = buildBookJsonLd({
      ...baseBookParams,
      book: { ...baseBookParams.book, excerpt: undefined },
    });
    const [node] = graph['@graph'];
    if (node['@type'] !== 'Book') throw new Error('expected Book node');
    expect(node.description).toBeUndefined();
  });
});

describe('buildBookChapterJsonLd', () => {
  const chapterParams = {
    chapter: { title: 'Chapter One', excerpt: 'It begins.' },
    book: { title: 'A Long Book', date: '2025-06-01', authors: ['Ada Lovelace'] },
    chapterUrl: `${SITE_URL}/books/long/ch-1/`,
    bookUrl: `${SITE_URL}/books/long/`,
    siteTitle: 'Example Garden',
    siteUrl: `${SITE_URL}/`,
  };

  test('builds an Article node linked to its parent Book', () => {
    const graph = buildBookChapterJsonLd(chapterParams);
    expect(graph['@context']).toBe('https://schema.org');
    const [node] = graph['@graph'];
    expect(node['@type']).toBe('Article');
    if (node['@type'] !== 'Article') throw new Error('expected Article node');
    expect(node.headline).toBe('Chapter One');
    expect(node.description).toBe('It begins.');
    expect(node.url).toBe(chapterParams.chapterUrl);
    expect(node.isPartOf).toEqual({
      '@type': 'Book',
      '@id': chapterParams.bookUrl,
      name: 'A Long Book',
    });
  });

  test('inherits date and authors from the book', () => {
    const graph = buildBookChapterJsonLd(chapterParams);
    const [node] = graph['@graph'];
    if (node['@type'] !== 'Article') throw new Error('expected Article node');
    expect(node.datePublished).toBe('2025-06-01');
    expect(node.author).toEqual([{ '@type': 'Person', name: 'Ada Lovelace' }]);
  });

  test('publisher URL has trailing slashes stripped', () => {
    const graph = buildBookChapterJsonLd(chapterParams);
    const [node] = graph['@graph'];
    if (node['@type'] !== 'Article') throw new Error('expected Article node');
    expect(node.publisher.url).toBe(SITE_URL);
  });

  test('missing chapter excerpt becomes an undefined description', () => {
    const graph = buildBookChapterJsonLd({
      ...chapterParams,
      chapter: { title: 'Chapter One' },
    });
    const [node] = graph['@graph'];
    if (node['@type'] !== 'Article') throw new Error('expected Article node');
    expect(node.description).toBeUndefined();
  });
});

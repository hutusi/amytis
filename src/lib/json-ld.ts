// ── Schema shape types ────────────────────────────────────────────────────────

interface SchemaOrganization {
  '@type': 'Organization';
  name: string;
  url: string;
}

interface SchemaPerson {
  '@type': 'Person';
  name: string;
}

interface SchemaImageObject {
  '@type': 'ImageObject';
  url: string;
}

interface SchemaBlogPosting {
  '@type': 'BlogPosting';
  headline: string;
  description: string | undefined;
  url: string;
  datePublished: string;
  dateModified: string;
  author: SchemaPerson[];
  publisher: SchemaOrganization;
  image: SchemaImageObject;
  keywords: string | undefined;
  mainEntityOfPage: { '@type': 'WebPage'; '@id': string };
}

interface SchemaBook {
  '@type': 'Book';
  name: string;
  description: string | undefined;
  url: string;
  datePublished: string;
  author: SchemaPerson[];
  publisher: SchemaOrganization;
  image: SchemaImageObject | undefined;
}

interface SchemaArticle {
  '@type': 'Article';
  headline: string;
  description: string | undefined;
  url: string;
  datePublished: string;
  author: SchemaPerson[];
  publisher: SchemaOrganization;
  isPartOf: { '@type': 'Book'; '@id': string; name: string };
}

type SchemaNode = SchemaBlogPosting | SchemaBook | SchemaArticle;

interface SchemaGraph {
  '@context': 'https://schema.org';
  '@graph': SchemaNode[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPublisher(siteTitle: string, siteUrl: string): SchemaOrganization {
  return { '@type': 'Organization', name: siteTitle, url: siteUrl };
}

function buildAuthors(names: string[]): SchemaPerson[] {
  return names.map(name => ({ '@type': 'Person', name }));
}

/**
 * Resolve an absolute image URL for structured data.
 * Mirrors the cover-image logic used in generateMetadata across all page components:
 * use coverImage only if it is an external HTTP URL, otherwise fall back to defaultOgImage.
 */
function resolveImageUrl(
  coverImage: string | undefined,
  defaultOgImage: string,
  siteUrl: string,
): string {
  if (coverImage && coverImage.startsWith('http')) {
    return coverImage;
  }
  return defaultOgImage.startsWith('http') ? defaultOgImage : `${siteUrl}${defaultOgImage}`;
}

function wrapGraph(nodes: SchemaNode[]): SchemaGraph {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

// ── Public param types ────────────────────────────────────────────────────────

export interface PostJsonLdParams {
  post: {
    title: string;
    excerpt: string;
    date: string;
    authors: string[];
    tags: string[];
    coverImage?: string;
  };
  postUrl: string;
  siteTitle: string;
  siteUrl: string;
  defaultOgImage: string;
}

export interface BookJsonLdParams {
  book: {
    title: string;
    excerpt?: string;
    date: string;
    authors: string[];
    coverImage?: string;
  };
  bookUrl: string;
  siteTitle: string;
  siteUrl: string;
  defaultOgImage: string;
}

export interface BookChapterJsonLdParams {
  chapter: {
    title: string;
    excerpt?: string;
  };
  book: {
    title: string;
    date: string;
    authors: string[];
  };
  chapterUrl: string;
  bookUrl: string;
  siteTitle: string;
  siteUrl: string;
}

// ── Builders ──────────────────────────────────────────────────────────────────

export function buildPostJsonLd(params: PostJsonLdParams): SchemaGraph {
  const { post, postUrl, siteTitle, siteUrl, defaultOgImage } = params;
  const base = siteUrl.replace(/\/+$/, '');

  const node: SchemaBlogPosting = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    url: postUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: buildAuthors(post.authors),
    publisher: buildPublisher(siteTitle, base),
    image: { '@type': 'ImageObject', url: resolveImageUrl(post.coverImage, defaultOgImage, base) },
    keywords: post.tags.length > 0 ? post.tags.join(', ') : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
  };

  return wrapGraph([node]);
}

export function buildBookJsonLd(params: BookJsonLdParams): SchemaGraph {
  const { book, bookUrl, siteTitle, siteUrl, defaultOgImage } = params;
  const base = siteUrl.replace(/\/+$/, '');
  const imageUrl = resolveImageUrl(book.coverImage, defaultOgImage, base);

  const node: SchemaBook = {
    '@type': 'Book',
    name: book.title,
    description: book.excerpt || undefined,
    url: bookUrl,
    datePublished: book.date,
    author: buildAuthors(book.authors),
    publisher: buildPublisher(siteTitle, base),
    image: imageUrl ? { '@type': 'ImageObject', url: imageUrl } : undefined,
  };

  return wrapGraph([node]);
}

export function buildBookChapterJsonLd(params: BookChapterJsonLdParams): SchemaGraph {
  const { chapter, book, chapterUrl, bookUrl, siteTitle, siteUrl } = params;
  const base = siteUrl.replace(/\/+$/, '');

  const node: SchemaArticle = {
    '@type': 'Article',
    headline: chapter.title,
    description: chapter.excerpt || undefined,
    url: chapterUrl,
    datePublished: book.date,
    author: buildAuthors(book.authors),
    publisher: buildPublisher(siteTitle, base),
    isPartOf: { '@type': 'Book', '@id': bookUrl, name: book.title },
  };

  return wrapGraph([node]);
}

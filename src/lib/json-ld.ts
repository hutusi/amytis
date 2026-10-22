import { hasOwnCover } from './image-utils';

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
  inLanguage: string | undefined;
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
  inLanguage: string | undefined;
}

interface SchemaArticle {
  '@type': 'Article';
  headline: string;
  description: string | undefined;
  url: string;
  datePublished: string;
  author: SchemaPerson[];
  publisher: SchemaOrganization;
  image?: SchemaImageObject;
  inLanguage: string | undefined;
  isPartOf: { '@type': 'Book'; '@id': string; name: string };
}

interface SchemaWebSite {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  inLanguage?: string;
}

interface SchemaListItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

interface SchemaBreadcrumbList {
  '@type': 'BreadcrumbList';
  itemListElement: SchemaListItem[];
}

type SchemaNode = SchemaBlogPosting | SchemaBook | SchemaArticle | SchemaWebSite | SchemaBreadcrumbList;

/** A visible breadcrumb step (structurally `BreadcrumbItem` from src/lib/breadcrumbs.ts). */
export interface JsonLdBreadcrumb {
  label: string;
  href?: string;
}

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
 * Accepts external URLs (http/https) and site-relative paths (/books/..., /posts/...).
 * Rejects relative paths (./images/...) and text placeholders (text:...).
 */
export function resolveImageUrl(
  coverImage: string | undefined,
  defaultOgImage: string,
  siteUrl: string,
): string {
  const toAbsolute = (url: string) => {
    if (url.startsWith('http')) return url;
    // Protocol-relative CDN URL: not a site path.
    if (url.startsWith('//')) return `https:${url}`;
    return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`;
  };

  if (hasOwnCover(coverImage)) {
    return toAbsolute(coverImage);
  }
  return toAbsolute(defaultOgImage);
}

/**
 * Serialize a JSON-LD graph to a string safe for injection into a <script> tag.
 * JSON.stringify does not escape '<', so a value containing '</script>' could
 * break the script block. Replacing '<' with '\u003c' prevents this.
 */
export function serializeJsonLd(schema: SchemaGraph): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

function wrapGraph(nodes: SchemaNode[]): SchemaGraph {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/**
 * BreadcrumbList for the visible trail. Google needs an `item` URL on every
 * step but the last, so steps without a page (book parts and sections) are
 * left out; the last step is the page itself. URLs are absolute, in the
 * trailing-slash form the export serves.
 */
function buildBreadcrumbList(crumbs: JsonLdBreadcrumb[], pageUrl: string, base: string): SchemaBreadcrumbList | null {
  if (crumbs.length === 0) return null;
  const withSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
  const steps = [
    ...crumbs.slice(0, -1).filter((c) => c.href).map((c) => ({ name: c.label, item: withSlash(`${base}${c.href}`) })),
    { name: crumbs[crumbs.length - 1].label, item: pageUrl },
  ];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((step, index) => ({ '@type': 'ListItem', position: index + 1, ...step })),
  };
}

export interface WebsiteJsonLdParams {
  siteTitle: string;
  siteUrl: string;
  description?: string;
  /** BCP-47 language of the page (schema.org inLanguage); omitted when unset. */
  inLanguage?: string;
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
  /** BCP-47 language of the post (schema.org inLanguage); omitted when unset. */
  inLanguage?: string;
  /** The visible breadcrumb trail; adds a BreadcrumbList node. */
  breadcrumbs?: JsonLdBreadcrumb[];
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
  /** BCP-47 language of the book (schema.org inLanguage); omitted when unset. */
  inLanguage?: string;
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
  /** BCP-47 language of the chapter (schema.org inLanguage); omitted when unset. */
  inLanguage?: string;
  /** The visible breadcrumb trail; adds a BreadcrumbList node. */
  breadcrumbs?: JsonLdBreadcrumb[];
  /** Absolute share image (the page's og:image); omitted when unset. */
  image?: string;
}

// ── Builders ──────────────────────────────────────────────────────────────────

export function buildWebsiteJsonLd(params: WebsiteJsonLdParams): SchemaGraph {
  const { siteTitle, siteUrl, description, inLanguage } = params;
  const base = siteUrl.replace(/\/+$/, '');

  const node: SchemaWebSite = {
    '@type': 'WebSite',
    name: siteTitle,
    url: base,
    description: description || undefined,
    ...(inLanguage ? { inLanguage } : {}),
  };

  return wrapGraph([node]);
}

export function buildPostJsonLd(params: PostJsonLdParams): SchemaGraph {
  const { post, postUrl, siteTitle, siteUrl, defaultOgImage, inLanguage, breadcrumbs = [] } = params;
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
    inLanguage: inLanguage || undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
  };

  const trail = buildBreadcrumbList(breadcrumbs, postUrl, base);
  return wrapGraph(trail ? [node, trail] : [node]);
}

export function buildBookJsonLd(params: BookJsonLdParams): SchemaGraph {
  const { book, bookUrl, siteTitle, siteUrl, defaultOgImage, inLanguage } = params;
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
    inLanguage: inLanguage || undefined,
  };

  return wrapGraph([node]);
}

export function buildBookChapterJsonLd(params: BookChapterJsonLdParams): SchemaGraph {
  const { chapter, book, chapterUrl, bookUrl, siteTitle, siteUrl, inLanguage, breadcrumbs = [], image } = params;
  const base = siteUrl.replace(/\/+$/, '');

  const node: SchemaArticle = {
    '@type': 'Article',
    headline: chapter.title,
    description: chapter.excerpt || undefined,
    url: chapterUrl,
    datePublished: book.date,
    author: buildAuthors(book.authors),
    publisher: buildPublisher(siteTitle, base),
    ...(image ? { image: { '@type': 'ImageObject', url: image } } : {}),
    inLanguage: inLanguage || undefined,
    isPartOf: { '@type': 'Book', '@id': bookUrl, name: book.title },
  };

  const trail = buildBreadcrumbList(breadcrumbs, chapterUrl, base);
  return wrapGraph(trail ? [node, trail] : [node]);
}

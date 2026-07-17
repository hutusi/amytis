/**
 * Shared content data-layer types. This module must have ZERO runtime
 * imports — client components import these types freely, and a value
 * import here would drag `fs`-backed code into the client bundle.
 */
import type { Heading } from '../text-metrics';

export type { Heading };

export interface ExternalLink {
  name: string;
  url: string;
}

export type CollectionItem =
  | { series: string; exclude?: string[]; label?: string }
  | { post: string; label?: string };

/**
 * The minimal post fields the series/collection navigation UIs need — enough
 * to build links (getPostUrl reads slug + series) and render labels. Series and
 * collection lists cross the server→client boundary for every post in a series;
 * projecting to this keeps sibling article bodies out of the RSC payload.
 */
export interface PostNavItem {
  slug: string;
  title: string;
  date: string;
  series?: string;
}

export interface CollectionContext {
  slug: string;
  title: string;
  posts: PostNavItem[];
}

export interface PostData {
  slug: string;
  title: string;
  subtitle?: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  authors: string[];
  layout?: string;
  series?: string;
  seriesTitle?: string;
  coverImage?: string;
  sort?: 'date-desc' | 'date-asc' | 'manual';
  posts?: string[];
  type?: 'collection';
  items?: CollectionItem[];
  featured?: boolean;
  pinned?: boolean;
  draft?: boolean;
  latex?: boolean;
  toc?: boolean;
  commentable?: boolean;
  externalLinks?: ExternalLink[];
  redirectFrom?: string[];
  readingMinutes: number;
  wordCount: number;
  content: string;
  renderedHtml?: string;
  plainText?: string;
  headings: Heading[];
  contentLocales?: Record<string, { content: string; title?: string; excerpt?: string; headings?: Heading[] }>;
  /** Public-relative base path used for resolving co-located images (e.g. "posts/my-post" or "posts" for root flat files). */
  imageBaseSlug: string;
  sourceFormat?: 'markdown' | 'rst';
}

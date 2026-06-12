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

export interface CollectionContext {
  slug: string;
  title: string;
  posts: PostData[];
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

import type { Metadata } from 'next';
import { getTranslator, resolveLocaleValue } from '@/lib/i18n';
import type { TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';

interface ListingMetadataOptions {
  /** Locale the title/description strings resolve in. */
  locale: string;
  /** Section title key, e.g. 'posts' | 'books' | 'series' | 'notes' | 'flow'. */
  titleKey: TranslationKey;
  /** When both are set, the title gains a " - Page X of Y" segment. */
  page?: number;
  totalPages?: number;
  /** Pre-resolved description string; takes precedence over the key form. */
  description?: string;
  /** Pluralized description key, resolved with `{ count }`. */
  descriptionKey?: TranslationKey;
  /** Singular description key, used when `count === 1`. */
  descriptionOneKey?: TranslationKey;
  count?: number;
}

/**
 * Build the title/description Metadata for a listing route. Centralizes the
 * `${section} [- Page X of Y] | ${siteTitle}` title shape that was repeated in
 * every posts/notes/flows/books/series listing route, and standardizes
 * paginated titles on the `page_of_total` ("Page X of Y") form.
 */
export function createListingMetadata({
  locale,
  titleKey,
  page,
  totalPages,
  description,
  descriptionKey,
  descriptionOneKey,
  count,
}: ListingMetadataOptions): Metadata {
  const { t, tWith } = getTranslator(locale);
  // Strict build over silent failure: catch caller mistakes here rather than
  // emitting a quietly-wrong title/description. (We deliberately do NOT assert
  // page <= totalPages: paginationStaticParams emits a sentinel `page: 2` even
  // for single-page listings, so generateMetadata legitimately runs for an
  // out-of-range page that the route component then notFound()s.)
  if ((page != null) !== (totalPages != null)) {
    throw new Error('createListingMetadata: page and totalPages must both be set or both be unset');
  }

  const siteTitle = resolveLocaleValue(siteConfig.title, locale);
  const section = t(titleKey);
  const title =
    page != null && totalPages != null
      ? `${section} - ${tWith('page_of_total', { page, total: totalPages })} | ${siteTitle}`
      : `${section} | ${siteTitle}`;

  let resolvedDescription = description;
  if (resolvedDescription === undefined && descriptionKey) {
    if (count === undefined) {
      throw new Error('createListingMetadata: count is required when descriptionKey is set');
    }
    resolvedDescription =
      count === 1 && descriptionOneKey ? t(descriptionOneKey) : tWith(descriptionKey, { count });
  }

  // Full OG set with the listing's locale — a partial override would drop
  // og:site_name/og:type/og:image (Next replaces, not merges, openGraph).
  const openGraph = siteOpenGraph(locale);
  return resolvedDescription !== undefined
    ? { title, description: resolvedDescription, openGraph }
    : { title, openGraph };
}

/**
 * RSS/Atom autodiscovery links (`alternates.types`) for the configured feed
 * format, or undefined when no feed is published.
 */
export function siteFeedTypes(): Record<string, string> | undefined {
  const { format } = siteConfig.feed;
  const types: Record<string, string> = {};
  if (format === 'rss' || format === 'both') types['application/rss+xml'] = '/feed.xml';
  if (format === 'atom' || format === 'both') types['application/atom+xml'] = '/feed.atom';
  return Object.keys(types).length > 0 ? types : undefined;
}

/**
 * Page-level `alternates` with the site feed links merged in. Next.js REPLACES
 * a parent's `alternates` object instead of merging it, so a page that sets
 * its own canonical would otherwise drop the root layout's RSS/Atom
 * autodiscovery links — on exactly the article pages readers subscribe from.
 */
export function withSiteAlternates(
  alternates: { canonical?: string; languages?: Record<string, string> } = {},
): NonNullable<Metadata['alternates']> {
  const types = siteFeedTypes();
  return {
    ...(alternates.canonical ? { canonical: alternates.canonical } : {}),
    ...(alternates.languages ? { languages: alternates.languages } : {}),
    ...(types ? { types } : {}),
  };
}

/**
 * `twitter:site` / `twitter:creator` from `siteConfig.social.twitter`. Like
 * `alternates`, a page-level `twitter` object replaces the root one, so every
 * override must spread these back in.
 */
export function siteTwitterHandles(): { site?: string; creator?: string } {
  const url = siteConfig.social?.twitter ?? '';
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/);
  if (!match) return {};
  const handle = `@${match[1]}`;
  return { site: handle, creator: handle };
}

/** Standard OpenGraph image dimensions, shared by every article route. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * The site-level OpenGraph object with a per-locale siteName and locale —
 * for pages that override openGraph. Next.js REPLACES a parent's openGraph
 * object instead of merging it, so any page-level override must re-supply
 * the full set or lose og:site_name / og:type / og:image.
 */
export function siteOpenGraph(locale: string): NonNullable<Metadata['openGraph']> {
  return {
    siteName: resolveLocaleValue(siteConfig.title, locale),
    locale,
    type: 'website',
    images: [{ url: siteConfig.ogImage, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT }],
  };
}

interface ArticleMetadataOptions {
  /** Locale the site title resolves in. */
  locale: string;
  /** Article title. The page <title> becomes `${title}${titleSuffix} | ${siteTitle}`. */
  title: string;
  /** Extra segment between title and site name, e.g. ` - ${t('series')}`. */
  titleSuffix?: string;
  description?: string;
  /** OpenGraph type; posts/notes/flows are 'article', series/books 'website'. */
  type?: 'article' | 'website';
  publishedTime?: string;
  authors?: string[];
  /** Absolute OpenGraph url, when the route advertises one. */
  url?: string;
  /**
   * Absolute self-referencing canonical (trailing-slash form). Without it the
   * served page emits no canonical link while its bare-path variant circulates.
   */
  canonicalUrl?: string;
  /** Per-locale alternate URLs, emitted as `alternates.languages` (hreflang). */
  languageAlternates?: Record<string, string>;
  /** Absolute OG image (resolve via resolveImageUrl). Omit to emit no images. */
  ogImage?: string;
  /** 'none' omits the twitter block entirely (notes). */
  twitterCard?: 'summary' | 'summary_large_image' | 'none';
}

/**
 * Build the detail-page Metadata shared by post/series/book/note/flow routes.
 * Centralizes the ~30-line openGraph+twitter block that was copy-pasted into
 * six routes; option flags preserve each route's shape (og type, url, image
 * presence, twitter card) rather than forcing them identical.
 */
export function buildArticleMetadata({
  locale,
  title,
  titleSuffix = '',
  description,
  type = 'article',
  publishedTime,
  authors,
  url,
  canonicalUrl,
  languageAlternates,
  ogImage,
  twitterCard = ogImage ? 'summary_large_image' : 'summary',
}: ArticleMetadataOptions): Metadata {
  const siteTitle = resolveLocaleValue(siteConfig.title, locale);

  const metadata: Metadata = {
    title: `${title}${titleSuffix} | ${siteTitle}`,
    description,
    alternates: withSiteAlternates({ canonical: canonicalUrl, languages: languageAlternates }),
    openGraph: {
      title,
      description,
      type,
      locale,
      ...(publishedTime ? { publishedTime } : {}),
      ...(authors ? { authors } : {}),
      ...(url ? { url } : {}),
      ...(ogImage
        ? { images: [{ url: ogImage, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: title }] }
        : {}),
      siteName: siteTitle,
    },
  };

  if (twitterCard !== 'none') {
    metadata.twitter = {
      card: twitterCard,
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
      ...siteTwitterHandles(),
    };
  }

  return metadata;
}

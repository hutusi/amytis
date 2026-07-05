import type { Metadata } from 'next';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import type { TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';

interface ListingMetadataOptions {
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
  titleKey,
  page,
  totalPages,
  description,
  descriptionKey,
  descriptionOneKey,
  count,
}: ListingMetadataOptions): Metadata {
  // Strict build over silent failure: catch caller mistakes here rather than
  // emitting a quietly-wrong title/description. (We deliberately do NOT assert
  // page <= totalPages: paginationStaticParams emits a sentinel `page: 2` even
  // for single-page listings, so generateMetadata legitimately runs for an
  // out-of-range page that the route component then notFound()s.)
  if ((page != null) !== (totalPages != null)) {
    throw new Error('createListingMetadata: page and totalPages must both be set or both be unset');
  }

  const siteTitle = resolveLocale(siteConfig.title);
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

  return resolvedDescription !== undefined ? { title, description: resolvedDescription } : { title };
}

/** Standard OpenGraph image dimensions, shared by every article route. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

interface ArticleMetadataOptions {
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
  title,
  titleSuffix = '',
  description,
  type = 'article',
  publishedTime,
  authors,
  url,
  canonicalUrl,
  ogImage,
  twitterCard = ogImage ? 'summary_large_image' : 'summary',
}: ArticleMetadataOptions): Metadata {
  const siteTitle = resolveLocale(siteConfig.title);

  const metadata: Metadata = {
    title: `${title}${titleSuffix} | ${siteTitle}`,
    description,
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    openGraph: {
      title,
      description,
      type,
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
    };
  }

  return metadata;
}

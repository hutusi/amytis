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

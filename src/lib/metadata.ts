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
  const siteTitle = resolveLocale(siteConfig.title);
  const section = t(titleKey);
  const title =
    page != null && totalPages != null
      ? `${section} - ${tWith('page_of_total', { page, total: totalPages })} | ${siteTitle}`
      : `${section} | ${siteTitle}`;

  let resolvedDescription = description;
  if (resolvedDescription === undefined && descriptionKey) {
    resolvedDescription =
      count === 1 && descriptionOneKey
        ? t(descriptionOneKey)
        : tWith(descriptionKey, { count: count ?? 0 });
  }

  return resolvedDescription !== undefined ? { title, description: resolvedDescription } : { title };
}

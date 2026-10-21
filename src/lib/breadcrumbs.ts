import { getTranslator } from '@/lib/i18n';
import { isFeatureEnabled } from '@/lib/features';
import type { BookChapterEntry } from '@/lib/content/books';
import {
  getBookUrl,
  getBooksListUrl,
  getPostsListUrl,
  getSeriesListUrl,
  getSeriesUrl,
  localizeUrl,
} from '@/lib/urls';

/** One step of a breadcrumb trail; the last is the current page and has no href. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Trail above a post: Series › {series} › post when it belongs to a series
 * whose pages exist, else {Posts} › post. Series-first because that is the
 * URL hierarchy under autoPaths, and `excludeFromListing` can keep series
 * posts off the posts list entirely. No posts feature, no listing to lead
 * back to: an empty trail.
 */
export function getPostBreadcrumbs(
  post: { title: string; series?: string },
  seriesTitle: string | undefined,
  locale: string,
): BreadcrumbItem[] {
  const { t } = getTranslator(locale);
  if (post.series && isFeatureEnabled('series')) {
    return [
      { label: t('series'), href: localizeUrl(getSeriesListUrl(), locale) },
      { label: seriesTitle || post.series, href: localizeUrl(getSeriesUrl(post.series), locale) },
      { label: post.title },
    ];
  }
  if (!isFeatureEnabled('posts')) return [];
  return [
    { label: t('posts'), href: localizeUrl(getPostsListUrl(), locale) },
    { label: post.title },
  ];
}

/**
 * Trail above a book chapter: Books › {book} › its part or each enclosing
 * section (titles only: parts and sections have no pages) › chapter.
 */
export function getBookChapterBreadcrumbs(
  book: { slug: string; title: string; chapters: BookChapterEntry[] },
  chapter: { id: string; title: string },
  locale: string,
): BreadcrumbItem[] {
  const { t } = getTranslator(locale);
  const entry = book.chapters.find((c) => c.id === chapter.id);
  const groups = entry?.sectionPath ?? (entry?.part ? [entry.part] : []);
  return [
    { label: t('books'), href: localizeUrl(getBooksListUrl(), locale) },
    { label: book.title, href: localizeUrl(getBookUrl(book.slug), locale) },
    ...groups.map((label) => ({ label })),
    { label: chapter.title },
  ];
}

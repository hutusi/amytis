import { getAllPosts } from '@/lib/content/posts';
import { getAllNotes } from '@/lib/content/notes';
import { getAllBooks, getBookChapter } from '@/lib/content/books';
import { getSeriesData } from '@/lib/content/series';
import { createProdMemo } from '@/lib/content/cache';
import { isFeatureEnabled } from '@/lib/features';
import { getTranslator } from '@/lib/i18n';
import { hasOwnCover } from '@/lib/image-utils';
import { resolveImageUrl } from '@/lib/json-ld';
import { getBookChapterUrl, getDefaultLocale, getNonDefaultLocales, getNoteUrl, getPostUrl, localizeUrl } from '@/lib/urls';
import { siteConfig } from '../../site.config';

export type OgCardKind = 'post' | 'note' | 'chapter';

/** One generated share card: what `src/app/og/[...path]/route.tsx` renders. */
export interface OgCard {
  kind: OgCardKind;
  /** Site-relative image path, e.g. `/og/posts/hello.png`. */
  imagePath: string;
  /** The page that shares it, e.g. `/posts/hello`. */
  pagePath: string;
  locale: string;
  title: string;
  /** The line above the title: the series, the book, or the Notes label. */
  kicker?: string;
  /** `YYYY-MM-DD`. */
  date?: string;
  authors: string[];
}

/** `/posts/hello/` → `/og/posts/hello.png`; locale prefixes and nested chapter ids carry over. */
export function ogImagePathFor(pagePath: string): string {
  return `/og${pagePath.replace(/\/+$/, '')}.png`;
}

/**
 * Whether a page gets a generated card: the feature is on, the page's kind is
 * enabled, and it has no cover of its own (a chapter passes its book's).
 * getOgCards and getShareImage both decide by this, so metadata never has to
 * enumerate every page, which outside production re-reads all content.
 */
export function getsOgCard(kind: OgCardKind, coverImage: string | undefined): boolean {
  if (!siteConfig.generateOgImages || hasOwnCover(coverImage)) return false;
  if (kind === 'note') return isFeatureEnabled('flow');
  if (kind === 'chapter') return isFeatureEnabled('books');
  return true;
}

/** Key cards by image path. Throws when two cards claim one path. */
export function indexOgCards(entries: Omit<OgCard, 'imagePath'>[]): Map<string, OgCard> {
  const cards = new Map<string, OgCard>();
  for (const entry of entries) {
    const imagePath = ogImagePathFor(entry.pagePath);
    const existing = cards.get(imagePath);
    if (existing) {
      // Canonical URLs are unique, so this means two routes claim one page.
      throw new Error(`Share card ${imagePath} is claimed by both "${existing.title}" and "${entry.title}"`);
    }
    cards.set(imagePath, { ...entry, imagePath });
  }
  return cards;
}

function buildOgCards(): Map<string, OgCard> {
  const entries: Omit<OgCard, 'imagePath'>[] = [];

  // The same readers as the routes that render these pages.
  for (const locale of [getDefaultLocale(), ...getNonDefaultLocales()]) {
    for (const post of getAllPosts(locale)) {
      if (!getsOgCard('post', post.coverImage)) continue;
      entries.push({
        kind: 'post',
        pagePath: getPostUrl(post),
        locale,
        title: post.title,
        kicker: post.series ? getSeriesData(post.series, locale)?.title : undefined,
        date: post.date.slice(0, 10),
        authors: post.authors,
      });
    }

    if (getsOgCard('note', undefined)) {
      const notesLabel = getTranslator(locale).t('notes');
      for (const note of getAllNotes(locale)) {
        entries.push({
          kind: 'note',
          pagePath: localizeUrl(getNoteUrl(note.slug), locale),
          locale,
          title: note.title,
          kicker: notesLabel,
          date: note.date.slice(0, 10),
          authors: [],
        });
      }
    }

    for (const book of getsOgCard('chapter', undefined) ? getAllBooks(locale) : []) {
      if (!getsOgCard('chapter', book.coverImage)) continue;
      for (const entry of book.chapters) {
        const chapter = getBookChapter(book.slug, entry.id, locale);
        if (!chapter) continue;
        entries.push({
          kind: 'chapter',
          pagePath: localizeUrl(getBookChapterUrl(book.slug, entry.id), locale),
          locale,
          title: chapter.title,
          kicker: book.title,
          authors: book.authors,
        });
      }
    }
  }
  return indexOgCards(entries);
}

const ogCardsMemo = createProdMemo<Map<string, OgCard>>();

/** Every generated card, keyed by image path. Empty when `generateOgImages` is off. */
export function getOgCards(): Map<string, OgCard> {
  return ogCardsMemo.get(buildOgCards);
}

/** Where a page's share image comes from. */
export type ShareImageSource = 'cover' | 'card' | 'site';

/**
 * The image a page shares: its own cover (for a chapter, its book's), else
 * its generated card, else the site default. Only 'site' is generic, so the
 * other two earn a large Twitter card.
 */
export function getShareImage({ kind, pagePath, coverImage }: {
  kind: OgCardKind;
  pagePath: string;
  coverImage?: string;
}): { url: string; source: ShareImageSource } {
  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  if (getsOgCard(kind, coverImage)) return { url: `${siteUrl}${encodeURI(ogImagePathFor(pagePath))}`, source: 'card' };
  return {
    url: resolveImageUrl(coverImage, siteConfig.ogImage, siteUrl),
    source: hasOwnCover(coverImage) ? 'cover' : 'site',
  };
}

import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../../site.config';
import { byDateDesc } from '../sort';
import type { PostData } from './types';
import {
  contentRoot,
  domainDir,
  getActiveContentLocales,
  assertKnownLocale,
  assertNotLegacyLocaleSibling,
  parseSlugAndDate,
} from './io';
import { createKeyedMemo } from './cache';
import { isDraftVisible } from './schema';
import { resolveSeriesIndexInfo, getSeriesContentEntries } from './series-metadata';
import { parseMarkdownFile, parseRstPostEntries, type RstPostEntry } from './parse';

/**
 * Post and page discovery. Each locale tree is a parallel content set: posts
 * live in <tree>/posts/ (flat files or folders) and inside series folders
 * under <tree>/series/; pages are top-level files in the tree root. The
 * default locale's tree is the content/ root itself.
 */

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

const allPostsUnfilteredMemo = createKeyedMemo<string, PostData[]>();
const allPostsMemo = createKeyedMemo<string, PostData[]>();

/**
 * Every post parsed from the content tree, including drafts, future-dated
 * posts, and static pages — the pre-publication-filter view. Content-layer
 * internal: it lets validation distinguish "slug doesn't exist at all" (a
 * build error) from "slug exists but is unpublished here" (a silent skip).
 * Routes and components must keep using getAllPosts().
 */
export function getAllPostsIncludingUnpublished(locale: string = DEFAULT_LOCALE): PostData[] {
  assertKnownLocale(locale);
  return allPostsUnfilteredMemo.get(locale, () => {
    // Chokepoint for the locale-tree validations: every build walks posts, so
    // an invalid content/<locale>/ layout throws before anything renders.
    if (!getActiveContentLocales().includes(locale)) return []; // configured but no tree on disk — sparse, not an error

    const allPostsData: PostData[] = [];
    const pendingRstPosts: RstPostEntry[] = [];

    // Helper to process a directory
    const processDirectory = (dir: string, isSeriesDir: boolean = false) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir, { withFileTypes: true });

      items.forEach((item) => {
        let fullPath = '';
        let slug = '';
        let dateFromFileName = undefined;

        const rawName = item.name.replace(/\.mdx?$/, '');
        ({ slug, dateFromFileName } = parseSlugAndDate(rawName));

        // Handle Series Directory logic
        if (isSeriesDir) {
          if (item.isDirectory()) {
            const seriesSlug = item.name;
            const indexInfo = resolveSeriesIndexInfo(seriesSlug, locale);
            if (!indexInfo) return;

            getSeriesContentEntries(seriesSlug, locale).forEach(entry => {
              if (indexInfo.format === 'rst') {
                pendingRstPosts.push({
                  fullPath: entry.fullPath,
                  slug: entry.slug,
                  dateFromFileName: entry.dateFromFileName,
                  seriesSlug,
                  locale,
                });
              } else {
                allPostsData.push(parseMarkdownFile(entry.fullPath, entry.slug, entry.dateFromFileName, seriesSlug, locale));
              }
            });
            return;
          }
        }

        // Standard Posts logic (outside series)
        if (item.isFile()) {
          if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return;
          assertNotLegacyLocaleSibling(item.name, dir);
          fullPath = path.join(dir, item.name);
          allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName, undefined, locale));
        } else if (item.isDirectory()) {
          const indexPathMdx = path.join(dir, item.name, 'index.mdx');
          const indexPathMd = path.join(dir, item.name, 'index.md');
          if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
          else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
          else return;

          allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName, undefined, locale));
        }
      });
    };

    processDirectory(domainDir('posts', locale));
    processDirectory(domainDir('series', locale), true);

    allPostsData.push(...parseRstPostEntries(pendingRstPosts));

    return allPostsData;
  });
}

export function getAllPosts(locale: string = DEFAULT_LOCALE): PostData[] {
  return allPostsMemo.get(locale, () => {
    return getAllPostsIncludingUnpublished(locale)
      .filter(post => {
        if (post.category === 'Page') return false;

        if (!isDraftVisible(post)) return false;

        if (!siteConfig.posts?.showFuturePosts) {
          const postDate = new Date(post.date);
          const now = new Date();
          if (postDate > now) return false;
        }
        return true;
      })
      .sort(byDateDesc);
  });
}

/**
 * Returns posts for the main listing pages, honouring posts.excludeFromListing.
 * Use this instead of getAllPosts() on any listing/pagination page.
 * Individual post routes and series pages still use getAllPosts() directly.
 */
export function getListingPosts(locale: string = DEFAULT_LOCALE): PostData[] {
  const excluded = new Set(siteConfig.posts?.excludeFromListing ?? []);
  if (excluded.size === 0) return getAllPosts(locale);
  return getAllPosts(locale).filter(p => !p.series || !excluded.has(p.series));
}

export function getPostBySlug(slug: string, locale: string = DEFAULT_LOCALE): PostData | null {
  return getAllPosts(locale).find(post => post.slug === slug) ?? null;
}

export function getPostsByTag(tag: string, locale: string = DEFAULT_LOCALE): PostData[] {
  const allPosts = getAllPosts(locale);
  return allPosts.filter((post) =>
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

const featuredPostsMemo = createKeyedMemo<string, PostData[]>();

export function getFeaturedPosts(locale: string = DEFAULT_LOCALE): PostData[] {
  return featuredPostsMemo.get(locale, () => getAllPosts(locale).filter(post => post.featured));
}

// ─── cross-tree aggregation ──────────────────────────────────────────────────

const aggregatedPostsMemo = createKeyedMemo<string, PostData[]>();

/**
 * The default tree plus every locale tree's ORIGINALS (posts with no
 * default-tree twin), date-sorted. This is the shared domain for corpus-wide
 * surfaces — feeds, archive, author and tag aggregations: content that
 * migrated into a locale tree must not vanish from them, while twins stay
 * excluded (they would double-count their canonical counterpart).
 */
export function getPostsWithLocaleOriginals(): PostData[] {
  return aggregatedPostsMemo.get('all', () => {
    const nonDefault = siteConfig.i18n.enabled
      ? siteConfig.i18n.locales.filter(locale => locale !== DEFAULT_LOCALE)
      : [];
    // First occurrence by treePath in [default, …locales] order: a twin pair
    // between two NON-default trees (no default side) must still count once.
    const seen = new Set(getAllPosts().map(post => post.treePath));
    const result = [...getAllPosts()];
    for (const locale of nonDefault) {
      for (const post of getAllPosts(locale)) {
        if (seen.has(post.treePath)) continue;
        seen.add(post.treePath);
        result.push(post);
      }
    }
    return result.sort(byDateDesc);
  });
}

/** Tag lookup over the aggregated (default ∪ originals) domain — for the global /tags pages. */
export function getAggregatedPostsByTag(tag: string): PostData[] {
  return getPostsWithLocaleOriginals().filter(post =>
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

// ─── twin lookups across locale trees ────────────────────────────────────────

/**
 * Locales (including the post's own) whose tree contains a doc with the same
 * treePath — the hreflang/LanguageSwitch data. A zh-original post with no
 * default-tree twin yields just ['zh'].
 */
export function getPostContentLocales(post: Pick<PostData, 'treePath' | 'locale'>): string[] {
  return getActiveContentLocales().filter(
    locale => locale === post.locale || getAllPosts(locale).some(p => p.treePath === post.treePath)
  );
}

/** The same post in another locale tree (matched by treePath), or null. */
export function getTwinPost(post: Pick<PostData, 'treePath'>, locale: string): PostData | null {
  return getAllPosts(locale).find(p => p.treePath === post.treePath) ?? null;
}

export function getPageContentLocales(page: Pick<PostData, 'treePath' | 'locale'>): string[] {
  return getActiveContentLocales().filter(
    locale => locale === page.locale || getAllPages(locale).some(p => p.treePath === page.treePath)
  );
}

export function getTwinPage(page: Pick<PostData, 'treePath'>, locale: string): PostData | null {
  return getAllPages(locale).find(p => p.treePath === page.treePath) ?? null;
}

/**
 * Contract: returns null only when the page file does not exist (static pages
 * are optional — an absent about.md is fine) or is a draft in a production
 * build. Any error past the existence check — malformed frontmatter,
 * unreadable file — propagates and fails the build (strict-build invariant);
 * a broken page must not silently 404.
 */
export function getPageBySlug(slug: string, locale: string = DEFAULT_LOCALE): PostData | null {
  assertKnownLocale(locale);
  const treeRoot = contentRoot(locale);
  let fullPath = path.join(/* turbopackIgnore: true */ treeRoot, `${slug}.mdx`);
  if (!fs.existsSync(/* turbopackIgnore: true */ fullPath)) {
    fullPath = path.join(/* turbopackIgnore: true */ treeRoot, `${slug}.md`);
  }
  if (!fs.existsSync(/* turbopackIgnore: true */ fullPath)) return null;
  const page = parseMarkdownFile(fullPath, slug, undefined, undefined, locale);
  return isDraftVisible(page) ? page : null;
}

const allPagesMemo = createKeyedMemo<string, PostData[]>();

/**
 * Every static page in a locale tree, drafts included. Slug-reservation and
 * collision checks use this so a draft page claims its slug identically in
 * dev and production builds; rendering surfaces use `getAllPages`.
 */
export function getAllPagesIncludingUnpublished(locale: string = DEFAULT_LOCALE): PostData[] {
  assertKnownLocale(locale);
  return allPagesMemo.get(locale, () => {
    if (!getActiveContentLocales().includes(locale)) return [];
    const treeRoot = contentRoot(locale);
    const items = fs.readdirSync(treeRoot, { withFileTypes: true });
    return items
      .filter(item => {
        if (!item.isFile()) return false;
        if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return false;
        // Legacy sibling variants (about.zh.mdx) throw with a migration hint —
        // they'd otherwise be unreachable shadow translations of tree files.
        assertNotLegacyLocaleSibling(item.name, treeRoot);
        return true;
      })
      .map(item => {
        const slug = item.name.replace(/\.mdx?$/, '');
        const fullPath = path.join(treeRoot, item.name);
        return parseMarkdownFile(fullPath, slug, undefined, undefined, locale);
      });
  });
}

/** Published static pages: drafts are dropped from production builds, like posts. */
export function getAllPages(locale: string = DEFAULT_LOCALE): PostData[] {
  return getAllPagesIncludingUnpublished(locale).filter(page => isDraftVisible(page));
}

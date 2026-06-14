import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../../site.config';
import { byDateDesc } from '../sort';
import { getHeadings } from '../text-metrics';
import type { PostData, Heading } from './types';
import {
  contentDirectory,
  pagesDirectory,
  seriesDirectory,
  readUtf8File,
  parseSlugAndDate,
} from './io';
import { createMemo } from './cache';
import { resolveSeriesIndexInfo, getSeriesContentEntries } from './series-metadata';
import { parseMarkdownFile, parseRstPostEntries, type RstPostEntry } from './parse';

/**
 * Post and page discovery. Posts live in content/posts/ (flat files or
 * folders) and inside series folders under content/series/; pages are
 * top-level files in content/ with optional locale variants.
 */

const allPostsMemo = createMemo<PostData[]>();

export function getAllPosts(): PostData[] {
  return allPostsMemo.get(() => {
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
            const indexInfo = resolveSeriesIndexInfo(seriesSlug);
            if (!indexInfo) return;

            getSeriesContentEntries(seriesSlug).forEach(entry => {
              if (indexInfo.format === 'rst') {
                pendingRstPosts.push({
                  fullPath: entry.fullPath,
                  slug: entry.slug,
                  dateFromFileName: entry.dateFromFileName,
                  seriesSlug,
                });
              } else {
                allPostsData.push(parseMarkdownFile(entry.fullPath, entry.slug, entry.dateFromFileName, seriesSlug));
              }
            });
            return;
          }
        }

        // Standard Posts logic (outside series)
        if (item.isFile()) {
          if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return;
          fullPath = path.join(dir, item.name);
          allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName));
        } else if (item.isDirectory()) {
          const indexPathMdx = path.join(dir, item.name, 'index.mdx');
          const indexPathMd = path.join(dir, item.name, 'index.md');
          if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
          else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
          else return;

          allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName));
        }
      });
    };

    processDirectory(contentDirectory);
    processDirectory(seriesDirectory, true);

    allPostsData.push(...parseRstPostEntries(pendingRstPosts));

    return allPostsData
      .filter(post => {
        if (post.category === 'Page') return false;

        if (process.env.NODE_ENV === 'production' && post.draft) {
          return false;
        }

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
export function getListingPosts(): PostData[] {
  const excluded = new Set(siteConfig.posts?.excludeFromListing ?? []);
  if (excluded.size === 0) return getAllPosts();
  return getAllPosts().filter(p => !p.series || !excluded.has(p.series));
}

export function getPostBySlug(slug: string): PostData | null {
  return getAllPosts().find(post => post.slug === slug) ?? null;
}

export function getPostsByTag(tag: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) =>
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

const featuredPostsMemo = createMemo<PostData[]>();

export function getFeaturedPosts(): PostData[] {
  return featuredPostsMemo.get(() => getAllPosts().filter(post => post.featured));
}

/**
 * Load the content and frontmatter of a locale variant file, e.g. about.zh.mdx.
 * Returns null when the file does not exist or cannot be parsed.
 */
function loadLocaleContent(slug: string, locale: string): { content: string; title?: string; excerpt?: string; headings?: Heading[] } | null {
  for (const ext of ['.mdx', '.md']) {
    // The `${slug}.${locale}${ext}` template is a build-time content lookup,
    // not a module to trace. Without these turbopackIgnore annotations
    // Turbopack expands it to a `<dynamic>.<dynamic>.<ext>` glob and traces the
    // whole project (also surfaces as the next.config.ts NFT warning). See CLAUDE.md.
    const filePath = path.join(/* turbopackIgnore: true */ pagesDirectory, `${slug}.${locale}${ext}`);
    if (fs.existsSync(/* turbopackIgnore: true */ filePath)) {
      try {
        const { data, content } = matter(readUtf8File(filePath));
        const body = content.replace(/^\s*#\s+[^\n]+/, '').trim();
        return {
          content: body,
          title: typeof data.title === 'string' ? data.title : undefined,
          excerpt: typeof data.excerpt === 'string' ? data.excerpt : undefined,
          headings: getHeadings(body),
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Collect contentLocales for all non-default locales that have a variant file.
 */
function attachContentLocales(page: PostData, slug: string): PostData {
  const defaultLocale = siteConfig.i18n.defaultLocale;
  const otherLocales = siteConfig.i18n.locales.filter(l => l !== defaultLocale);
  const contentLocales: NonNullable<PostData['contentLocales']> = {};
  for (const locale of otherLocales) {
    const localeData = loadLocaleContent(slug, locale);
    if (localeData !== null) contentLocales[locale] = localeData;
  }
  return Object.keys(contentLocales).length > 0 ? { ...page, contentLocales } : page;
}

export function getPageBySlug(slug: string): PostData | null {
  try {
    let fullPath = path.join(pagesDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(pagesDirectory, `${slug}.md`);
    }
    if (!fs.existsSync(fullPath)) return null;
    return attachContentLocales(parseMarkdownFile(fullPath, slug), slug);
  } catch {
    return null;
  }
}

const allPagesMemo = createMemo<PostData[]>();

export function getAllPages(): PostData[] {
  return allPagesMemo.get(() => {
    const items = fs.readdirSync(pagesDirectory, { withFileTypes: true });
    return items
      .filter(item => {
        if (!item.isFile()) return false;
        if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return false;
        // Exclude locale variant files (e.g. about.zh.mdx, about.en.mdx) — they are not standalone routes
        const base = item.name.replace(/\.mdx?$/, '');
        const parts = base.split('.');
        if (parts.length > 1 && siteConfig.i18n.locales.includes(parts[parts.length - 1])) {
          return false;
        }
        return true;
      })
      .map(item => {
        const slug = item.name.replace(/\.mdx?$/, '');
        const fullPath = path.join(pagesDirectory, item.name);
        return attachContentLocales(parseMarkdownFile(fullPath, slug), slug);
      });
  });
}

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { parseRstDocument } from '../rst';
import {
  seriesDirectory,
  readUtf8File,
  isMarkdownFilename,
  isRstFilename,
  parseSlugAndDate,
  assertSafeSeriesSlug,
} from './io';
import { createKeyedMemo } from './cache';

/**
 * Series index discovery and lightweight series metadata.
 *
 * This module reads series index files directly (gray-matter / rST parse)
 * WITHOUT going through the post parsers — that is what keeps the
 * dependency chain acyclic: series-metadata → parse → posts → series.
 * The post parsers call `getSeriesTitle` / `getSeriesAuthors` here to
 * inherit series metadata; nothing here may import from `parse.ts`.
 */

export type SeriesFormat = 'markdown' | 'rst';

export interface SeriesIndexInfo {
  format: SeriesFormat;
  fullPath: string;
}

export interface SeriesContentEntry {
  fullPath: string;
  slug: string;
  dateFromFileName?: string;
}

export function resolveUniqueSeriesIndex(seriesSlug: string, format: SeriesFormat): string | null {
  assertSafeSeriesSlug(seriesSlug);
  const seriesPath = path.join(seriesDirectory, seriesSlug);
  const candidates = format === 'rst'
    ? ['index.rst', 'README.rst']
    : ['index.mdx', 'index.md', 'README.mdx', 'README.md'];

  const matches = candidates
    .map(name => path.join(seriesPath, name))
    .filter(fullPath => fs.existsSync(fullPath));

  if (matches.length > 1) {
    throw new Error(
      `[amytis] Series "${seriesSlug}" has multiple ${format} index files: ${matches.map(match => path.basename(match)).join(', ')}.`
    );
  }

  return matches[0] ?? null;
}

export function resolveSeriesIndexInfo(slug: string): SeriesIndexInfo | null {
  assertSafeSeriesSlug(slug);
  if (!fs.existsSync(seriesDirectory)) return null;
  const seriesPath = path.join(seriesDirectory, slug);
  if (!fs.existsSync(seriesPath) || !fs.statSync(seriesPath).isDirectory()) return null;

  const rstIndex = resolveUniqueSeriesIndex(slug, 'rst');
  const markdownIndex = resolveUniqueSeriesIndex(slug, 'markdown');

  if (rstIndex && markdownIndex) {
    throw new Error(
      `[amytis] Series "${slug}" cannot contain both rST and Markdown index files (${path.basename(rstIndex)} and ${path.basename(markdownIndex)}).`
    );
  }
  if (rstIndex) return { format: 'rst', fullPath: rstIndex };
  if (markdownIndex) return { format: 'markdown', fullPath: markdownIndex };
  return null;
}

export function getSeriesContentEntries(seriesSlug: string): SeriesContentEntry[] {
  const indexInfo = resolveSeriesIndexInfo(seriesSlug);
  if (!indexInfo) return [];

  const seriesPath = path.join(seriesDirectory, seriesSlug);
  const seriesItems = fs.readdirSync(seriesPath, { withFileTypes: true });
  const entries: SeriesContentEntry[] = [];
  const seenSlugs = new Map<string, string>();
  const seriesIndexBasenames = new Set(['index.rst', 'README.rst', 'index.md', 'index.mdx', 'README.md', 'README.mdx']);

  for (const item of seriesItems) {
    if (seriesIndexBasenames.has(item.name)) continue;

    if (item.isFile()) {
      const isMarkdown = isMarkdownFilename(item.name);
      const isRst = isRstFilename(item.name);
      if (!isMarkdown && !isRst) continue;

      const itemFormat: SeriesFormat = isRst ? 'rst' : 'markdown';
      if (itemFormat !== indexInfo.format) {
        throw new Error(`[amytis] Series "${seriesSlug}" mixes ${indexInfo.format} and ${itemFormat} files. Offending file: ${item.name}`);
      }

      const rawName = item.name.replace(/\.(mdx?|rst)$/, '');
      const { slug, dateFromFileName } = parseSlugAndDate(rawName);
      const prior = seenSlugs.get(slug);
      if (prior) {
        throw new Error(`[amytis] Series "${seriesSlug}" contains duplicate post slug "${slug}" from "${prior}" and "${item.name}".`);
      }
      seenSlugs.set(slug, item.name);
      entries.push({ fullPath: path.join(seriesPath, item.name), slug, dateFromFileName });
      continue;
    }

    if (item.isDirectory()) {
      const folderPath = path.join(seriesPath, item.name);
      const folderIndexRst = path.join(folderPath, 'index.rst');
      const folderIndexMdx = path.join(folderPath, 'index.mdx');
      const folderIndexMd = path.join(folderPath, 'index.md');
      const hasRst = fs.existsSync(folderIndexRst);
      const hasMdx = fs.existsSync(folderIndexMdx);
      const hasMd = fs.existsSync(folderIndexMd);
      const markdownCount = Number(hasMdx) + Number(hasMd);
      const totalIndexCount = Number(hasRst) + markdownCount;

      if (totalIndexCount === 0) continue;
      if (hasRst && markdownCount > 0) {
        throw new Error(`[amytis] Series "${seriesSlug}" post folder "${item.name}" cannot contain both index.rst and Markdown index files.`);
      }
      if (markdownCount > 1) {
        throw new Error(`[amytis] Series "${seriesSlug}" post folder "${item.name}" cannot contain both index.md and index.mdx.`);
      }

      const itemFormat: SeriesFormat = hasRst ? 'rst' : 'markdown';
      if (itemFormat !== indexInfo.format) {
        throw new Error(`[amytis] Series "${seriesSlug}" mixes ${indexInfo.format} and ${itemFormat} files. Offending folder: ${item.name}`);
      }

      const { slug, dateFromFileName } = parseSlugAndDate(item.name);
      const prior = seenSlugs.get(slug);
      if (prior) {
        throw new Error(`[amytis] Series "${seriesSlug}" contains duplicate post slug "${slug}" from "${prior}" and "${item.name}".`);
      }
      seenSlugs.set(slug, item.name);
      entries.push({
        fullPath: hasRst ? folderIndexRst : (hasMdx ? folderIndexMdx : folderIndexMd),
        slug,
        dateFromFileName,
      });
    }
  }

  return entries;
}

const seriesTitleMemo = createKeyedMemo<string, string | undefined>();

export function getSeriesTitle(slug: string): string | undefined {
  return seriesTitleMemo.get(slug, () => {
    const indexInfo = resolveSeriesIndexInfo(slug);
    if (!indexInfo) return undefined;

    if (indexInfo.format === 'rst') {
      const parsed = parseRstDocument(readUtf8File(indexInfo.fullPath));
      if (parsed.metadata.draft === true) return undefined;
      return parsed.title;
    }

    const { data } = matter(readUtf8File(indexInfo.fullPath));
    if (data.draft === true) return undefined;
    return typeof data.title === 'string' ? data.title : undefined;
  });
}

const seriesAuthorsMemo = createKeyedMemo<string, string[] | null>();

/**
 * Read explicitly configured authors from a series index file's frontmatter.
 * Returns null if no authors are configured (as opposed to the default fallback).
 */
export function getSeriesAuthors(seriesSlug: string): string[] | null {
  return seriesAuthorsMemo.get(seriesSlug, () => {
    const indexInfo = resolveSeriesIndexInfo(seriesSlug);
    if (!indexInfo) return null;

    if (indexInfo.format === 'rst') {
      const parsed = parseRstDocument(readUtf8File(indexInfo.fullPath));
      if (parsed.metadata.authors && parsed.metadata.authors.length > 0) {
        return parsed.metadata.authors;
      }
      if (parsed.metadata.author && typeof parsed.metadata.author === 'string') {
        return [parsed.metadata.author];
      }
      return null;
    }

    const { data } = matter(readUtf8File(indexInfo.fullPath));
    if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
      return data.authors as string[];
    }
    if (data.author && typeof data.author === 'string') {
      return [data.author as string];
    }
    return null;
  });
}

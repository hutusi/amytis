/**
 * Migration script: add `redirectFrom` entries to series posts.
 *
 * When enabling series.autoPaths (or series.customPaths), posts move from
 * /posts/[slug] to /[series]/[slug]. This script adds the old path to each
 * post's `redirectFrom` frontmatter field so static redirect pages are generated.
 *
 * Usage:
 *   bun run add-series-redirects                           # all series
 *   bun run add-series-redirects my-series                 # one specific series
 *   bun run add-series-redirects --dry-run                 # preview without writing
 *   bun run add-series-redirects my-series --dry-run
 *   bun run add-series-redirects --auto-paths              # treat autoPaths as true regardless of config
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../site.config';
import { getPostUrl, getPostsBasePath, getSeriesCustomPaths } from '../src/lib/urls';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
// --auto-paths: override config and treat autoPaths as true for this run.
// Useful when you want to preview/apply redirects before updating site.config.ts.
const overrideAutoPaths = args.includes('--auto-paths');
const targetSeries = args.find(a => !a.startsWith('--'));

const postsDir = path.join(process.cwd(), 'content', 'posts');
const seriesDir = path.join(process.cwd(), 'content', 'series');
const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.+)$/;

function computeSlug(name: string): string {
  const rawName = name.replace(/\.mdx?$/, '');
  const match = rawName.match(dateRegex);
  if (match) {
    return siteConfig.posts?.includeDateInUrl ? rawName : match[2];
  }
  return rawName;
}

interface PostFile {
  filePath: string;
  slug: string;
  seriesSlug: string;
}

/** Collect posts from content/series/[seriesSlug]/ (flat files and folder-based). */
function collectFromSeriesDir(seriesSlug: string): PostFile[] {
  const seriesPath = path.join(seriesDir, seriesSlug);
  if (!fs.existsSync(seriesPath)) return [];

  const results: PostFile[] = [];
  for (const item of fs.readdirSync(seriesPath, { withFileTypes: true })) {
    if (item.name === 'index.md' || item.name === 'index.mdx') continue;

    if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
      results.push({ filePath: path.join(seriesPath, item.name), slug: computeSlug(item.name), seriesSlug });
    } else if (item.isDirectory()) {
      const indexMdx = path.join(seriesPath, item.name, 'index.mdx');
      const indexMd = path.join(seriesPath, item.name, 'index.md');
      const filePath = fs.existsSync(indexMdx) ? indexMdx : fs.existsSync(indexMd) ? indexMd : null;
      if (filePath) {
        results.push({ filePath, slug: computeSlug(item.name), seriesSlug });
      }
    }
  }
  return results;
}

/** Collect posts from content/posts/ that have a matching series: frontmatter field. */
function collectFromPostsDir(filterSeries?: string): PostFile[] {
  if (!fs.existsSync(postsDir)) return [];

  const results: PostFile[] = [];
  for (const item of fs.readdirSync(postsDir, { withFileTypes: true })) {
    let filePath: string | null = null;
    const slug = computeSlug(item.name);

    if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx'))) {
      filePath = path.join(postsDir, item.name);
    } else if (item.isDirectory()) {
      const indexMdx = path.join(postsDir, item.name, 'index.mdx');
      const indexMd = path.join(postsDir, item.name, 'index.md');
      filePath = fs.existsSync(indexMdx) ? indexMdx : fs.existsSync(indexMd) ? indexMd : null;
    }

    if (!filePath) continue;

    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    if (!data.series) continue;
    if (filterSeries && data.series !== filterSeries) continue;

    results.push({ filePath, slug, seriesSlug: data.series });
  }
  return results;
}

/** Returns the canonical URL for a post, respecting the --auto-paths override. */
function computeCanonicalUrl(slug: string, seriesSlug: string): string {
  if (overrideAutoPaths) {
    const customPaths = getSeriesCustomPaths();
    const customPath = customPaths[seriesSlug];
    if (customPath) return `/${customPath}/${slug}`;
    return `/${seriesSlug}/${slug}`;
  }
  return getPostUrl({ slug, series: seriesSlug });
}

/** Process one post file — add redirectFrom if needed. Returns true if the file was (or would be) updated. */
function processPost({ filePath, slug, seriesSlug }: PostFile): boolean {
  const basePath = getPostsBasePath();
  const oldPath = `/${basePath}/${slug}`;
  const canonicalUrl = computeCanonicalUrl(slug, seriesSlug);

  if (canonicalUrl === oldPath) {
    console.log(`  [skip] ${slug} — already at canonical path`);
    return false;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content: body } = matter(fileContents);

  const redirectFrom: string[] = Array.isArray(data.redirectFrom)
    ? [...data.redirectFrom]
    : typeof data.redirectFrom === 'string'
      ? [data.redirectFrom]
      : [];
  if (redirectFrom.includes(oldPath)) {
    console.log(`  [skip] ${slug} — redirectFrom already contains ${oldPath}`);
    return false;
  }

  redirectFrom.push(oldPath);
  data.redirectFrom = redirectFrom;

  const relPath = path.relative(process.cwd(), filePath);
  if (dryRun) {
    console.log(`  [dry-run] ${slug} — would add redirectFrom: ${oldPath}  (${relPath})`);
  } else {
    fs.writeFileSync(filePath, matter.stringify(body, data));
    console.log(`  [updated] ${slug} — added redirectFrom: ${oldPath}  (${relPath})`);
  }
  return true;
}

// ── Collect all target series slugs ──────────────────────────────────────────

const seriesToProcess: string[] = targetSeries
  ? [targetSeries]
  : fs.existsSync(seriesDir)
    ? fs.readdirSync(seriesDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
    : [];

if (seriesToProcess.length === 0) {
  console.log('No series found to process.');
  process.exit(0);
}

// ── Process each series ───────────────────────────────────────────────────────

let totalUpdated = 0;
let totalSkipped = 0;

for (const seriesSlug of seriesToProcess) {
  console.log(`\nSeries: ${seriesSlug}`);

  const posts = [
    ...collectFromSeriesDir(seriesSlug),
    ...collectFromPostsDir(seriesSlug),
  ];

  if (posts.length === 0) {
    console.log('  (no posts found)');
    continue;
  }

  for (const post of posts) {
    if (processPost(post)) totalUpdated++;
    else totalSkipped++;
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
if (dryRun) {
  console.log(`[dry-run] Would update ${totalUpdated} file(s). ${totalSkipped} already up to date.`);
} else {
  console.log(`Done. Updated ${totalUpdated} file(s). ${totalSkipped} already up to date.`);
}

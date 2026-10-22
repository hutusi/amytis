/**
 * Report broken links in the static export: internal links and local images
 * whose target wasn't exported, broken wikilinks, #anchors missing on their
 * target page, and links that land on a redirect stub.
 *
 * It reads out/ rather than the sources, so it checks what is actually served
 * — every content format and link source, after basePath, customPaths, locale
 * prefixes and trailing slashes are applied — without reimplementing URL
 * resolution.
 *
 *   bun scripts/check-links.ts [--site out] [--mode warn|error|off] [--all]
 *
 * `siteConfig.linkCheck` sets the mode; --mode overrides it. Only 'error' mode
 * exits non-zero, and only for broken links and missing images: a broken
 * wikilink can be a deliberate placeholder for a note not yet written.
 */
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import { siteConfig } from '../site.config';

export type LinkCheckMode = 'warn' | 'error' | 'off';

export interface PageScan {
  links: string[];
  images: string[];
  /** Targets of `[[…]]` links the build couldn't resolve. */
  brokenWikilinks: string[];
  ids: Set<string>;
  /** Set on redirect stubs (meta refresh). */
  redirectTo?: string;
}

export interface Finding {
  /** URL path of the page the link is on. */
  page: string;
  target: string;
}

export interface LinkReport {
  pages: number;
  checkedLinks: number;
  brokenLinks: Finding[];
  missingImages: Finding[];
  brokenWikilinks: Finding[];
  missingAnchors: Finding[];
  redirectLinks: Finding[];
}

// Resolves relative hrefs; any host other than this one is external.
const BASE_ORIGIN = 'http://site.invalid';
const SKIPPED_SCHEMES = /^(mailto|tel|sms|javascript|data|blob):/i;
const OPTIMIZED_IMAGE = /^(.*\/)nextImageExportOptimizer\/(.+)-opt-\d+\.[A-Za-z0-9]+$/;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stringProp(node: Element, name: string): string | undefined {
  const value = node.properties?.[name];
  return typeof value === 'string' ? value : undefined;
}

function hasClass(node: Element, name: string): boolean {
  const value = node.properties?.className;
  return Array.isArray(value) && value.includes(name);
}

// Inline scripts (mostly the RSC payload) are over half the export's bytes
// and hold no links to check; dropping them before parsing saves ~40%.
// A <script> shown in a code sample is escaped, so it can't match.
const INLINE_SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

/** The links, images, ids and wikilink failures of one exported page. */
export function scanPage(html: string): PageScan {
  const tree = unified().use(rehypeParse).parse(html.replace(INLINE_SCRIPT, '')) as Root;
  const scan: PageScan = { links: [], images: [], brokenWikilinks: [], ids: new Set() };
  visit(tree, 'element', (node: Element) => {
    const id = stringProp(node, 'id');
    if (id) scan.ids.add(id);
    if (node.tagName === 'a') {
      const href = stringProp(node, 'href');
      if (href !== undefined) scan.links.push(href);
      const name = stringProp(node, 'name');
      if (name) scan.ids.add(name);
    } else if (node.tagName === 'img') {
      const src = stringProp(node, 'src');
      if (src) scan.images.push(src);
    } else if (node.tagName === 'span' && hasClass(node, 'wikilink--broken')) {
      // remark-wikilinks: title="[[target]] not found"
      const title = stringProp(node, 'title') ?? '';
      scan.brokenWikilinks.push(title.match(/^\[\[(.*)\]\]/)?.[1] ?? title);
    } else if (node.tagName === 'meta' && String(node.properties?.httpEquiv ?? '').toLowerCase() === 'refresh') {
      // httpEquiv is a token list in hast (['refresh']), hence String().
      const content = stringProp(node, 'content') ?? '';
      const target = content.match(/url=(.+)$/i)?.[1]?.trim();
      if (target) scan.redirectTo = target;
    }
  });
  return scan;
}

/**
 * An href's site path and fragment, or null when it isn't checked: other
 * hosts, mail/script/data schemes, an empty or bare "#" href. Relative hrefs
 * resolve against the page's URL; absolute URLs on the site's own host count
 * as internal.
 */
export function resolveInternal(
  href: string,
  pageUrl: string,
  siteHost: string | null,
): { path: string; fragment: string } | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed === '#' || SKIPPED_SCHEMES.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed, BASE_ORIGIN + pageUrl);
  } catch {
    return null;
  }
  if (url.origin !== BASE_ORIGIN && url.host !== siteHost) return null;
  return { path: safeDecode(url.pathname), fragment: safeDecode(url.hash.slice(1)) };
}

/** Every file under the export, as slash-separated paths relative to it. */
export function listSiteFiles(outDir: string): Set<string> {
  const files = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.add(path.relative(outDir, full).split(path.sep).join('/'));
    }
  };
  if (fs.existsSync(outDir)) walk(outDir);
  return files;
}

/**
 * The exported file a site path is served from, or null when there is none.
 * `onDisk` is asked when the exact path isn't listed: on a case-insensitive
 * filesystem (macOS) routes differing only in case, such as /authors/amytis/
 * and /authors/Amytis/, share one directory, though a Linux build (Vercel)
 * writes both.
 */
export function targetFile(
  sitePath: string,
  files: Set<string>,
  onDisk: (file: string) => boolean = () => false,
): string | null {
  const rel = sitePath.replace(/^\/+/, '');
  const bare = rel.replace(/\/+$/, '');
  const candidates = rel === '' ? ['index.html'] : [rel, `${bare}/index.html`, `${bare}.html`];
  return candidates.find((candidate) => files.has(candidate)) ?? candidates.find(onDisk) ?? null;
}

/** The URL path a page file is served at: about/index.html → /about/. */
export function pageUrlFor(file: string): string {
  return file.endsWith('index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`;
}

/**
 * Whether an image path was exported. A `nextImageExportOptimizer` variant
 * counts when its original exists: build:dev doesn't generate variants.
 */
export function imageExists(
  sitePath: string,
  files: Set<string>,
  stems: Set<string>,
  onDisk: (file: string) => boolean = () => false,
): boolean {
  if (targetFile(sitePath, files, onDisk)) return true;
  const optimized = sitePath.match(OPTIMIZED_IMAGE);
  return !!optimized && stems.has(`${optimized[1]}${optimized[2]}`.replace(/^\/+/, ''));
}

function stemsOf(files: Set<string>): Set<string> {
  const stems = new Set<string>();
  for (const file of files) stems.add(file.replace(/\.[^./]+$/, ''));
  return stems;
}

/** Scan every exported page and resolve its links. */
export function checkSite(outDir: string, options: { siteHost: string | null }): LinkReport {
  const files = listSiteFiles(outDir);
  const stems = stemsOf(files);
  const onDisk = (file: string) => fs.existsSync(path.join(outDir, file));
  const scans = new Map<string, PageScan>();
  for (const file of files) {
    if (file.endsWith('.html')) scans.set(file, scanPage(fs.readFileSync(path.join(outDir, file), 'utf8')));
  }

  const report: LinkReport = {
    pages: scans.size,
    checkedLinks: 0,
    brokenLinks: [],
    missingImages: [],
    brokenWikilinks: [],
    missingAnchors: [],
    redirectLinks: [],
  };
  type Category = 'brokenLinks' | 'missingImages' | 'brokenWikilinks' | 'missingAnchors' | 'redirectLinks';
  const seen = new Set<string>();
  // Once per page and target: a nav link repeated in a page's header and
  // footer is one finding.
  const add = (category: Category, page: string, target: string) => {
    const key = `${category}\0${page}\0${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    report[category].push({ page, target });
  };

  for (const [file, scan] of scans) {
    const page = pageUrlFor(file);
    for (const href of scan.links) {
      const resolved = resolveInternal(href, page, options.siteHost);
      if (!resolved) continue;
      report.checkedLinks++;
      const target = targetFile(resolved.path, files, onDisk);
      if (!target) {
        add('brokenLinks', page, href);
        continue;
      }
      const targetScan = scans.get(target);
      if (targetScan?.redirectTo) {
        // A stub redirecting to its own URL loops forever. On case-insensitive
        // filesystems (macOS, Windows) a legacy route differing only in case
        // can overwrite the real page with exactly that stub.
        const redirect = resolveInternal(targetScan.redirectTo, pageUrlFor(target), options.siteHost);
        if (redirect && targetFile(redirect.path, files, onDisk) === target) {
          add('brokenLinks', page, `${href} (redirects to itself)`);
          continue;
        }
        if (!scan.redirectTo) add('redirectLinks', page, href);
      }
      if (resolved.fragment && targetScan && !targetScan.redirectTo && !targetScan.ids.has(resolved.fragment)) {
        add('missingAnchors', page, href);
      }
    }
    for (const src of scan.images) {
      const resolved = resolveInternal(src, page, options.siteHost);
      if (!resolved) continue;
      if (!imageExists(resolved.path, files, stems, onDisk)) add('missingImages', page, src);
    }
    for (const target of scan.brokenWikilinks) add('brokenWikilinks', page, `[[${target}]]`);
  }
  return report;
}

/** Only error mode fails, and only for what certainly breaks for readers. */
export function shouldFail(report: LinkReport, mode: LinkCheckMode): boolean {
  return mode === 'error' && report.brokenLinks.length + report.missingImages.length > 0;
}

const CATEGORIES: Array<[keyof LinkReport, string, string]> = [
  ['brokenLinks', 'broken link', 'broken links'],
  ['missingImages', 'missing image', 'missing images'],
  ['brokenWikilinks', 'broken wikilink', 'broken wikilinks'],
  ['missingAnchors', 'missing #anchor', 'missing #anchors'],
  ['redirectLinks', 'link to a redirect alias', 'links to redirect aliases'],
];

/**
 * Summary lines, then findings grouped by page (with its source file when
 * known), cut off after `limit` lines.
 */
export function formatReport(
  report: LinkReport,
  options: { limit?: number; sources?: Map<string, string> } = {},
): string {
  const { limit = Infinity, sources = new Map() } = options;
  const lines = [`[links] checked ${report.checkedLinks} internal links on ${report.pages} pages`];
  const details: string[] = [];
  for (const [key, singular, plural] of CATEGORIES) {
    const findings = report[key] as Finding[];
    if (findings.length === 0) continue;
    const pages = new Set(findings.map((f) => f.page)).size;
    lines.push(`[links] ${findings.length} ${findings.length === 1 ? singular : plural} on ${pages} page${pages === 1 ? '' : 's'}`);
    const byPage = new Map<string, string[]>();
    for (const { page, target } of findings) byPage.set(page, [...(byPage.get(page) ?? []), target]);
    for (const [page, targets] of byPage) {
      const source = sources.get(page);
      details.push(`  ${singular}: ${source ? `${source} (${page})` : page}`);
      for (const target of targets) details.push(`    → ${target}`);
    }
  }
  if (lines.length === 1) lines.push('[links] no problems found');
  const shown = details.slice(0, limit);
  if (details.length > shown.length) {
    shown.push(`  … ${details.length - shown.length} more lines; run \`bun run check-links --all\` for the full list`);
  }
  return [...lines, ...shown].join('\n');
}

/**
 * Page URL → content file, so findings point at what to edit. Loaded only
 * when there is something to report; best effort (null when the data layer
 * can't be read).
 */
async function loadSourceFiles(): Promise<Map<string, string>> {
  const { getAllPosts, getAllPages } = await import('../src/lib/content/posts');
  const { getAllNotes } = await import('../src/lib/content/notes');
  const { getAllFlows } = await import('../src/lib/content/flows');
  const { getAllBooks, getBookChapter } = await import('../src/lib/content/books');
  const { contentRoot } = await import('../src/lib/content/io');
  const urls = await import('../src/lib/urls');

  const sources = new Map<string, string>();
  const relative = (file: string) => path.relative(process.cwd(), file).split(path.sep).join('/');
  const fileFor = (root: string, treePath: string): string | null => {
    for (const stem of [treePath, `${treePath}/index`, `${treePath}/README`]) {
      for (const ext of ['.mdx', '.md', '.rst']) {
        const candidate = path.join(root, stem + ext);
        if (fs.existsSync(candidate)) return relative(candidate);
      }
    }
    return null;
  };
  const set = (url: string, file: string | null) => {
    if (file) sources.set(urls.withTrailingSlash(url), file);
  };

  for (const locale of [urls.getDefaultLocale(), ...urls.getNonDefaultLocales()]) {
    const root = contentRoot(locale);
    for (const post of getAllPosts(locale)) set(urls.getPostUrl(post), fileFor(root, post.treePath));
    for (const page of getAllPages(locale)) set(urls.localizeUrl(urls.getStaticPageUrl(page.slug), locale), fileFor(root, page.treePath));
    for (const note of getAllNotes(locale)) set(urls.localizeUrl(urls.getNoteUrl(note.slug), locale), fileFor(root, note.treePath));
    for (const book of getAllBooks(locale)) {
      set(urls.localizeUrl(urls.getBookUrl(book.slug), locale), fileFor(root, `books/${book.slug}`));
      for (const entry of book.chapters) {
        const chapter = getBookChapter(book.slug, entry.id, locale);
        if (chapter) set(urls.localizeUrl(urls.getBookChapterUrl(book.slug, entry.id), locale), relative(chapter.sourcePath));
      }
    }
  }
  for (const flow of getAllFlows()) set(urls.getFlowUrl(flow.slug), fileFor(contentRoot(urls.getDefaultLocale()), `flows/${flow.slug}`));
  return sources;
}

function parseArgs(argv: string[]): { sitePath: string; mode?: LinkCheckMode; all: boolean } {
  let sitePath = 'out';
  let mode: LinkCheckMode | undefined;
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--site') sitePath = argv[++i] ?? sitePath;
    else if (arg === '--all') all = true;
    else if (arg === '--mode') {
      const value = argv[++i];
      if (value !== 'warn' && value !== 'error' && value !== 'off') throw new Error(`--mode must be warn, error or off (got "${value}")`);
      mode = value;
    }
  }
  return { sitePath, mode, all };
}

function siteHostOf(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).host;
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode ?? siteConfig.linkCheck;
  if (mode === 'off') {
    console.log('[links] skipped (linkCheck: off)');
    return;
  }
  if (!fs.existsSync(args.sitePath)) throw new Error(`no export at ${args.sitePath}; build first`);

  const started = performance.now();
  const report = checkSite(args.sitePath, { siteHost: siteHostOf(siteConfig.baseUrl) });
  const hasFindings = CATEGORIES.some(([key]) => (report[key] as Finding[]).length > 0);
  const sources = hasFindings ? await loadSourceFiles().catch(() => new Map<string, string>()) : new Map<string, string>();
  console.log(formatReport(report, { limit: args.all ? Infinity : 40, sources }));
  console.log(`[links] done in ${((performance.now() - started) / 1000).toFixed(1)}s (mode: ${mode})`);
  if (shouldFail(report, mode)) {
    console.error('[links] failing the build: linkCheck is "error" and there are broken links or missing images');
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('[links] check failed:', error);
    process.exit(1);
  });
}

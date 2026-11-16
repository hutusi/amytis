import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../site.config';
import { extractReferencedAssetPaths } from './copy-assets';
import { ensureDir } from './lib/content-file';
import {
  bodyPrompt,
  classifySource,
  compareStructure,
  danglingAnchors,
  fieldsPrompt,
  findTranslatableFields,
  languageName,
  listedBookChapters,
  listedSeriesPosts,
  maskBlocks,
  parseFieldTranslations,
  resolveTargetLocale,
  rewriteFrontmatter,
  seriesPostSlug,
  splitFrontmatter,
  splitIntoChunks,
  targetPath,
  unmaskBlocks,
  unwrapModelOutput,
  type SourceDomain,
} from './lib/translate';

// bun run translate <path> [--to <locale>] [--force] [--dry-run]
//
// Translates a post, page, note, series or book into a locale tree
// (content/<locale>/, same relative path) with any OpenAI-compatible chat
// API. See docs/guides/translating-content.md.

const USAGE = `Usage: bun run translate <file-or-folder> [--to <locale>] [--force] [--dry-run]

  <file-or-folder>  a post, page or note file, a folder post, or a whole
                    series or book folder under content/
  --to <locale>     target locale (default: the only non-default locale)
  --force           overwrite existing translations, and write even when
                    the structure check fails
  --dry-run         print the translations instead of writing them

Provider settings (flags win over .env.local, which Bun loads):
  TRANSLATE_BASE_URL   e.g. https://dashscope.aliyuncs.com/compatible-mode/v1
  TRANSLATE_MODEL      the model id, e.g. a GLM model from the Bailian console
  TRANSLATE_API_KEY    the API key
  TRANSLATE_REQUEST_OPTIONS  optional JSON merged into each request body

See docs/guides/translating-content.md.`;

const CONTENT_EXTENSIONS = new Set(['.md', '.mdx']);
const INDEX_NAMES = ['index.mdx', 'index.md', 'README.mdx', 'README.md'];
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

// ─── Arguments ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const positional: string[] = [];
let requestedLocale: string | undefined;
let force = false;
let dryRun = false;
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--to') {
    requestedLocale = argv[++i];
    if (!requestedLocale || requestedLocale.startsWith('--')) fail(`--to needs a locale.\n\n${USAGE}`);
  } else if (arg === '--force') {
    force = true;
  } else if (arg === '--dry-run') {
    dryRun = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(USAGE);
    process.exit(0);
  } else if (arg.startsWith('--')) {
    fail(`Unknown option ${arg}.\n\n${USAGE}`);
  } else {
    positional.push(arg);
  }
}
if (positional.length !== 1) fail(`Give one file or folder to translate.\n\n${USAGE}`);

// ─── Planning: what to translate and where it goes ───────────────────────────

const contentRoot = path.join(process.cwd(), 'content');

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  return entries.flatMap((entry) => {
    if (entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function relOf(absolute: string): string {
  return toPosix(path.relative(contentRoot, absolute));
}

/**
 * The file in the locale tree that already holds the translation of `rel`,
 * in any form the content layer treats as the same item: another extension,
 * or the flat (`x.md`) and folder (`x/index.md`, `x/README.md`) forms. A
 * second form beside the first would be a duplicate, which the build rejects.
 */
function existingTranslation(rel: string, locale: string): string | null {
  const stem = rel.replace(/\.(mdx?|rst)$/, '').replace(/\/(index|README)$/, '');
  const forms = ['.mdx', '.md', '.rst'];
  const candidates = [
    ...forms.map((ext) => `${stem}${ext}`),
    ...['index', 'README'].flatMap((name) => forms.map((ext) => `${stem}/${name}${ext}`)),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(contentRoot, locale, candidate))) ?? null;
}

function findIndex(dir: string): string | null {
  const name = INDEX_NAMES.find((candidate) => fs.existsSync(path.join(dir, candidate)));
  return name ? path.join(dir, name) : null;
}

/** Local files a document links to, inside its own domain folder and outside any locale tree. */
function referencedAssets(file: string, domain: SourceDomain): string[] {
  const domainRoot = domain === 'pages' ? contentRoot : path.join(contentRoot, domain);
  return extractReferencedAssetPaths(file).flatMap((reference) => {
    const absolute = path.resolve(path.dirname(file), reference);
    const insideDomain = path.relative(domainRoot, absolute);
    if (insideDomain.startsWith('..') || path.isAbsolute(insideDomain)) return [];
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return [];
    if (CONTENT_EXTENSIONS.has(path.extname(absolute))) return [];
    return [relOf(absolute)];
  });
}

interface Plan {
  locale: string;
  domain: SourceDomain;
  docs: string[];
  assets: string[];
  /** Series or book folders (`series/<s>`, `books/<b>`) the run adds to. */
  containers: string[];
}

function plan(): Plan {
  const locale = resolveTargetLocale(siteConfig.i18n, requestedLocale);
  const source = path.resolve(positional[0]);
  if (!fs.existsSync(source)) throw new Error(`No such file or folder: ${positional[0]}`);
  const isDirectory = fs.statSync(source).isDirectory();
  const rel = relOf(source);
  const domain = classifySource(rel, isDirectory);

  const docs: string[] = [];
  const assets = new Set<string>();
  if (isDirectory) {
    for (const file of walk(source)) {
      const ext = path.extname(file);
      if (ext === '.rst') throw new Error(`content/${relOf(file)}: reStructuredText can't be translated; only .md and .mdx can.`);
      if (CONTENT_EXTENSIONS.has(ext)) docs.push(relOf(file));
      else assets.add(relOf(file));
    }
    if (docs.length === 0) throw new Error(`content/${rel} has no .md or .mdx files.`);
  } else {
    const ext = path.extname(source);
    if (ext === '.rst') throw new Error("reStructuredText can't be translated; only .md and .mdx can.");
    if (!CONTENT_EXTENSIONS.has(ext)) throw new Error(`${positional[0]} is not a Markdown (.md or .mdx) file.`);
    docs.push(rel);
    // A folder post's index owns its whole folder: copy every file beside it.
    const segments = rel.split('/');
    const isIndex = /^(index|README)$/.test(path.basename(source, ext));
    const isFolderPost = isIndex && ((domain === 'posts' && segments.length === 3) || (domain === 'series' && segments.length === 4));
    if (isFolderPost) {
      for (const file of walk(path.dirname(source))) {
        if (!CONTENT_EXTENSIONS.has(path.extname(file))) assets.add(relOf(file));
      }
    }
  }

  // A post or chapter needs its series or book index in the target tree too:
  // a locale series without an index is dropped, a book can't exist without one.
  const containers: string[] = [];
  if ((domain === 'series' || domain === 'books') && rel.split('/').length >= 2) {
    const container = rel.split('/').slice(0, 2).join('/');
    containers.push(container);
    const sourceIndex = findIndex(path.join(contentRoot, container));
    if (sourceIndex && !existingTranslation(relOf(sourceIndex), locale) && !docs.includes(relOf(sourceIndex))) {
      docs.unshift(relOf(sourceIndex));
    }
  }

  // The series or book index first, so the log reads top-down.
  const isContainerIndex = (doc: string) => doc.split('/').length === 3 && /\/(index|README)\.mdx?$/.test(doc);
  docs.sort((a, b) => Number(isContainerIndex(b)) - Number(isContainerIndex(a)));
  for (const doc of docs) {
    for (const asset of referencedAssets(path.join(contentRoot, doc), domain)) assets.add(asset);
  }
  return { locale, domain, docs, assets: [...assets].sort(), containers };
}

let job: Plan;
try {
  job = plan();
} catch (error) {
  fail((error as Error).message);
}

const existing = new Map(job.docs.map((doc) => [doc, existingTranslation(doc, job.locale)]));
const existingPath = (doc: string) => `content/${job.locale}/${existing.get(doc)}`;
if (force) {
  // --force replaces a translation in place; it never adds a second form of one.
  const conflicts = job.docs.filter((doc) => existing.get(doc) && existing.get(doc) !== doc);
  if (conflicts.length > 0) {
    fail(`${conflicts.map((doc) => `content/${doc} is already translated as ${existingPath(doc)}`).join('; ')}. Writing content/${targetPath(conflicts[0], job.locale)} beside it would make a duplicate; delete or rename the existing file first.`);
  }
}
const pending = job.docs.filter((doc) => force || !existing.get(doc));
const skipped = job.docs.filter((doc) => !pending.includes(doc));
if (pending.length === 0) {
  fail(`Already translated: ${skipped.map(existingPath).join(', ')}. Pass --force to translate again.`);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const provider = {
  baseUrl: process.env.TRANSLATE_BASE_URL?.trim(),
  model: process.env.TRANSLATE_MODEL?.trim(),
  apiKey: process.env.TRANSLATE_API_KEY?.trim(),
};
const missingSettings = (['TRANSLATE_BASE_URL', 'TRANSLATE_MODEL', 'TRANSLATE_API_KEY'] as const)
  .filter((name) => !process.env[name]?.trim());
if (missingSettings.length > 0) {
  fail(`Missing ${missingSettings.join(', ')}. Set them in .env.local (never committed):\n\n${USAGE}`);
}
let requestOptions: Record<string, unknown> = {};
if (process.env.TRANSLATE_REQUEST_OPTIONS?.trim()) {
  try {
    const parsed: unknown = JSON.parse(process.env.TRANSLATE_REQUEST_OPTIONS);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    requestOptions = parsed as Record<string, unknown>;
  } catch {
    fail('TRANSLATE_REQUEST_OPTIONS must be a JSON object, e.g. {"enable_thinking": false}.');
  }
}

async function chat(system: string, user: string): Promise<string> {
  const url = `${provider.baseUrl!.replace(/\/+$/, '')}/chat/completions`;
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.2,
          ...requestOptions,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(`could not reach ${url}: ${(error as Error).message}`);
    }
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      await Bun.sleep(2000);
      continue;
    }
    if (!response.ok) {
      throw new Error(`the provider answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    const data = (await response.json()) as { choices?: Array<{ finish_reason?: unknown; message?: { content?: unknown } }> };
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new Error('the reply was cut off at the model\'s output limit (finish_reason: length). Raise it with TRANSLATE_REQUEST_OPTIONS, e.g. {"max_tokens": 16384}, if the model allows.');
    }
    if (choice?.finish_reason === 'content_filter') {
      throw new Error('the provider withheld the reply (finish_reason: content_filter).');
    }
    const content = choice?.message?.content;
    if (typeof content !== 'string') throw new Error('the provider\'s reply had no message content.');
    return content;
  }
}

// ─── Translating ──────────────────────────────────────────────────────────────

const from = languageName(siteConfig.i18n.defaultLocale);
const to = languageName(job.locale);

interface Result {
  text: string;
  problems: string[];
  anchors: string[];
}

async function translateDocument(raw: string): Promise<Result> {
  const { frontmatter, body } = splitFrontmatter(raw);
  let head = '';
  if (frontmatter !== null) {
    const fields = findTranslatableFields(frontmatter);
    const translations = fields.length > 0
      ? parseFieldTranslations(await chat(fieldsPrompt(from, to), JSON.stringify(fields.map((f) => f.text))), fields.length)
      : [];
    head = `---\n${rewriteFrontmatter(frontmatter, fields, translations)}---\n`;
  }

  const leading = body.match(/^\s*/)![0];
  const { masked, blocks } = maskBlocks(body.trim());
  const parts: string[] = [];
  for (const chunk of splitIntoChunks(masked)) {
    parts.push(chunk.trim() ? unwrapModelOutput(await chat(bodyPrompt(from, to), chunk)) : chunk);
  }
  const output = parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
  return {
    text: `${head}${leading}${unmaskBlocks(output, blocks)}\n`,
    problems: compareStructure(masked, output, blocks.length),
    anchors: danglingAnchors(masked, output),
  };
}

const warnings: string[] = [];
const failed: string[] = [];
const written: string[] = [];

for (const doc of pending) {
  const target = `content/${targetPath(doc, job.locale)}`;
  console.error(`Translating content/${doc} → ${target}`);
  let result: Result;
  try {
    result = await translateDocument(fs.readFileSync(path.join(contentRoot, doc), 'utf8'));
  } catch (error) {
    console.error(`  failed: ${(error as Error).message}`);
    failed.push(doc);
    continue;
  }
  if (result.problems.length > 0) {
    console.error(`  the translation changed the document's structure:\n${result.problems.map((p) => `    - ${p}`).join('\n')}`);
    if (!force) {
      console.error('  not written. Run it again, or pass --force to write it anyway and fix it by hand.');
      failed.push(doc);
      continue;
    }
  }
  if (result.anchors.length > 0) {
    warnings.push(`${target}: links to ${result.anchors.map((a) => `#${a}`).join(', ')} point at headings whose ids changed with their text; update them to the new ids.`);
  }
  if (dryRun) {
    console.log(`===== ${target} =====\n${result.text}`);
  } else {
    const absolute = path.join(process.cwd(), target);
    ensureDir(path.dirname(absolute));
    fs.writeFileSync(absolute, result.text);
  }
  written.push(doc);
}

// ─── Assets ───────────────────────────────────────────────────────────────────

const copied: string[] = [];
let keptAssets = 0;
for (const asset of job.assets) {
  const target = path.join(contentRoot, targetPath(asset, job.locale));
  if (fs.existsSync(target)) {
    keptAssets++;
    continue;
  }
  if (!dryRun) {
    ensureDir(path.dirname(target));
    fs.copyFileSync(path.join(contentRoot, asset), target);
  }
  copied.push(`content/${targetPath(asset, job.locale)}`);
}

// ─── Series and book lists ────────────────────────────────────────────────────

/** Whether the target tree has (or this run produced) a translation at `rel`. */
function translated(rel: string): boolean {
  return existingTranslation(rel, job.locale) !== null || (dryRun && written.includes(rel));
}

for (const container of job.containers) {
  const sourceIndex = findIndex(path.join(contentRoot, container));
  if (!sourceIndex) continue;
  const { data } = matter(fs.readFileSync(sourceIndex, 'utf8'));
  const sourceDir = path.join(contentRoot, container);
  if (container.startsWith('series/')) {
    // Which source file each listed slug is, so the check looks for its twin.
    const sourceFiles = new Map<string, string>();
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      const rel = `${container}/${entry.name}`;
      if (entry.isDirectory()) {
        const index = findIndex(path.join(sourceDir, entry.name));
        if (index) sourceFiles.set(seriesPostSlug(entry.name), relOf(index));
      } else if (CONTENT_EXTENSIONS.has(path.extname(entry.name)) && !/^(index|README)\./.test(entry.name)) {
        sourceFiles.set(seriesPostSlug(entry.name), rel);
      }
    }
    const missing = listedSeriesPosts(data).filter((slug) => {
      const rel = sourceFiles.get(slug);
      return rel !== undefined && !translated(rel);
    });
    if (missing.length > 0) {
      warnings.push(`content/${job.locale}/${container}/ lists posts with no ${job.locale} version yet: ${missing.join(', ')}. The build fails until each is translated or removed from the index's posts: list.`);
    }
  } else {
    const missing = listedBookChapters(data).filter((id) => {
      const candidates = [`${id}.mdx`, `${id}.md`, ...INDEX_NAMES.map((name) => `${id}/${name}`)];
      const source = candidates.find((candidate) => fs.existsSync(path.join(sourceDir, candidate)));
      return source !== undefined && !translated(`${container}/${source}`);
    });
    if (missing.length > 0) {
      warnings.push(`content/${job.locale}/${container}/ lists chapters with no ${job.locale} version yet: ${missing.join(', ')}. The build fails until each is translated or removed from the index's chapters.`);
    }
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const verb = dryRun ? 'Would write' : 'Wrote';
console.error('');
if (written.length > 0) console.error(`${verb} ${written.length} translation${written.length === 1 ? '' : 's'} into content/${job.locale}/.`);
if (skipped.length > 0) console.error(`Skipped ${skipped.length} already translated (pass --force to redo): ${skipped.map(existingPath).join(', ')}`);
if (copied.length > 0) {
  console.error(`${dryRun ? 'Would copy' : 'Copied'} ${copied.length} file${copied.length === 1 ? '' : 's'}: ${copied.join(', ')}`);
  console.error(`  Images with text in them are still in ${from}; replace them by hand if needed.`);
}
if (keptAssets > 0) console.error(`Kept ${keptAssets} file${keptAssets === 1 ? '' : 's'} that already existed in content/${job.locale}/.`);
for (const warning of warnings) console.error(`Warning: ${warning}`);
if (written.length > 0) console.error('Review each translation before publishing: machine translation needs a human read.');
if (failed.length > 0) {
  console.error(`Failed: ${failed.map((doc) => `content/${doc}`).join(', ')}. Translate ${failed.length === 1 ? 'it' : 'them'} again one at a time.`);
  process.exit(1);
}

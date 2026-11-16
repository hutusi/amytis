import GithubSlugger from 'github-slugger';
import { yamlDoubleQuoted } from './content-file';

// Pure helpers for `bun run translate` (scripts/translate.ts). The model only
// translates prose; everything that must stay exact (where the file goes,
// which frontmatter fields change, code blocks, link targets) is done here,
// in code, and checked after the model answers.

export interface I18nConfig {
  enabled: boolean;
  defaultLocale: string;
  locales: readonly string[];
}

export type SourceDomain = 'posts' | 'series' | 'books' | 'notes' | 'pages';

const CONTENT_TYPE_DIRS = new Set(['posts', 'series', 'books', 'flows', 'notes']);
const LOCALE_DIR_SHAPE = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * The locale a run translates into: `requested`, or the only non-default
 * locale when there is exactly one. Throws when the site can't hold it.
 */
export function resolveTargetLocale(i18n: I18nConfig, requested?: string): string {
  if (!i18n.enabled) {
    throw new Error('i18n is disabled in site.config.ts. Enable it and add the target locale to i18n.locales first.');
  }
  const others = i18n.locales.filter((locale) => locale !== i18n.defaultLocale);
  if (requested === undefined) {
    if (others.length === 1) return others[0];
    throw new Error(others.length === 0
      ? 'i18n.locales has no locale besides the default one. Add the target locale to site.config.ts first.'
      : `Pass --to with one of: ${others.join(', ')}.`);
  }
  if (requested === i18n.defaultLocale) {
    throw new Error(`"${requested}" is the default locale; its content lives at the content/ root. Translate into ${others.join(', ') || 'another locale'}.`);
  }
  if (!others.includes(requested)) {
    throw new Error(`"${requested}" is not in i18n.locales (${i18n.locales.join(', ')}).`);
  }
  return requested;
}

/**
 * What a source path (relative to content/, `/`-separated) holds. Throws for
 * paths a translation can't come from: outside content/, already inside a
 * locale tree, or flows, which locale trees don't support yet.
 */
export function classifySource(rel: string, isDirectory: boolean): SourceDomain {
  if (rel === '' || rel === '.' || rel.startsWith('../') || rel === '..') {
    throw new Error('The source must be a file or folder inside content/.');
  }
  const [first] = rel.split('/');
  if (first === 'flows') {
    throw new Error('Flows can\'t be translated yet: locale trees don\'t support flows (content/<locale>/flows/ fails the build).');
  }
  if (CONTENT_TYPE_DIRS.has(first)) {
    if (rel === first) throw new Error(`Translate one item at a time, not all of content/${first}/.`);
    return first as SourceDomain;
  }
  if (LOCALE_DIR_SHAPE.test(first)) {
    throw new Error(`content/${first}/ is a locale tree; translate from the default-locale file at the content/ root instead.`);
  }
  if (isDirectory || rel.includes('/')) {
    throw new Error(`content/${rel} is not a post, series, book, note or page.`);
  }
  return 'pages';
}

/** Where the translation of `rel` goes: the same path inside the locale tree. */
export function targetPath(rel: string, locale: string): string {
  return `${locale}/${rel}`;
}

// ─── Frontmatter ─────────────────────────────────────────────────────────────

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m;

/** The raw frontmatter (without its `---` lines) and the body after it. */
export function splitFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match || match.index !== 0) return { frontmatter: null, body: raw };
  return { frontmatter: match[1], body: raw.slice(match[0].length) };
}

const TRANSLATED_KEYS = 'title|subtitle|excerpt|description|part';
const FIELD_RE = new RegExp(`^(\\s*(?:-\\s+)?)(${TRANSLATED_KEYS}|coverImage):[ \\t]*(.*?)[ \\t]*$`);

export interface FrontmatterField {
  /** Line index inside the frontmatter. */
  line: number;
  /** Indentation and list dash before the key. */
  prefix: string;
  key: string;
  /** The text to translate (for a `text:` cover, the part after `text:`). */
  text: string;
}

/** A YAML scalar as written on one line, or null when it isn't a plain one-line string. */
function parseScalar(raw: string): string | null {
  if (raw === '' || /^[|>]/.test(raw)) return null;
  if (raw.startsWith('"')) {
    try {
      const value: unknown = JSON.parse(raw);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }
  if (raw.startsWith("'")) {
    return raw.endsWith("'") && raw.length >= 2 ? raw.slice(1, -1).replace(/''/g, "'") : null;
  }
  if (/^[[{&*!]/.test(raw)) return null;
  return raw.replace(/\s+#.*$/, '');
}

/**
 * The frontmatter strings a translation changes: titles, subtitles, excerpts,
 * descriptions and book `part` names at any depth, and a `text:` cover's
 * words. Everything else (dates, tags, slugs, flags) stays as written.
 */
export function findTranslatableFields(frontmatter: string): FrontmatterField[] {
  const fields: FrontmatterField[] = [];
  frontmatter.split('\n').forEach((line, index) => {
    const match = line.replace(/\r$/, '').match(FIELD_RE);
    if (!match) return;
    const [, prefix, key, raw] = match;
    const value = parseScalar(raw);
    if (value === null || value.trim() === '') return;
    if (key === 'coverImage') {
      if (!value.startsWith('text:')) return;
      const words = value.slice('text:'.length);
      if (words.trim()) fields.push({ line: index, prefix, key, text: words });
      return;
    }
    fields.push({ line: index, prefix, key, text: value });
  });
  return fields;
}

/**
 * The frontmatter with each field's value replaced by its translation, and
 * top-level `redirectFrom` removed: aliases belong to the original, and a
 * second copy of one fails the build. Other lines, comments included, are
 * kept as written.
 */
export function rewriteFrontmatter(frontmatter: string, fields: FrontmatterField[], translations: string[]): string {
  const lines = frontmatter.split('\n');
  fields.forEach((field, i) => {
    const value = field.key === 'coverImage' ? `text:${translations[i]}` : translations[i];
    const eol = lines[field.line].endsWith('\r') ? '\r' : '';
    lines[field.line] = `${field.prefix}${field.key}: "${yamlDoubleQuoted(value)}"${eol}`;
  });
  const kept: string[] = [];
  let dropping = false;
  for (const line of lines) {
    if (/^redirectFrom\s*:/.test(line)) {
      dropping = true;
      continue;
    }
    // A dropped key's value continues on indented or `- ` lines.
    if (dropping && (/^[ \t]/.test(line) || /^-\s/.test(line))) continue;
    dropping = false;
    kept.push(line);
  }
  return kept.join('\n');
}

// ─── Masking code and math ───────────────────────────────────────────────────

const PLACEHOLDER_RE = /@@BLOCK_(\d+)@@/g;

export function placeholder(index: number): string {
  return `@@BLOCK_${index}@@`;
}

const FENCE_OPEN_RE = /^([ \t]*(?:>[ \t]?)*)(`{3,}|~{3,})/;
const FENCE_CLOSE_RE = /^[ \t]*(?:>[ \t]?)*(`{3,}|~{3,})[ \t]*$/;
const MATH_RE = /^([ \t]*(?:>[ \t]?)*)\$\$[ \t]*$/;

/**
 * The body with every fenced code block and `$$` math block swapped for a
 * one-line placeholder, kept at the block's indentation so lists and quotes
 * keep their shape. The model never sees code, and restoring it is exact.
 */
export function maskBlocks(body: string): { masked: string; blocks: string[] } {
  const lines = body.split('\n');
  const out: string[] = [];
  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const fence = lines[i].match(FENCE_OPEN_RE);
    const math = fence ? null : lines[i].match(MATH_RE);
    if (!fence && !math) {
      out.push(lines[i]);
      continue;
    }
    const prefix = (fence ?? math)![1];
    let end = i + 1;
    for (; end < lines.length; end++) {
      if (fence) {
        const close = lines[end].match(FENCE_CLOSE_RE);
        if (close && close[1][0] === fence[2][0] && close[1].length >= fence[2].length) break;
      } else if (MATH_RE.test(lines[end])) {
        break;
      }
    }
    // An unclosed block runs to the end of the document, as in CommonMark.
    const last = Math.min(end, lines.length - 1);
    const block = lines.slice(i, last + 1).join('\n');
    out.push(`${prefix}${placeholder(blocks.length)}`);
    blocks.push(block.slice(prefix.length));
    i = last;
  }
  return { masked: out.join('\n'), blocks };
}

export function unmaskBlocks(masked: string, blocks: string[]): string {
  return masked.replace(PLACEHOLDER_RE, (token, n: string) => blocks[Number(n)] ?? token);
}

/**
 * Splits a masked body into pieces of about `limit` characters at `## `
 * headings, so a long post goes to the model in parts. A section longer than
 * the limit stays whole.
 */
export function splitIntoChunks(masked: string, limit = 12000): string[] {
  const sections: string[][] = [[]];
  for (const line of masked.split('\n')) {
    if (line.startsWith('## ') && sections[sections.length - 1].length > 0) sections.push([]);
    sections[sections.length - 1].push(line);
  }
  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const section of sections) {
    const sectionSize = section.join('\n').length + 1;
    if (current.length > 0 && size + sectionSize > limit) {
      chunks.push(current.join('\n'));
      current = [];
      size = 0;
    }
    current.push(...section);
    size += sectionSize;
  }
  chunks.push(current.join('\n'));
  return chunks;
}

/**
 * The model's answer without wrapping it may add: a `<think>` block from a
 * reasoning model, and a fence around the whole reply. Masked input has no
 * fences of its own, so a fence around everything is always the model's.
 */
export function unwrapModelOutput(text: string): string {
  let result = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const wrapped = result.match(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1[ \t]*$/);
  if (wrapped) result = wrapped[2];
  return result;
}

// ─── Checking the translation ────────────────────────────────────────────────

function stripInlineCode(text: string): string {
  return text.replace(/(`+)[\s\S]*?\1/g, '');
}

function inlineCode(text: string): string[] {
  return [...text.matchAll(/(`+)([\s\S]*?)\1/g)].map((m) => m[0]);
}

function headingLevels(text: string): string[] {
  return text.split('\n').flatMap((line) => {
    const match = line.match(/^(#{1,6})\s/);
    return match ? [`h${match[1].length}`] : [];
  });
}

function linkUrls(text: string): string[] {
  const prose = stripInlineCode(text);
  const inline = [...prose.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'(][^)]*)?\)/g)].map((m) => m[1]);
  // Reference definitions, not footnotes (`[^1]: text` is prose).
  const definitions = [...prose.matchAll(/^\s*\[(?!\^)[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm)].map((m) => m[1]);
  return [...inline, ...definitions];
}

function wikilinkTargets(text: string): string[] {
  return [...stripInlineCode(text).matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

function htmlTags(text: string): string[] {
  return [...stripInlineCode(text).matchAll(/<\/?[A-Za-z][\w.-]*(?=[\s/>])/g)].map((m) => m[0]);
}

/** `:::` lines without their bracket label, which is prose and may change. */
function directiveLines(text: string): string[] {
  return text.split('\n').flatMap((line) => {
    const match = line.match(/^\s*(:{3,})\s*([\w-]*)(?:\[[^\]]*\])?\s*(\{[^}]*\})?/);
    return match ? [`${match[1]}${match[2]}${match[3] ?? ''}`] : [];
  });
}

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[0]);
}

function sameSequence(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}

function describeDifference(source: string[], output: string[]): string {
  const remaining = [...output];
  const missing: string[] = [];
  for (const value of source) {
    const at = remaining.indexOf(value);
    if (at === -1) missing.push(value);
    else remaining.splice(at, 1);
  }
  const parts = [];
  if (missing.length) parts.push(`missing ${missing.slice(0, 5).join(', ')}`);
  if (remaining.length) parts.push(`unexpected ${remaining.slice(0, 5).join(', ')}`);
  return parts.join('; ') || 'order changed';
}

/**
 * Differences between a masked source and its masked translation in what the
 * translation must keep: placeholders, heading levels, link and image URLs,
 * wikilink targets, inline code, `:::` directives and HTML tags. Empty means
 * the structure survived.
 */
export function compareStructure(source: string, output: string, blockCount: number): string[] {
  const problems: string[] = [];
  const expected = Array.from({ length: blockCount }, (_, i) => placeholder(i));
  const found = placeholders(output);
  if (!sameSequence(expected, found)) {
    problems.push(`code/math placeholders: ${describeDifference(expected, found)}`);
  }
  const checks: Array<[string, string[], string[], boolean]> = [
    ['headings', headingLevels(source), headingLevels(output), true],
    ['link and image URLs', sorted(linkUrls(source)), sorted(linkUrls(output)), false],
    ['wikilink targets', sorted(wikilinkTargets(source)), sorted(wikilinkTargets(output)), false],
    ['inline code', sorted(inlineCode(source)), sorted(inlineCode(output)), false],
    ['::: directives', directiveLines(source), directiveLines(output), true],
    ['HTML tags', htmlTags(source), htmlTags(output), true],
  ];
  for (const [name, a, b, ordered] of checks) {
    if (!sameSequence(a, b)) {
      problems.push(`${name}: ${ordered && sameSequence(sorted(a), sorted(b)) ? 'order changed' : describeDifference(a, b)}`);
    }
  }
  return problems;
}

/** Heading text as the slugger sees it: links, code and emphasis reduced to their words. */
function headingText(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#+\s*$/, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '');
}

export function headingSlugs(masked: string): Set<string> {
  const slugger = new GithubSlugger();
  const slugs = new Set<string>();
  for (const line of masked.split('\n')) {
    if (/^#{1,6}\s/.test(line)) slugs.add(slugger.slug(headingText(line)));
  }
  return slugs;
}

/**
 * In-page links (`](#id)`) that pointed at a heading of the source but match
 * no heading of the translation, because the heading text (and so its id)
 * changed. They need pointing at the new ids by hand.
 */
export function danglingAnchors(source: string, output: string): string[] {
  const before = headingSlugs(source);
  const after = headingSlugs(output);
  const anchors = new Set(linkUrls(output).filter((url) => url.startsWith('#')).map((url) => url.slice(1)));
  return [...anchors].filter((anchor) => before.has(anchor) && !after.has(anchor));
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  zh: 'Simplified Chinese (简体中文)',
  'zh-CN': 'Simplified Chinese (简体中文)',
  'zh-TW': 'Traditional Chinese (繁體中文)',
};

export function languageName(locale: string): string {
  if (LANGUAGE_NAMES[locale]) return LANGUAGE_NAMES[locale];
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}

export function bodyPrompt(from: string, to: string): string {
  return [
    `You translate Markdown and MDX documents for a blog from ${from} to ${to}.`,
    'Reply with the translated document only: no preface, no notes, no surrounding code fence.',
    'Translate prose, headings, list items, table cells, link text, image alt text, bracket labels of `:::` directives, and the title text of `::: tip Title` containers.',
    'Keep exactly as written:',
    '- lines like @@BLOCK_0@@ (they stand for code blocks), at the same place;',
    '- Markdown structure: heading levels, lists, tables, blockquotes, blank lines, `> [!NOTE]` style alert markers;',
    '- inline code in backticks, URLs and link targets, including `#anchor` links;',
    '- HTML and JSX tags and their attribute names and values, except visible text between tags;',
    '- `:::` directive names and their `{...}` attribute blocks;',
    '- wikilink targets: in [[target|label]] translate only the label; leave [[target]] as is;',
    '- math between $ signs, emoji, and footnote markers like [^1].',
    'Use natural, fluent wording a native reader would write; keep product names, code identifiers and file names in their original form.',
  ].join('\n');
}

export function fieldsPrompt(from: string, to: string): string {
  return [
    `Translate each string in the JSON array from ${from} to ${to}.`,
    'These are titles, subtitles, excerpts and section names of blog content.',
    'Reply with only a JSON array of the translated strings, the same length and order, and no other text.',
  ].join('\n');
}

/** The model's reply to a fields request, as exactly `count` strings. */
export function parseFieldTranslations(reply: string, count: number): string[] {
  const text = unwrapModelOutput(reply);
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  let value: unknown = null;
  if (start !== -1 && end > start) {
    try {
      value = JSON.parse(text.slice(start, end + 1));
    } catch {
      value = null;
    }
  }
  if (!Array.isArray(value) || value.length !== count || value.some((item) => typeof item !== 'string')) {
    throw new Error(`the frontmatter reply was not a JSON array of ${count} string${count === 1 ? '' : 's'}`);
  }
  return value.map((item: string) => item.replace(/[\r\n]+/g, ' ').trim());
}

// ─── Series and books ────────────────────────────────────────────────────────

/** A series post's slug from its file or folder name: the date prefix and extension dropped. */
export function seriesPostSlug(name: string): string {
  return name.replace(/\.(mdx?|rst)$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/** The post slugs a series index lists by hand (`posts:`), or none. */
export function listedSeriesPosts(data: Record<string, unknown>): string[] {
  return Array.isArray(data.posts) ? data.posts.filter((slug): slug is string => typeof slug === 'string') : [];
}

/** The chapter ids a book index lists, flattened out of its parts. */
export function listedBookChapters(data: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const walk = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      if (typeof record.id === 'string') ids.push(record.id);
      walk(record.chapters);
    }
  };
  walk(data.chapters);
  return ids;
}

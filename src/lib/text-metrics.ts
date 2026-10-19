import GithubSlugger from 'github-slugger';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import type { Nodes } from 'mdast';
import { normalizeVuepressContainerSyntax } from './remark-vuepress-containers';

/**
 * Shared text metrics for all content formats (Markdown, rST, plain text).
 * Reading-time and word-count must never disagree between pipelines, so the
 * tokenizer, the Han/Latin token definitions, and the pacing constants live
 * here and only here.
 */

export interface Heading {
  id: string;
  text: string;
  level: number;
}

// Reading pace: ~200 Latin words per minute; ~300 Han characters per minute
// (the convention for Chinese text, counted per-character).
const WORDS_PER_MINUTE = 200;
const HAN_CHARS_PER_MINUTE = 300;

// Han character ranges: CJK Unified Ideographs Extension A, CJK Unified
// Ideographs, CJK Compatibility Ideographs.
const HAN_CHAR_RE = /[㐀-䶿一-鿿豈-﫿]/g;
// Latin word: alphanumeric runs allowing apostrophes/hyphens between runs.
const LATIN_WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

// Fenced code blocks in BOTH CommonMark fence styles (``` and ~~~). A fence's
// body is not prose: it must not count as words or leak into excerpts (TOC
// headings use the real parser instead). Only used with .replace(), which
// resets lastIndex.
const FENCED_CODE_BLOCK_RE = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;

// Shared text-stripping + tokenization used by both `calculateReadingMinutes`
// and `calculateWordCount`. Both metrics need the same view of "what counts
// as a word," so funnel them through a single source of truth.
function countContentTokens(content: string): { latinWords: number; hanChars: number } {
  const text = content
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(FENCED_CODE_BLOCK_RE, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>\-[\]()]/g, " ");
  return countTokenizedText(text);
}

function countTokenizedText(text: string): { latinWords: number; hanChars: number } {
  const hanChars = (text.match(HAN_CHAR_RE) || []).length;
  const latinWords = (text.match(LATIN_WORD_RE) || []).length;
  return { latinWords, hanChars };
}

function minutesFromTokens(latinWords: number, hanChars: number): number {
  const estimatedMinutes = (latinWords / WORDS_PER_MINUTE) + (hanChars / HAN_CHARS_PER_MINUTE);
  return Math.max(1, Math.ceil(estimatedMinutes));
}

/**
 * Estimated minutes-to-read for marked-up content (Markdown / rST converted
 * to Markdown), ceiled to a whole minute and floored at 1. Returns a raw
 * number so layouts can localize via `t('reading_time')` — store-as-number
 * rather than pre-baked "N min read" string lets the locale switch take
 * effect at render time.
 */
export function calculateReadingMinutes(content: string): number {
  const { latinWords, hanChars } = countContentTokens(content);
  return minutesFromTokens(latinWords, hanChars);
}

/**
 * Aggregate word count for marked-up content: Latin word matches plus Han
 * characters. Han is counted per-character (the convention in Chinese
 * typography — "字数" literally means "character count") while Latin counts
 * per whitespace-bounded token. Returns 0 for empty input.
 */
export function calculateWordCount(content: string): number {
  const { latinWords, hanChars } = countContentTokens(content);
  return latinWords + hanChars;
}

/**
 * Reading minutes for already-plain text (e.g. the extracted text of a
 * Python-rendered rST document). Skips markup stripping so pre-stripped
 * input is not double-processed.
 */
export function calculateReadingMinutesFromText(text: string): number {
  const { latinWords, hanChars } = countTokenizedText(text);
  return minutesFromTokens(latinWords, hanChars);
}

/** Word count for already-plain text. See `calculateReadingMinutesFromText`. */
export function calculateWordCountFromText(text: string): number {
  const { latinWords, hanChars } = countTokenizedText(text);
  return latinWords + hanChars;
}

// Wikilinks: keep the display text ([[slug|display]]) or the slug ([[slug]]).
function stripWikilinkSyntax(text: string): string {
  return text
    .replace(/\[\[([^\]|]+?)\|([^\]]+?)\]\]/g, '$2')
    .replace(/\[\[([^\]]+?)\]\]/g, '$1');
}

export function generateExcerpt(content: string): string {
  let plain = content.replace(/^#+\s+/gm, '');
  plain = plain.replace(FENCED_CODE_BLOCK_RE, '');
  // ::: container opener/closer lines (VuePress/directive syntax) are pure
  // markup; after fence removal any remaining ones are prose-level.
  plain = plain.replace(/^:{3,}[^\n]*$/gm, '');
  plain = stripWikilinkSyntax(plain);
  // Unwrap inline code BEFORE stripping tags: `<br>` must not become a
  // dangling backtick pair once the tag inside it is deleted.
  plain = plain.replace(/`([^`]+)`/g, '$1');
  // Raw HTML/JSX tags (custom elements like <rss-feed …/> included).
  plain = plain.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  plain = plain.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  plain = plain.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  plain = plain.replace(/(\*\*|__|\*|_)/g, '');
  plain = plain.replace(/^>\s+/gm, '');
  // GitHub alert markers survive the blockquote strip above ("> [!NOTE]").
  plain = plain.replace(/\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/gi, '');
  plain = plain.replace(/\s+/g, ' ').trim();

  if (plain.length <= 160) {
    return plain;
  }
  return plain.slice(0, 160).trim() + '...';
}

// Parse-only processor (no transforms run): GFM and directive syntax change
// what counts as a heading line, so they must match MarkdownRenderer's
// syntax extensions. Fences, setext headings and closing `##` sequences are
// handled by the real CommonMark parser instead of a line regex.
const headingParser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

/**
 * Rendered text of a heading, mirroring what rehype-slug sees: inline markup
 * (`**bold**`, links, inline code) contributes its text, raw HTML/JSX tags
 * contribute nothing, and image alt text is not part of the text content.
 */
function headingText(node: Nodes): string {
  if (node.type === 'html' || node.type === 'image' || node.type === 'imageReference') return '';
  if ('value' in node) return node.value;
  if ('children' in node) return node.children.map(child => headingText(child as Nodes)).join('');
  return '';
}

/**
 * H2/H3 headings for the TOC, with ids that match the ones rehype-slug assigns
 * in the rendered page. rehype-slug slugs the rendered text of EVERY heading
 * level through one shared slugger, so every depth is slugged here too (in
 * document order) and only H2/H3 are returned — skipping H1/H4+ would leave
 * their dedup slots unclaimed and desync later duplicate-text ids.
 *
 * Known limit: raw HTML heading blocks (`<h2>…</h2>`) also claim a slot in
 * the rendered page but are opaque here.
 */
export function getHeadings(content: string): Heading[] {
  const tree = headingParser.parse(normalizeVuepressContainerSyntax(content));
  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  const walk = (node: Nodes) => {
    if (node.type === 'heading') {
      const text = stripWikilinkSyntax(headingText(node)).trim();
      const id = slugger.slug(text);
      if (node.depth === 2 || node.depth === 3) {
        headings.push({ id, text, level: node.depth });
      }
      return;
    }
    if ('children' in node) {
      for (const child of node.children) walk(child as Nodes);
    }
  };
  walk(tree);
  return headings;
}

interface ContentMetrics {
  /** Body with a leading H1 removed (the H1 is rendered as the title instead). */
  contentWithoutH1: string;
  /** Excerpt derived from `contentWithoutH1`. */
  excerpt: string;
  /** H2/H3 headings of the rendered body (`contentWithoutH1`). */
  headings: Heading[];
}

interface ContentMetricsWithCounts extends ContentMetrics {
  readingMinutes: number;
  wordCount: number;
}

/**
 * The shared content-metrics extraction that posts/notes/flows/book-chapters
 * all performed inline: strip a leading H1, derive the excerpt from the
 * stripped body, and collect headings from that same rendered body. Reading-time
 * and word-count are included by default; pass `{ withCounts: false }` to skip
 * them (flows don't surface those metrics). Callers keep their own H1-text
 * capture and `data.excerpt ||` fallback where they need them.
 */
export function extractContentMetrics(content: string, opts?: { withCounts?: true }): ContentMetricsWithCounts;
export function extractContentMetrics(content: string, opts: { withCounts: false }): ContentMetrics;
export function extractContentMetrics(
  content: string,
  opts: { withCounts?: boolean } = {},
): ContentMetrics | ContentMetricsWithCounts {
  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();
  const excerpt = generateExcerpt(contentWithoutH1);
  // Headings come from the body that is actually rendered: the stripped H1
  // never reaches rehype-slug, so it must not claim a slug dedup slot either.
  const headings = getHeadings(contentWithoutH1);

  if (opts.withCounts === false) {
    return { contentWithoutH1, excerpt, headings };
  }
  return {
    contentWithoutH1,
    excerpt,
    headings,
    readingMinutes: calculateReadingMinutes(contentWithoutH1),
    wordCount: calculateWordCount(contentWithoutH1),
  };
}

import GithubSlugger from 'github-slugger';

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

// Shared text-stripping + tokenization used by both `calculateReadingMinutes`
// and `calculateWordCount`. Both metrics need the same view of "what counts
// as a word," so funnel them through a single source of truth.
function countContentTokens(content: string): { latinWords: number; hanChars: number } {
  const text = content
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/```[\s\S]*?```/g, "")
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

export function generateExcerpt(content: string): string {
  let plain = content.replace(/^#+\s+/gm, '');
  plain = plain.replace(/```[\s\S]*?```/g, '');
  plain = plain.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  plain = plain.replace(/\*\[([^\]]+)\*\]\([^)]+\)/g, '$1');
  plain = plain.replace(/(\$\*\*|__|\*|_)/g, '');
  plain = plain.replace(/`([^`]+)`/g, '$1');
  plain = plain.replace(/^>\s+/gm, '');
  plain = plain.replace(/\s+/g, ' ').trim();

  if (plain.length <= 160) {
    return plain;
  }
  return plain.slice(0, 160).trim() + '...';
}

export function getHeadings(content: string): Heading[] {
  const regex = /^(#{2,3})\s+(.*)$/gm;
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = slugger.slug(text);

    headings.push({ id, text, level });
  }
  return headings;
}

interface ContentMetrics {
  /** Body with a leading H1 removed (the H1 is rendered as the title instead). */
  contentWithoutH1: string;
  /** Excerpt derived from `contentWithoutH1`. */
  excerpt: string;
  /** H2/H3 headings, parsed from the original content (H1 is never a heading). */
  headings: Heading[];
}

interface ContentMetricsWithCounts extends ContentMetrics {
  readingMinutes: number;
  wordCount: number;
}

/**
 * The shared content-metrics extraction that posts/notes/flows/book-chapters
 * all performed inline: strip a leading H1, derive the excerpt from the
 * stripped body, and collect headings from the original content. Reading-time
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
  const headings = getHeadings(content);

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

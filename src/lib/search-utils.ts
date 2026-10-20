export type ContentType = 'All' | 'Post' | 'Flow' | 'Book' | 'Note';
export type ResultType = Exclude<ContentType, 'All'>;

/**
 * The Pagefind filter carrying each indexed page's type: every
 * data-pagefind-body surface marks `data-pagefind-filter="type:<ResultType>"`.
 */
export const SEARCH_TYPE_FILTER = 'type';

const RESULT_TYPES: readonly string[] = ['Post', 'Flow', 'Book', 'Note'] satisfies ResultType[];

export function isResultType(value: string): value is ResultType {
  return RESULT_TYPES.includes(value);
}

/** Derive content type from a Pagefind result URL. */
export function getResultType(url: string): ResultType {
  if (url.includes('/flows/')) return 'Flow';
  if (url.includes('/books/')) return 'Book';
  if (url.includes('/notes/')) return 'Note';
  return 'Post';
}

/** Extract YYYY-MM-DD from a flow URL like /flows/2026/01/15/ */
export function getDateFromUrl(url: string): string {
  const m = url.match(/\/flows\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Strip the " | Site Name" suffix that Pagefind picks up from <title>. */
export function cleanTitle(raw: string): string {
  const i = raw.lastIndexOf(' | ');
  return i >= 0 ? raw.slice(0, i) : raw;
}

/**
 * Parse and validate the persisted recent-searches list. Malformed or tampered
 * storage (e.g. '[{}]', '{"a":1}') can still JSON.parse successfully but would
 * render objects as list children; keep only strings and cap the length.
 */
export function parseRecentSearches(raw: string | null, max: number): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, max);
  } catch {
    return [];
  }
}

/**
 * Resolve an Alt+digit tab hotkey against the currently visible type tabs.
 * Every visible tab advertises an ⌥N hint, so every advertised N must resolve
 * — bounds come from the visible list, never a hardcoded digit set (the tab
 * count varies with enabled features and per-query result counts).
 */
export function resolveTypeHotkey(key: string, visibleTypes: ContentType[]): ContentType | undefined {
  if (!/^[1-9]$/.test(key)) return undefined;
  return visibleTypes[parseInt(key, 10) - 1];
}

/** Strip markdown/MDX syntax to plain text for full-content indexing. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
    .replace(/`[^`\n]+`/g, ' ')                // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')            // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links → text
    .replace(/<[^>]+>/g, ' ')                   // HTML/JSX/MDX tags
    .replace(/^#{1,6}\s+/gm, '')               // heading markers
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1') // bold/italic (*)
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, '$1')   // bold/italic (_)
    .replace(/~~([^~\n]+)~~/g, '$1')            // strikethrough
    .replace(/^\s*[-*+>]\s+/gm, '')             // lists + blockquotes
    .replace(/^\s*\d+\.\s+/gm, '')              // ordered lists
    .replace(/\s+/g, ' ')                       // normalize whitespace
    .trim()
    .slice(0, 2000);                             // cap for index size
}

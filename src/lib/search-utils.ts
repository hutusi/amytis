export type ContentType = 'All' | 'Post' | 'Flow' | 'Book';

/** Derive content type from a Pagefind result URL. */
export function getResultType(url: string): Exclude<ContentType, 'All'> {
  if (url.includes('/flows/')) return 'Flow';
  if (url.includes('/books/')) return 'Book';
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

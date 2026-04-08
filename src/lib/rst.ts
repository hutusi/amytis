import GithubSlugger from 'github-slugger';

export interface RstHeading {
  id: string;
  text: string;
  level: number;
}

export interface RstMetadata {
  date?: string;
  subtitle?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  authors?: string[];
  author?: string;
  layout?: string;
  series?: string;
  coverImage?: string;
  sort?: 'date-desc' | 'date-asc' | 'manual';
  posts?: string[];
  featured?: boolean;
  pinned?: boolean;
  draft?: boolean;
  latex?: boolean;
  toc?: boolean;
  commentable?: boolean;
  redirectFrom?: string[];
  type?: 'collection';
}

export interface ParsedRstDocument {
  title: string;
  body: string;
  markdownBody: string;
  metadata: RstMetadata;
  headings: RstHeading[];
  excerpt: string;
  readingTime: string;
}

export class RstParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RstParseError';
  }
}

const SUPPORTED_FIELDS = new Set([
  'date',
  'subtitle',
  'excerpt',
  'category',
  'tags',
  'authors',
  'author',
  'layout',
  'series',
  'coverimage',
  'sort',
  'posts',
  'featured',
  'pinned',
  'draft',
  'latex',
  'toc',
  'commentable',
  'redirectfrom',
  'type',
]);

function normalizeLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

function isAdornmentLine(line: string): boolean {
  const trimmed = line.trim();
  return /^([=\-~^"`+#*])\1{2,}$/.test(trimmed);
}

function extractTitle(lines: string[]): { title: string; titleIndex: number; nextIndex: number } {
  for (let i = 0; i + 1 < lines.length; i++) {
    const titleLine = lines[i].trim();
    const underline = lines[i + 1].trim();

    if (!titleLine) continue;
    if (/^\s/.test(lines[i])) continue;
    if (!isAdornmentLine(underline)) continue;

    return { title: titleLine, titleIndex: i, nextIndex: i + 2 };
  }

  throw new RstParseError('Missing top-level rST title.');
}

function parseBoolean(field: string, value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new RstParseError(`Invalid boolean for "${field}": ${value}`);
}

function parseCsv(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function parseDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    throw new RstParseError(`Invalid date: ${value}`);
  }

  const [, year, month, day] = match;
  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new RstParseError(`Invalid date: ${value}`);
  }

  return normalized;
}

function parseSort(value: string): 'date-desc' | 'date-asc' | 'manual' {
  if (value === 'date-desc' || value === 'date-asc' || value === 'manual') {
    return value;
  }
  throw new RstParseError(`Invalid sort value: ${value}`);
}

function parseType(value: string): 'collection' {
  if (value === 'collection') {
    return value;
  }
  throw new RstParseError(`Invalid type value: ${value}`);
}

function setMetadataField(metadata: RstMetadata, field: string, value: string): void {
  const key = field.toLowerCase();
  if (!SUPPORTED_FIELDS.has(key)) return;

  switch (key) {
    case 'date':
      metadata.date = parseDate(value);
      break;
    case 'subtitle':
      metadata.subtitle = value;
      break;
    case 'excerpt':
      metadata.excerpt = value;
      break;
    case 'category':
      metadata.category = value;
      break;
    case 'tags':
      metadata.tags = parseCsv(value);
      break;
    case 'authors':
      metadata.authors = parseCsv(value);
      break;
    case 'author':
      metadata.author = value;
      break;
    case 'layout':
      metadata.layout = value;
      break;
    case 'series':
      metadata.series = value;
      break;
    case 'coverimage':
      metadata.coverImage = value;
      break;
    case 'sort':
      metadata.sort = parseSort(value);
      break;
    case 'posts':
      metadata.posts = parseCsv(value);
      break;
    case 'featured':
      metadata.featured = parseBoolean(field, value);
      break;
    case 'pinned':
      metadata.pinned = parseBoolean(field, value);
      break;
    case 'draft':
      metadata.draft = parseBoolean(field, value);
      break;
    case 'latex':
      metadata.latex = parseBoolean(field, value);
      break;
    case 'toc':
      metadata.toc = parseBoolean(field, value);
      break;
    case 'commentable':
      metadata.commentable = parseBoolean(field, value);
      break;
    case 'redirectfrom':
      metadata.redirectFrom = parseCsv(value);
      break;
    case 'type':
      metadata.type = parseType(value);
      break;
  }
}

function extractMetadata(lines: string[], startIndex: number): { metadata: RstMetadata; nextIndex: number } {
  const metadata: RstMetadata = {};
  let i = startIndex;
  while (i < lines.length && !lines[i].trim()) i++;

  while (i < lines.length) {
    const match = lines[i].match(/^:([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) break;

    const field = match[1];
    const continuation: string[] = [match[2]];
    i++;

    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (/^:([A-Za-z][\w-]*):\s*(.*)$/.test(next)) break;
      if (/^\s+/.test(next)) {
        continuation.push(next.trim());
        i++;
        continue;
      }
      break;
    }

    setMetadataField(metadata, field, continuation.join(' ').trim());

    if (i < lines.length && !lines[i].trim()) {
      i++;
      if (i < lines.length && !/^:([A-Za-z][\w-]*):\s*(.*)$/.test(lines[i])) break;
    }
  }

  while (i < lines.length && !lines[i].trim()) i++;
  return { metadata, nextIndex: i };
}

function extractPreambleMetadata(lines: string[]): RstMetadata {
  const metadata: RstMetadata = {};

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^:([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;

    const field = match[1];
    const continuation: string[] = [match[2]];
    i++;

    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (/^:([A-Za-z][\w-]*):\s*(.*)$/.test(next)) {
        i--;
        break;
      }
      if (/^\s+/.test(next)) {
        continuation.push(next.trim());
        i++;
        continue;
      }
      i--;
      break;
    }

    setMetadataField(metadata, field, continuation.join(' ').trim());
  }

  return metadata;
}

function mergeMetadata(base: RstMetadata, override: RstMetadata): RstMetadata {
  return {
    ...base,
    ...override,
    tags: override.tags ?? base.tags,
    authors: override.authors ?? base.authors,
    posts: override.posts ?? base.posts,
    redirectFrom: override.redirectFrom ?? base.redirectFrom,
  };
}

function convertInlineRst(text: string): string {
  return text
    .replace(/``([^`]+)``/g, '`$1`')
    .replace(/`([^`]+?)\s*<([^>]+)>`__/g, '[$1]($2)')
    .replace(/`([^`]+?)\s*<([^>]+)>`_/g, '[$1]($2)');
}

function detectHeadingLevel(adornment: string): number | null {
  const marker = adornment.trim()[0];
  if (marker === '=') return 2;
  if (marker === '-' || marker === '~' || marker === '^') return 3;
  return null;
}

function readIndentedBlock(lines: string[], startIndex: number): { content: string[]; nextIndex: number } {
  let i = startIndex;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length || !/^\s+/.test(lines[i])) {
    return { content: [], nextIndex: startIndex };
  }

  const indent = lines[i].match(/^\s+/)?.[0].length ?? 0;
  const content: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      content.push('');
      i++;
      continue;
    }
    const currentIndent = line.match(/^\s+/)?.[0].length ?? 0;
    if (currentIndent < indent) break;
    content.push(line.slice(indent));
    i++;
  }

  while (content.length > 0 && content[0] === '') content.shift();
  while (content.length > 0 && content[content.length - 1] === '') content.pop();

  return { content, nextIndex: i };
}

export function rstToMarkdown(body: string): string {
  const lines = normalizeLines(body);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      out.push('');
      continue;
    }

    if (
      i + 1 < lines.length &&
      line.trim() &&
      isAdornmentLine(lines[i + 1]) &&
      !/^\s/.test(line)
    ) {
      const level = detectHeadingLevel(lines[i + 1]);
      if (level !== null) {
        out.push(`${'#'.repeat(level)} ${convertInlineRst(trimmed)}`);
        out.push('');
        i++;
        continue;
      }
    }

    const imageMatch = line.match(/^\.\.\s+image::\s+(.+?)\s*$/);
    if (imageMatch) {
      let alt = '';
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      while (j < lines.length && /^\s+:[A-Za-z-]+:/.test(lines[j])) {
        const optionMatch = lines[j].match(/^\s+:([A-Za-z-]+):\s*(.*)$/);
        if (optionMatch?.[1].toLowerCase() === 'alt') {
          alt = optionMatch[2].trim();
        }
        j++;
      }
      out.push(`![${alt}](${imageMatch[1].trim()})`);
      out.push('');
      i = j - 1;
      continue;
    }

    const codeMatch = line.match(/^\.\.\s+(?:code-block|code)::\s*([A-Za-z0-9_-]+)?\s*$/);
    if (codeMatch) {
      const { content, nextIndex } = readIndentedBlock(lines, i + 1);
      out.push(`\`\`\`${codeMatch[1] ?? ''}`.trimEnd());
      out.push(...content);
      out.push('```');
      out.push('');
      i = nextIndex - 1;
      continue;
    }

    if (trimmed.endsWith('::') && !trimmed.startsWith('..')) {
      const { content, nextIndex } = readIndentedBlock(lines, i + 1);
      if (content.length > 0) {
        const prefix = trimmed === '::' ? '' : convertInlineRst(trimmed.slice(0, -1));
        if (prefix) {
          out.push(prefix);
          out.push('');
        }
        out.push('```');
        out.push(...content);
        out.push('```');
        out.push('');
        i = nextIndex - 1;
        continue;
      }
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      out.push(convertInlineRst(line));
      continue;
    }

    out.push(convertInlineRst(line));
  }

  return out.join('\n').trim();
}

function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const hanCharsPerMinute = 300;

  const text = content
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~>\-[\]()]/g, ' ');

  const hanCharCount = (text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length;
  const latinWordCount = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;

  const estimatedMinutes = (latinWordCount / wordsPerMinute) + (hanCharCount / hanCharsPerMinute);
  const minutes = Math.max(1, Math.ceil(estimatedMinutes));
  return `${minutes} min read`;
}

function getHeadings(content: string): RstHeading[] {
  const regex = /^(#{2,3})\s+(.*)$/gm;
  const headings: RstHeading[] = [];
  const slugger = new GithubSlugger();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    headings.push({ id: slugger.slug(text), text, level });
  }
  return headings;
}

export function parseRstDocument(source: string): ParsedRstDocument {
  const lines = normalizeLines(source);
  const { title, titleIndex, nextIndex } = extractTitle(lines);
  const preTitleMetadata = extractPreambleMetadata(lines.slice(0, titleIndex));
  const { metadata: postTitleMetadata, nextIndex: contentIndex } = extractMetadata(lines, nextIndex);
  const metadata = mergeMetadata(preTitleMetadata, postTitleMetadata);
  const body = lines.slice(contentIndex).join('\n').trim();
  const markdownBody = rstToMarkdown(body);

  return {
    title,
    body,
    markdownBody,
    metadata,
    headings: getHeadings(markdownBody),
    excerpt: metadata.excerpt ?? '',
    readingTime: calculateReadingTime(markdownBody),
  };
}

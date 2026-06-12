/**
 * Shared rST docinfo metadata normalization.
 *
 * Two adapters parse rST metadata: the JS fallback parser (`rst.ts`, raw
 * `:Field: value` strings) and the Python docutils renderer (`rst-renderer.ts`,
 * JSON values of unknown type). Both must produce identical `RstMetadata`
 * for the same document, so the field switch, the per-field validators, and
 * the error type live here and only here.
 */

export class RstParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RstParseError';
  }
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

function parseBoolean(field: string, value: unknown): boolean {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  throw new RstParseError(`Invalid boolean for "${field}": ${String(value)}`);
}

function parseString(field: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new RstParseError(`Invalid value for "${field}": ${String(value)}`);
  }
  return value.trim();
}

function parseStringArray(field: string, value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => parseString(field, item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  throw new RstParseError(`Invalid list for "${field}": ${String(value)}`);
}

function parseDate(value: unknown): string {
  const date = parseString('date', value);
  const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    throw new RstParseError(`Invalid date: ${date}`);
  }

  const [, year, month, day] = match;
  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new RstParseError(`Invalid date: ${date}`);
  }

  return normalized;
}

function parseSort(value: unknown): 'date-desc' | 'date-asc' | 'manual' {
  const sort = parseString('sort', value);
  if (sort === 'date-desc' || sort === 'date-asc' || sort === 'manual') {
    return sort;
  }
  throw new RstParseError(`Invalid sort value: ${sort}`);
}

function parseType(value: unknown): 'collection' {
  const type = parseString('type', value);
  if (type === 'collection') return type;
  throw new RstParseError(`Invalid type value: ${type}`);
}

/**
 * Normalize one docinfo field into `metadata`. Field names are matched
 * case-insensitively; unsupported fields are skipped silently (rST docinfo
 * routinely carries fields Amytis does not model, e.g. `:Version:`).
 */
export function normalizeRstMetadataField(metadata: RstMetadata, rawField: string, value: unknown): void {
  const key = rawField.toLowerCase();

  switch (key) {
    case 'date':
      metadata.date = parseDate(value);
      break;
    case 'subtitle':
      metadata.subtitle = parseString('subtitle', value);
      break;
    case 'excerpt':
      metadata.excerpt = parseString('excerpt', value);
      break;
    case 'category':
      metadata.category = parseString('category', value);
      break;
    case 'tags':
      metadata.tags = parseStringArray('tags', value);
      break;
    case 'authors':
      metadata.authors = parseStringArray('authors', value);
      break;
    case 'author':
      metadata.author = parseString('author', value);
      break;
    case 'layout':
      metadata.layout = parseString('layout', value);
      break;
    case 'series':
      metadata.series = parseString('series', value);
      break;
    case 'coverimage':
      metadata.coverImage = parseString('coverImage', value);
      break;
    case 'sort':
      metadata.sort = parseSort(value);
      break;
    case 'posts':
      metadata.posts = parseStringArray('posts', value);
      break;
    case 'featured':
      metadata.featured = parseBoolean(rawField, value);
      break;
    case 'pinned':
      metadata.pinned = parseBoolean(rawField, value);
      break;
    case 'draft':
      metadata.draft = parseBoolean(rawField, value);
      break;
    case 'latex':
      metadata.latex = parseBoolean(rawField, value);
      break;
    case 'toc':
      metadata.toc = parseBoolean(rawField, value);
      break;
    case 'commentable':
      metadata.commentable = parseBoolean(rawField, value);
      break;
    case 'redirectfrom':
      metadata.redirectFrom = parseStringArray('redirectFrom', value);
      break;
    case 'type':
      metadata.type = parseType(value);
      break;
    default:
      break;
  }
}

/** Normalize a whole docinfo record (the Python renderer's JSON metadata). */
export function normalizeRstMetadata(entries: Record<string, unknown>): RstMetadata {
  const metadata: RstMetadata = {};
  for (const [rawField, value] of Object.entries(entries)) {
    normalizeRstMetadataField(metadata, rawField, value);
  }
  return metadata;
}

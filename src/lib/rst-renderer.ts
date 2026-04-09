import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RstMetadata, RstParseError } from './rst';

export interface PythonRstHeading {
  id: string;
  text: string;
  level: number;
}

export interface PythonRstAsset {
  original: string;
  resolved: string;
  exists: boolean;
}

export interface PythonRstRenderResult {
  title: string;
  html: string;
  text: string;
  headings: PythonRstHeading[];
  metadata: Record<string, unknown>;
  assets?: PythonRstAsset[];
  warnings?: string[];
}

export interface RenderedRstDocument {
  title: string;
  html: string;
  text: string;
  headings: PythonRstHeading[];
  metadata: RstMetadata;
  excerpt: string;
  readingTime: string;
  assets: PythonRstAsset[];
  warnings: string[];
}

export interface PythonRstBatchEntry {
  file: string;
  imageBaseSlug: string;
}

interface PythonRstBatchResponseItem {
  file: string;
  ok: boolean;
  result?: PythonRstRenderResult;
  error?: string;
}

interface PythonCommandSpec {
  executable: string;
  args: string[];
  cacheKey: string;
}

const rstRenderCache = new Map<string, RenderedRstDocument>();
const PYTHON_RENDERER_MAX_BUFFER = 1024 * 1024 * 128;
let resolvedPythonCommandSpec: PythonCommandSpec | null = null;

export function resetPythonCommandSpecForTests(): void {
  resolvedPythonCommandSpec = null;
}

function canonicalizeSourcePath(filePath: string): string {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

function getRenderCacheKey(filePath: string, imageBaseSlug: string): string {
  const stats = fs.statSync(filePath);
  return `${getPythonCommandSpecForRstRenderer().cacheKey}::${filePath}::${imageBaseSlug}::${stats.mtimeMs}::${stats.size}`;
}

export function getPythonCommandSpecForRstRenderer(): PythonCommandSpec {
  if (resolvedPythonCommandSpec) {
    return resolvedPythonCommandSpec;
  }

  if (process.env.AMYTIS_RST_PYTHON) {
    resolvedPythonCommandSpec = {
      executable: process.env.AMYTIS_RST_PYTHON,
      args: [],
      cacheKey: process.env.AMYTIS_RST_PYTHON,
    };
    return resolvedPythonCommandSpec;
  }

  const candidates: PythonCommandSpec[] = process.platform === 'win32'
    ? [
      { executable: 'py', args: ['-3'], cacheKey: 'py::-3' },
      { executable: 'python', args: [], cacheKey: 'python' },
    ]
    : [
      { executable: 'python3', args: [], cacheKey: 'python3' },
      { executable: 'python', args: [], cacheKey: 'python' },
    ];

  for (const candidate of candidates) {
    const probe = spawnSync(candidate.executable, [...candidate.args, '--version'], {
      encoding: 'utf8',
    });
    if (!probe.error && probe.status === 0) {
      resolvedPythonCommandSpec = candidate;
      return resolvedPythonCommandSpec;
    }
  }

  resolvedPythonCommandSpec = process.platform === 'win32'
    ? { executable: 'py', args: ['-3'], cacheKey: 'py::-3' }
    : { executable: 'python3', args: [], cacheKey: 'python3' };
  return resolvedPythonCommandSpec;
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

export function normalizePythonRstMetadata(metadata: Record<string, unknown>): RstMetadata {
  const normalized: RstMetadata = {};

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    const key = rawKey.toLowerCase();

    switch (key) {
      case 'date':
        normalized.date = parseDate(rawValue);
        break;
      case 'subtitle':
        normalized.subtitle = parseString('subtitle', rawValue);
        break;
      case 'excerpt':
        normalized.excerpt = parseString('excerpt', rawValue);
        break;
      case 'category':
        normalized.category = parseString('category', rawValue);
        break;
      case 'tags':
        normalized.tags = parseStringArray('tags', rawValue);
        break;
      case 'authors':
        normalized.authors = parseStringArray('authors', rawValue);
        break;
      case 'author':
        normalized.author = parseString('author', rawValue);
        break;
      case 'layout':
        normalized.layout = parseString('layout', rawValue);
        break;
      case 'series':
        normalized.series = parseString('series', rawValue);
        break;
      case 'coverimage':
      case 'coverImage':
        normalized.coverImage = parseString('coverImage', rawValue);
        break;
      case 'sort':
        normalized.sort = parseSort(rawValue);
        break;
      case 'posts':
        normalized.posts = parseStringArray('posts', rawValue);
        break;
      case 'featured':
        normalized.featured = parseBoolean('featured', rawValue);
        break;
      case 'pinned':
        normalized.pinned = parseBoolean('pinned', rawValue);
        break;
      case 'draft':
        normalized.draft = parseBoolean('draft', rawValue);
        break;
      case 'latex':
        normalized.latex = parseBoolean('latex', rawValue);
        break;
      case 'toc':
        normalized.toc = parseBoolean('toc', rawValue);
        break;
      case 'commentable':
        normalized.commentable = parseBoolean('commentable', rawValue);
        break;
      case 'redirectfrom':
      case 'redirectFrom':
        normalized.redirectFrom = parseStringArray('redirectFrom', rawValue);
        break;
      case 'type':
        normalized.type = parseType(rawValue);
        break;
      default:
        break;
    }
  }

  return normalized;
}

function calculateReadingTimeFromText(text: string): string {
  const wordsPerMinute = 200;
  const hanCharsPerMinute = 300;

  const hanCharCount = (text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length;
  const latinWordCount = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;

  const estimatedMinutes = (latinWordCount / wordsPerMinute) + (hanCharCount / hanCharsPerMinute);
  return `${Math.max(1, Math.ceil(estimatedMinutes))} min read`;
}

export function validatePythonRstResult(result: PythonRstRenderResult, filePath: string): void {
  if (!result || typeof result !== 'object') {
    throw new RstParseError(`Invalid renderer output for ${filePath}: expected object.`);
  }

  if (typeof result.title !== 'string' || !result.title.trim()) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: missing title.`);
  }
  if (typeof result.html !== 'string') {
    throw new RstParseError(`Invalid renderer output for ${filePath}: missing html.`);
  }
  if (typeof result.text !== 'string') {
    throw new RstParseError(`Invalid renderer output for ${filePath}: missing text.`);
  }
  if (!Array.isArray(result.headings)) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: headings must be an array.`);
  }
  if (!result.headings.every((heading) =>
    heading &&
    typeof heading.id === 'string' &&
    typeof heading.text === 'string' &&
    typeof heading.level === 'number'
  )) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: malformed heading entry.`);
  }
  if (!result.metadata || typeof result.metadata !== 'object' || Array.isArray(result.metadata)) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: metadata must be an object.`);
  }
  if (result.assets && !Array.isArray(result.assets)) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: assets must be an array.`);
  }
  if (result.assets && !result.assets.every((asset) =>
    asset &&
    typeof asset.original === 'string' &&
    typeof asset.resolved === 'string' &&
    typeof asset.exists === 'boolean'
  )) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: malformed asset entry.`);
  }
  if (result.warnings && !Array.isArray(result.warnings)) {
    throw new RstParseError(`Invalid renderer output for ${filePath}: warnings must be an array.`);
  }
}

export function runPythonRstRenderer(filePath: string, imageBaseSlug: string): PythonRstRenderResult {
  const scriptPath = path.join(process.cwd(), 'scripts', 'render-rst.py');
  const pythonCommand = getPythonCommandSpecForRstRenderer();
  const result = spawnSync(pythonCommand.executable, [
    ...pythonCommand.args,
    scriptPath,
    '--file',
    filePath,
    '--image-base-slug',
    imageBaseSlug,
    '--strict',
  ], {
    encoding: 'utf8',
    maxBuffer: PYTHON_RENDERER_MAX_BUFFER,
  });

  if (result.error) {
    throw new RstParseError(`Failed to run Python rST renderer for ${filePath}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new RstParseError(
      result.stderr.trim() || `Python rST renderer exited with status ${result.status} for ${filePath}.`
    );
  }

  try {
    return JSON.parse(result.stdout) as PythonRstRenderResult;
  } catch (error) {
    throw new RstParseError(
      `Invalid JSON from Python rST renderer for ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function runPythonRstRendererBatch(entries: PythonRstBatchEntry[]): Map<string, PythonRstRenderResult> {
  if (entries.length === 0) return new Map();

  const scriptPath = path.join(process.cwd(), 'scripts', 'render-rst.py');
  const pythonCommand = getPythonCommandSpecForRstRenderer();
  const shouldUseBatchFile = process.platform === 'win32' && pythonCommand.executable === 'py';
  let batchFilePath: string | null = null;

  const result = (() => {
    if (shouldUseBatchFile) {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-rst-batch-'));
      batchFilePath = path.join(tempDir, 'batch.json');
      fs.writeFileSync(batchFilePath, JSON.stringify(entries), 'utf8');

      return spawnSync(pythonCommand.executable, [
        ...pythonCommand.args,
        scriptPath,
        '--batch-file',
        batchFilePath,
        '--strict',
      ], {
        encoding: 'utf8',
        maxBuffer: PYTHON_RENDERER_MAX_BUFFER,
      });
    }

    return spawnSync(pythonCommand.executable, [
      ...pythonCommand.args,
      scriptPath,
      '--batch-stdin',
      '--strict',
    ], {
      encoding: 'utf8',
      input: JSON.stringify(entries),
      maxBuffer: PYTHON_RENDERER_MAX_BUFFER,
    });
  })();

  if (batchFilePath) {
    try {
      fs.rmSync(path.dirname(batchFilePath), { recursive: true, force: true });
    } catch {
      // Best-effort cleanup for Windows batch temp files.
    }
  }

  if (result.error) {
    throw new RstParseError(`Failed to run Python rST renderer batch: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new RstParseError(
      result.stderr.trim() || `Python rST renderer batch exited with status ${result.status}.`
    );
  }

  let parsed: PythonRstBatchResponseItem[];
  try {
    parsed = JSON.parse(result.stdout) as PythonRstBatchResponseItem[];
  } catch (error) {
    throw new RstParseError(
      `Invalid JSON from Python rST renderer batch: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new RstParseError('Invalid batch response from Python rST renderer: expected an array.');
  }

  const renderedByFile = new Map<string, PythonRstRenderResult>();
  for (const item of parsed) {
    if (!item || typeof item.file !== 'string' || typeof item.ok !== 'boolean') {
      throw new RstParseError('Invalid batch response item from Python rST renderer.');
    }
    if (!item.ok) {
      throw new RstParseError(item.error || `Python rST renderer batch failed for ${item.file}.`);
    }
    if (!item.result) {
      throw new RstParseError(`Python rST renderer batch returned no result for ${item.file}.`);
    }
    renderedByFile.set(canonicalizeSourcePath(item.file), item.result);
  }

  return renderedByFile;
}

export function renderRstFile(filePath: string, imageBaseSlug: string): RenderedRstDocument {
  const cacheKey = getRenderCacheKey(filePath, imageBaseSlug);
  const cached = rstRenderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = runPythonRstRenderer(filePath, imageBaseSlug);
  validatePythonRstResult(result, filePath);
  const metadata = normalizePythonRstMetadata(result.metadata);

  const rendered = {
    title: result.title,
    html: result.html,
    text: result.text,
    headings: result.headings,
    metadata,
    excerpt: metadata.excerpt ?? '',
    readingTime: calculateReadingTimeFromText(result.text),
    assets: result.assets ?? [],
    warnings: (result.warnings ?? []).map((warning) => String(warning)),
  };

  rstRenderCache.set(cacheKey, rendered);
  return rendered;
}

export function renderRstFilesBatch(entries: PythonRstBatchEntry[]): Map<string, RenderedRstDocument> {
  const renderedByFile = new Map<string, RenderedRstDocument>();
  const uncachedEntries: PythonRstBatchEntry[] = [];

  for (const entry of entries) {
    const cacheKey = getRenderCacheKey(entry.file, entry.imageBaseSlug);
    const cached = rstRenderCache.get(cacheKey);
    if (cached) {
      renderedByFile.set(entry.file, cached);
      continue;
    }
    uncachedEntries.push(entry);
  }

  if (uncachedEntries.length === 0) {
    return renderedByFile;
  }

  const batchResults = runPythonRstRendererBatch(uncachedEntries);
  for (const entry of uncachedEntries) {
    const result = batchResults.get(canonicalizeSourcePath(entry.file));
    if (!result) {
      throw new RstParseError(`Python rST renderer batch returned no result for ${entry.file}.`);
    }
    validatePythonRstResult(result, entry.file);
    const metadata = normalizePythonRstMetadata(result.metadata);
    const rendered: RenderedRstDocument = {
      title: result.title,
      html: result.html,
      text: result.text,
      headings: result.headings,
      metadata,
      excerpt: metadata.excerpt ?? '',
      readingTime: calculateReadingTimeFromText(result.text),
      assets: result.assets ?? [],
      warnings: (result.warnings ?? []).map((warning) => String(warning)),
    };
    rstRenderCache.set(getRenderCacheKey(entry.file, entry.imageBaseSlug), rendered);
    renderedByFile.set(entry.file, rendered);
  }

  return renderedByFile;
}

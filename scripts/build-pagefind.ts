import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as pagefind from 'pagefind';

interface PagefindManifest {
  version: string;
  sitePath: string;
  outputPath: string;
  files: Record<string, string>;
}

const PAGEFIND_MANIFEST_VERSION = '1';
const pagefindCacheDir = path.join(process.cwd(), '.cache', 'pagefind');

function parseArgs(argv: string[]): { sitePath: string; outputPath: string } {
  let sitePath = 'out';
  let outputPath = path.join('out', 'pagefind');

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--site') {
      sitePath = argv[++i] ?? sitePath;
      continue;
    }
    if (arg === '--output-path') {
      outputPath = argv[++i] ?? outputPath;
      continue;
    }
  }

  return { sitePath, outputPath };
}

function walkHtmlFiles(rootDir: string): string[] {
  const files: string[] = [];

  const visit = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  };

  if (fs.existsSync(rootDir)) {
    visit(rootDir);
  }

  return files.sort();
}

export function collectHtmlFileHashes(sitePath: string): Record<string, string> {
  const absoluteSitePath = path.resolve(sitePath);
  const files = walkHtmlFiles(absoluteSitePath);
  const hashes: Record<string, string> = {};

  for (const filePath of files) {
    const relativePath = path.relative(absoluteSitePath, filePath).replaceAll(path.sep, '/');
    const content = fs.readFileSync(filePath);
    hashes[relativePath] = createHash('sha1').update(content).digest('hex');
  }

  return hashes;
}

function getPagefindManifestPath(sitePath: string, outputPath: string): string {
  const cacheKey = createHash('sha1')
    .update(`${path.resolve(sitePath)}::${path.resolve(outputPath)}`)
    .digest('hex');
  return path.join(pagefindCacheDir, `${cacheKey}.json`);
}

export function getPagefindManifestPathForTests(sitePath: string, outputPath: string): string {
  return getPagefindManifestPath(sitePath, outputPath);
}

function loadManifest(sitePath: string, outputPath: string): PagefindManifest | null {
  const manifestPath = getPagefindManifestPath(sitePath, outputPath);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PagefindManifest;
  } catch {
    return null;
  }
}

function writeManifest(sitePath: string, outputPath: string, files: Record<string, string>): void {
  const manifestPath = getPagefindManifestPath(sitePath, outputPath);
  const manifest: PagefindManifest = {
    version: PAGEFIND_MANIFEST_VERSION,
    sitePath: path.resolve(sitePath),
    outputPath: path.resolve(outputPath),
    files,
  };

  try {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
  } catch (error) {
    console.warn(`[pagefind] Failed to persist manifest at ${manifestPath}:`, error);
  }
}

export function shouldSkipPagefindBuild(sitePath: string, outputPath: string, currentFiles: Record<string, string>): boolean {
  const manifest = loadManifest(sitePath, outputPath);
  if (!manifest) return false;
  if (manifest.version !== PAGEFIND_MANIFEST_VERSION) return false;
  if (manifest.sitePath !== path.resolve(sitePath)) return false;
  if (manifest.outputPath !== path.resolve(outputPath)) return false;
  if (!fs.existsSync(outputPath)) return false;

  const previousEntries = Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b));
  const currentEntries = Object.entries(currentFiles).sort(([a], [b]) => a.localeCompare(b));
  if (previousEntries.length !== currentEntries.length) return false;

  return previousEntries.every(([file, hash], index) => {
    const [currentFile, currentHash] = currentEntries[index];
    return file === currentFile && hash === currentHash;
  });
}

async function buildPagefind(sitePath: string, outputPath: string): Promise<void> {
  const currentFiles = collectHtmlFileHashes(sitePath);

  if (shouldSkipPagefindBuild(sitePath, outputPath, currentFiles)) {
    console.log(`[pagefind] Skipping rebuild; no HTML changes detected for ${sitePath}.`);
    return;
  }

  fs.rmSync(outputPath, { recursive: true, force: true });

  const { index, errors } = await pagefind.createIndex();
  if (errors.length > 0 || !index) {
    throw new Error(`Failed to create Pagefind index: ${errors.join(', ') || 'unknown error'}`);
  }

  try {
    const addResult = await index.addDirectory({ path: sitePath });
    if (addResult.errors.length > 0) {
      throw new Error(`Failed to index ${sitePath}: ${addResult.errors.join(', ')}`);
    }

    const writeResult = await index.writeFiles({ outputPath });
    if (writeResult.errors.length > 0) {
      throw new Error(`Failed to write Pagefind output: ${writeResult.errors.join(', ')}`);
    }
  } finally {
    await pagefind.close();
  }

  writeManifest(sitePath, outputPath, currentFiles);
}

async function main() {
  const { sitePath, outputPath } = parseArgs(Bun.argv.slice(2));
  await buildPagefind(sitePath, outputPath);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('[pagefind] Build failed:', error);
    process.exit(1);
  });
}

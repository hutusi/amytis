import fs from 'fs';
import path from 'path';
import { siteConfig } from '../site.config';

const srcDir = path.join(process.cwd(), 'content', 'posts');
const seriesSrcDir = path.join(process.cwd(), 'content', 'series');
const booksSrcDir = path.join(process.cwd(), 'content', 'books');
const flowsSrcDir = path.join(process.cwd(), 'content', 'flows');
const destDir = path.join(process.cwd(), 'public', 'posts');
const booksDestDir = path.join(process.cwd(), 'public', 'books');
const flowsDestDir = path.join(process.cwd(), 'public', 'flows');
const optimizerDirName = 'nextImageExportOptimizer';
const generatedAssetDestinations = new Set<string>();

function copyFileOrThrow(srcPath: string, destPath: string, context: string) {
  try {
    fs.copyFileSync(srcPath, destPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[copy-assets] Failed to copy ${context}: ${srcPath} -> ${destPath}: ${message}`);
  }
}

function markGeneratedDestination(destPath: string) {
  generatedAssetDestinations.add(path.resolve(destPath));
}

function shouldPreserveOptimizerDir(optimizerPath: string): boolean {
  const optimizerParentPath = path.resolve(path.dirname(optimizerPath));
  return [...generatedAssetDestinations].some((generatedDestination) =>
    optimizerParentPath === generatedDestination ||
    optimizerParentPath.startsWith(`${generatedDestination}${path.sep}`)
  );
}

function pruneOrphanedOptimizerDirs(rootDir: string) {
  if (!fs.existsSync(rootDir)) return;

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === optimizerDirName) {
      if (!shouldPreserveOptimizerDir(entryPath)) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
      continue;
    }

    pruneOrphanedOptimizerDirs(entryPath);
  }
}

function resetGeneratedAssetDirs() {
  generatedAssetDestinations.clear();
  fs.mkdirSync(destDir, { recursive: true });
  fs.mkdirSync(booksDestDir, { recursive: true });
  fs.mkdirSync(flowsDestDir, { recursive: true });
}

function shouldSkipSourceFile(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx') || name.endsWith('.rst');
}

function shouldCopyBasedOnMtimeAndSize(srcPath: string, destPath: string): boolean {
  if (!fs.existsSync(destPath)) {
    return true;
  }

  const srcStat = fs.statSync(srcPath);
  const destStat = fs.statSync(destPath);
  return srcStat.mtimeMs > destStat.mtimeMs || srcStat.size !== destStat.size;
}

function syncRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const srcEntries = fs.readdirSync(src, { withFileTypes: true });
  const srcNames = new Set(srcEntries.map((entry) => entry.name));

  for (const entry of srcEntries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      syncRecursive(srcPath, destPath);
    } else {
      if (shouldSkipSourceFile(entry.name)) {
        continue;
      }

      if (shouldCopyBasedOnMtimeAndSize(srcPath, destPath)) {
        copyFileOrThrow(srcPath, destPath, 'recursive asset');
      }
    }
  }

  const destEntries = fs.readdirSync(dest, { withFileTypes: true });
  for (const entry of destEntries) {
    if (entry.name === optimizerDirName) continue;

    const destPath = path.join(dest, entry.name);

    if (!srcNames.has(entry.name)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }
  }
}

function getSlugFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.(mdx?|rst)$/, '');
  const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
  const match = nameWithoutExt.match(dateRegex);

  if (match && !siteConfig.posts?.includeDateInUrl) {
    return match[2];
  }
  return nameWithoutExt;
}

function isLocalAssetReference(rawPath: string): boolean {
  const trimmed = rawPath.trim();
  return Boolean(trimmed) &&
    !trimmed.startsWith('#') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('data:') &&
    !trimmed.startsWith('mailto:') &&
    !trimmed.startsWith('javascript:');
}

function normalizeReferencedAssetPath(rawPath: string): string | null {
  const trimmed = rawPath.trim().replace(/^['"]|['"]$/g, '');
  const withoutFragment = trimmed.split('#')[0]?.split('?')[0]?.trim();
  if (!withoutFragment || !isLocalAssetReference(withoutFragment)) {
    return null;
  }

  return withoutFragment;
}

function extractReferencedAssetPaths(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const references = new Set<string>();
  const patterns = [
    /\!\[[^\]]*\]\(([^)]+)\)/g,
    /\[[^\]]*\]\(([^)]+)\)/g,
    /\b(?:src|href|poster)=["']([^"']+)["']/g,
    /^\s*\.\.\s+(?:image|figure)::\s+(.+)$/gm,
    /^coverImage:\s*['"]?([^'"\n]+)['"]?$/gm,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const candidate = normalizeReferencedAssetPath(match[1] ?? '');
      if (candidate) {
        references.add(candidate);
      }
    }
  }

  return [...references];
}

function syncReferencedAssets(sourceFile: string, rootDir: string, destPostDir: string) {
  const references = extractReferencedAssetPaths(sourceFile);
  const desiredRelativePaths = new Set<string>();

  if (!fs.existsSync(destPostDir)) {
    fs.mkdirSync(destPostDir, { recursive: true });
  }

  references.forEach((reference) => {
    const absolutePath = path.resolve(path.dirname(sourceFile), reference);
    const relativeToRoot = path.relative(rootDir, absolutePath);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot) || !fs.existsSync(absolutePath)) {
      return;
    }

    const sourceStat = fs.statSync(absolutePath);
    if (sourceStat.isDirectory()) {
      return;
    }

    if (absolutePath.endsWith('.md') || absolutePath.endsWith('.mdx') || absolutePath.endsWith('.rst')) {
      return;
    }

    const destPath = path.join(destPostDir, relativeToRoot);
    desiredRelativePaths.add(relativeToRoot.replaceAll(path.sep, '/'));
    if (!fs.existsSync(path.dirname(destPath))) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }

    if (shouldCopyBasedOnMtimeAndSize(absolutePath, destPath)) {
      copyFileOrThrow(absolutePath, destPath, `referenced asset from ${sourceFile}`);
    }
  });

  function pruneDestDir(currentDir: string, relativeDir = '') {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === optimizerDirName) continue;

      const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const normalizedRelativePath = relativePath.replaceAll(path.sep, '/');
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const hasDesiredDescendant = [...desiredRelativePaths].some((desiredPath) =>
          desiredPath === normalizedRelativePath || desiredPath.startsWith(`${normalizedRelativePath}/`)
        );

        if (!hasDesiredDescendant) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          continue;
        }

        pruneDestDir(fullPath, relativePath);
        if (fs.existsSync(fullPath) && fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
        continue;
      }

      if (!desiredRelativePaths.has(normalizedRelativePath)) {
        fs.rmSync(fullPath, { force: true });
      }
    }
  }

  pruneDestDir(destPostDir);
}

function processPosts() {
  if (fs.existsSync(srcDir)) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    entries.forEach((entry) => {
      if (entry.isDirectory()) {
        const targetName = getSlugFromFilename(entry.name);
        const srcPostDir = path.join(srcDir, entry.name);
        const destPostDir = path.join(destDir, targetName);

        console.log(`Processing Post: ${entry.name} -> ${targetName}`);
        markGeneratedDestination(destPostDir);
        syncRecursive(srcPostDir, destPostDir);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx') || entry.name.endsWith('.rst'))) {
        const targetName = getSlugFromFilename(entry.name);
        const sourceFile = path.join(srcDir, entry.name);
        const destPostDir = path.join(destDir, targetName);

        console.log(`Processing Flat Post: ${entry.name} -> ${targetName}`);
        markGeneratedDestination(destPostDir);
        if (!fs.existsSync(destPostDir)) {
          fs.mkdirSync(destPostDir, { recursive: true });
        }
        syncReferencedAssets(sourceFile, srcDir, destPostDir);
      }
    });
  }
}

// Check if a directory is a post folder (contains index.md or index.mdx)
function isPostFolder(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, 'index.md')) ||
         fs.existsSync(path.join(dirPath, 'index.mdx')) ||
         fs.existsSync(path.join(dirPath, 'index.rst'));
}

function processSeries() {
  if (!fs.existsSync(seriesSrcDir)) return;

  const seriesEntries = fs.readdirSync(seriesSrcDir, { withFileTypes: true });

  seriesEntries.forEach((seriesEntry) => {
    if (seriesEntry.isDirectory()) {
      const seriesPath = path.join(seriesSrcDir, seriesEntry.name);
      const items = fs.readdirSync(seriesPath, { withFileTypes: true });

      // Process items in series folder
      items.forEach(item => {
        if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.mdx') || item.name.endsWith('.rst'))) {
          // File-based post or series index
          const isSeriesIndex = item.name.startsWith('index.') || item.name.startsWith('README.');
          const targetSlug = isSeriesIndex ? seriesEntry.name : getSlugFromFilename(item.name);
          const sourceFile = path.join(seriesPath, item.name);
          const destPostDir = path.join(destDir, targetSlug);

          console.log(`Processing Series File: ${item.name} -> ${targetSlug}`);
          markGeneratedDestination(destPostDir);

          if (!fs.existsSync(destPostDir)) {
            fs.mkdirSync(destPostDir, { recursive: true });
          }

          syncReferencedAssets(sourceFile, seriesPath, destPostDir);

        } else if (item.isDirectory() && isPostFolder(path.join(seriesPath, item.name))) {
          // Folder-based post: copy only its own assets
          const targetSlug = getSlugFromFilename(item.name);
          const itemSrcPath = path.join(seriesPath, item.name);
          const destPostDir = path.join(destDir, targetSlug);

          console.log(`Processing Series Post Folder: ${item.name} -> ${targetSlug}`);
          markGeneratedDestination(destPostDir);

          // Copy everything from the post folder EXCEPT markdown files
          const subItems = fs.readdirSync(itemSrcPath, { withFileTypes: true });
          subItems.forEach(sub => {
            const srcPath = path.join(itemSrcPath, sub.name);
            const destPath = path.join(destPostDir, sub.name);

            if (sub.isDirectory()) {
              syncRecursive(srcPath, destPath);
            } else if (!shouldSkipSourceFile(sub.name)) {
              if (!fs.existsSync(destPostDir)) {
                fs.mkdirSync(destPostDir, { recursive: true });
              }
              if (shouldCopyBasedOnMtimeAndSize(srcPath, destPath)) {
                copyFileOrThrow(srcPath, destPath, `series post asset from ${itemSrcPath}`);
              }
            }
          });
        }
      });
    }
  });
}

function processBooks() {
  if (!fs.existsSync(booksSrcDir)) return;

  const entries = fs.readdirSync(booksSrcDir, { withFileTypes: true });

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      const srcBookDir = path.join(booksSrcDir, entry.name);
      const destBookDir = path.join(booksDestDir, entry.name);

      console.log(`Processing Book: ${entry.name}`);
      markGeneratedDestination(destBookDir);
      syncRecursive(srcBookDir, destBookDir);
    }
  });
}

function processFlows() {
  if (!fs.existsSync(flowsSrcDir)) return;

  // Walk content/flows/YYYY/MM/ structure for folder-based flows with co-located assets
  const yearDirs = fs.readdirSync(flowsSrcDir, { withFileTypes: true });
  for (const yearEntry of yearDirs) {
    if (!yearEntry.isDirectory() || !/^\d{4}$/.test(yearEntry.name)) continue;
    const yearPath = path.join(flowsSrcDir, yearEntry.name);

    const monthDirs = fs.readdirSync(yearPath, { withFileTypes: true });
    for (const monthEntry of monthDirs) {
      if (!monthEntry.isDirectory() || !/^\d{2}$/.test(monthEntry.name)) continue;
      const monthPath = path.join(yearPath, monthEntry.name);

      const dayItems = fs.readdirSync(monthPath, { withFileTypes: true });
      for (const dayItem of dayItems) {
        // Only process folder-based flows (DD/ directories with index.mdx)
        if (!dayItem.isDirectory()) continue;
        const rawName = dayItem.name;
        if (!/^\d{2}$/.test(rawName)) continue;

        const srcFlowDir = path.join(monthPath, rawName);
        const destFlowDir = path.join(flowsDestDir, yearEntry.name, monthEntry.name, rawName);

        console.log(`Processing Flow: ${yearEntry.name}/${monthEntry.name}/${rawName}`);
        markGeneratedDestination(destFlowDir);
        syncRecursive(srcFlowDir, destFlowDir);
      }
    }
  }
}

console.log('Copying assets...');
resetGeneratedAssetDirs();
processPosts();
processSeries();
processBooks();
processFlows();
pruneOrphanedOptimizerDirs(destDir);
pruneOrphanedOptimizerDirs(booksDestDir);
pruneOrphanedOptimizerDirs(flowsDestDir);
console.log('Assets copied successfully.');

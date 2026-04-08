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
const publicDir = path.join(process.cwd(), 'public');

function resetGeneratedAssetDirs() {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.rmSync(booksDestDir, { recursive: true, force: true });
  fs.rmSync(flowsDestDir, { recursive: true, force: true });
  fs.rmSync(path.join(publicDir, 'nextImageExportOptimizer'), { recursive: true, force: true });
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      // Copy all files except markdown source
      if (!entry.name.endsWith('.md') && !entry.name.endsWith('.mdx') && !entry.name.endsWith('.rst')) {
        let shouldCopy = true;
        if (fs.existsSync(destPath)) {
          const srcStat = fs.statSync(srcPath);
          const destStat = fs.statSync(destPath);
          if (srcStat.mtimeMs <= destStat.mtimeMs) {
            shouldCopy = false;
          }
        }

        if (shouldCopy) {
          fs.copyFileSync(srcPath, destPath);
          // console.log(`Copied: ${entry.name} -> ${destPath}`);
        }
      }
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

function copyReferencedAssets(sourceFile: string, rootDir: string, destPostDir: string) {
  const references = extractReferencedAssetPaths(sourceFile);

  references.forEach((reference) => {
    const absolutePath = path.resolve(path.dirname(sourceFile), reference);
    const relativeToRoot = path.relative(rootDir, absolutePath);

    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot) || !fs.existsSync(absolutePath)) {
      return;
    }

    const destPath = path.join(destPostDir, relativeToRoot);
    if (fs.statSync(absolutePath).isDirectory()) {
      copyRecursive(absolutePath, destPath);
      return;
    }

    if (!fs.existsSync(path.dirname(destPath))) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }
    fs.copyFileSync(absolutePath, destPath);
  });
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
        copyRecursive(srcPostDir, destPostDir);
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

          if (!fs.existsSync(destPostDir)) {
            fs.mkdirSync(destPostDir, { recursive: true });
          }

          copyReferencedAssets(sourceFile, seriesPath, destPostDir);

        } else if (item.isDirectory() && isPostFolder(path.join(seriesPath, item.name))) {
          // Folder-based post: copy only its own assets
          const targetSlug = getSlugFromFilename(item.name);
          const itemSrcPath = path.join(seriesPath, item.name);
          const destPostDir = path.join(destDir, targetSlug);

          console.log(`Processing Series Post Folder: ${item.name} -> ${targetSlug}`);

          // Copy everything from the post folder EXCEPT markdown files
          const subItems = fs.readdirSync(itemSrcPath, { withFileTypes: true });
          subItems.forEach(sub => {
            const srcPath = path.join(itemSrcPath, sub.name);
            const destPath = path.join(destPostDir, sub.name);

            if (sub.isDirectory()) {
              copyRecursive(srcPath, destPath);
            } else if (!sub.name.endsWith('.md') && !sub.name.endsWith('.mdx') && !sub.name.endsWith('.rst')) {
              if (!fs.existsSync(destPostDir)) {
                fs.mkdirSync(destPostDir, { recursive: true });
              }
              fs.copyFileSync(srcPath, destPath);
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
      copyRecursive(srcBookDir, destBookDir);
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
        copyRecursive(srcFlowDir, destFlowDir);
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
console.log('Assets copied successfully.');

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Usage: bun run scripts/import-book.ts <main-file-path>
// Example: bun run scripts/import-book.ts imports/books/agentic-design-patterns/chapters/Agentic\ Design\ Patterns.md

const args = process.argv.slice(2);
const mainFilePath = args[0];

if (!mainFilePath) {
  console.error('Usage: bun run scripts/import-book.ts <main-file-path>');
  process.exit(1);
}

const fullMainPath = path.isAbsolute(mainFilePath) ? mainFilePath : path.join(process.cwd(), mainFilePath);

if (!fs.existsSync(fullMainPath)) {
  console.error(`Error: Main file not found at ${fullMainPath}`);
  process.exit(1);
}

const sourceDir = path.dirname(fullMainPath);
// Parent of chapters/ is usually the book root
const bookRootDir = path.dirname(sourceDir); 
const bookSlug = path.basename(bookRootDir).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const contentDir = path.join(process.cwd(), 'content', 'books', bookSlug);

if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir, { recursive: true });
}

const mainContent = fs.readFileSync(fullMainPath, 'utf8');
const lines = mainContent.split('\n');

interface ChapterRef { title: string; id: string }
interface PartGroup { part: string; chapters: ChapterRef[] }
type TocItem = ChapterRef | PartGroup;

const toc: TocItem[] = [];
let currentPart: PartGroup | null = null;
const usedChapterIds = new Set<string>();

function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/(^-|-$)+/g, '');
}

function processChapter(title: string, rawPath: string): ChapterRef | null {
    // Decode URI component (e.g. %20 -> space)
    const cleanPath = decodeURIComponent(rawPath.replace(/^<|>$/g, ''));
    const fullSrcPath = path.resolve(sourceDir, cleanPath);
    const relativeToRoot = path.relative(bookRootDir, fullSrcPath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        console.warn(`Warning: Chapter path escapes book root, skipping: ${rawPath}`);
        return null;
    }
    
    if (!fs.existsSync(fullSrcPath)) {
        console.warn(`Warning: File not found: ${fullSrcPath}`);
        return null;
    }

    let id = slugify(path.basename(cleanPath).replace(/\.mdx?$/, ''));
    if (!id) {
        id = slugify(title);
    }
    if (!id) {
        console.warn(`Warning: Could not derive chapter id, skipping: ${rawPath}`);
        return null;
    }
    const baseId = id;
    let suffix = 2;
    while (usedChapterIds.has(id) || fs.existsSync(path.join(contentDir, `${id}.mdx`))) {
        id = `${baseId}-${suffix++}`;
    }
    usedChapterIds.add(id);
    const destPath = path.join(contentDir, `${id}.mdx`);

    const rawContent = fs.readFileSync(fullSrcPath, 'utf8');
    const { data, content: body } = matter(rawContent);

    let finalTitle = data.title;
    if (!finalTitle) {
        const h1Match = body.match(/^#\s+(.*)/m);
        if (h1Match) {
            finalTitle = h1Match[1].trim();
        }
    }
    if (!finalTitle) finalTitle = title;

    const chapterData = {
        ...data,
        title: finalTitle,
    };

    let fixedBody = body;
    
    // Normalize image paths to ./images/ regardless of source prefix (../images/, ./images/, images/)
    fixedBody = fixedBody.replace(/(?:\.\.\/|\.\/)?images\//g, './images/');

    fs.writeFileSync(destPath, matter.stringify(fixedBody, chapterData));
    return { title: chapterData.title, id };
}

for (const line of lines) {
    // Detect Parts (H2)
    const partMatch = line.match(/^##\s+(.*)/);
    if (partMatch) {
        currentPart = { part: partMatch[1].trim(), chapters: [] };
        toc.push(currentPart);
        continue;
    }

    // Detect Chapter links in list items
    // Matches: - [Title](Path) or 1. [Title](Path)
    const chapterMatch = line.match(/^[-*\d.]+\s+\[(.*?)\]\((.*)\)/);
    if (chapterMatch) {
        const title = chapterMatch[1];
        const rawPath = chapterMatch[2];
        const ch = processChapter(title, rawPath);
        
        if (ch) {
            if (currentPart) {
                currentPart.chapters.push(ch);
            } else {
                toc.push(ch);
            }
        }
    }
}

// Write index.mdx
// Use the H1 from the main file as title
const h1Match = mainContent.match(/^#\s+(.*)/);
const bookTitle = h1Match ? h1Match[1].trim() : bookSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const indexData = {
  title: bookTitle,
  date: new Date().toISOString().split('T')[0],
  excerpt: `Imported book: ${bookTitle}`,
  chapters: toc,
  draft: false,
};

// Also copy the main file content as the introduction/landing page content
const { content: introBody } = matter(mainContent);
let fixedIntroBody = introBody;
fixedIntroBody = fixedIntroBody.replace(/\.\.\/images\//g, './images/');

fs.writeFileSync(path.join(contentDir, 'index.mdx'), matter.stringify(fixedIntroBody, indexData));

// Copy images from bookRootDir/images to contentDir/images
const srcImages = path.join(bookRootDir, 'images');
const destImages = path.join(contentDir, 'images');
if (fs.existsSync(srcImages)) {
    if (!fs.existsSync(destImages)) fs.mkdirSync(destImages, { recursive: true });
    const copyDir = (src: string, dest: string) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const sPath = path.join(src, entry.name);
            const dPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
                copyDir(sPath, dPath);
            } else {
                fs.copyFileSync(sPath, dPath);
            }
        }
    };
    copyDir(srcImages, destImages);
}

console.log(`Successfully imported book to ${contentDir}`);

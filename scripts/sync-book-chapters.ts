import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Usage:
//   bun run sync-book                    # sync all books
//   bun run sync-book <book-slug>        # sync one book
//   bun run sync-book <book-slug> --update-titles  # also refresh titles from files

const args = process.argv.slice(2);
const targetSlug = args.find(a => !a.startsWith('--'));
const updateTitles = args.includes('--update-titles');

const booksDir = path.join(process.cwd(), 'content', 'books');

// ── Types ─────────────────────────────────────────────────────────────────

type ChapterRef = { title: string; id: string };
type PartGroup  = { part: string; chapters: ChapterRef[] };
type TocItem    = ChapterRef | PartGroup;

// ── Helpers ───────────────────────────────────────────────────────────────

function titleFromId(id: string): string {
  return id
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function readChapterTitle(bookDir: string, id: string): string {
  const candidates = [
    path.join(bookDir, `${id}.mdx`),
    path.join(bookDir, `${id}.md`),
    path.join(bookDir, id, 'index.mdx'),
    path.join(bookDir, id, 'index.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const { data } = matter(fs.readFileSync(p, 'utf8'));
      return (data.title as string | undefined) || titleFromId(id);
    }
  }
  return titleFromId(id);
}

function chapterExistsOnDisk(bookDir: string, id: string): boolean {
  return (
    fs.existsSync(path.join(bookDir, `${id}.mdx`)) ||
    fs.existsSync(path.join(bookDir, `${id}.md`)) ||
    fs.existsSync(path.join(bookDir, id, 'index.mdx')) ||
    fs.existsSync(path.join(bookDir, id, 'index.md'))
  );
}

/** Scan the book directory and return ids of all discovered chapters, sorted by name. */
function discoverIds(bookDir: string): string[] {
  const entries = fs.readdirSync(bookDir, { withFileTypes: true });
  const ids: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    // Skip the book index itself
    if (entry.name === 'index.mdx' || entry.name === 'index.md') continue;

    if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
      ids.push(entry.name.replace(/\.mdx?$/, ''));
    } else if (entry.isDirectory()) {
      // Only treat a folder as a chapter if it contains an index file
      const hasIndex =
        fs.existsSync(path.join(bookDir, entry.name, 'index.mdx')) ||
        fs.existsSync(path.join(bookDir, entry.name, 'index.md'));
      if (hasIndex) ids.push(entry.name);
    }
  }

  return ids;
}

/** Return a flat list of all ids mentioned in a toc. */
function flattenToc(toc: TocItem[]): string[] {
  const ids: string[] = [];
  for (const item of toc) {
    if ('part' in item) {
      for (const ch of item.chapters) ids.push(ch.id);
    } else {
      ids.push(item.id);
    }
  }
  return ids;
}

/**
 * Reconcile the existing toc against what is on disk:
 * - Remove entries for files that no longer exist.
 * - Optionally refresh titles from file frontmatter.
 * - Append newly discovered ids as flat entries at the end.
 */
function reconcile(
  toc: TocItem[],
  bookDir: string,
  discovered: Set<string>,
): { updated: TocItem[]; added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  const updated: TocItem[] = [];

  // Walk existing toc, prune missing entries
  for (const item of toc) {
    if ('part' in item) {
      const kept: ChapterRef[] = [];
      for (const ch of item.chapters) {
        if (discovered.has(ch.id)) {
          kept.push(
            updateTitles
              ? { ...ch, title: readChapterTitle(bookDir, ch.id) }
              : ch,
          );
        } else {
          removed.push(ch.id);
        }
      }
      if (kept.length > 0) updated.push({ part: item.part, chapters: kept });
    } else {
      if (discovered.has(item.id)) {
        updated.push(
          updateTitles
            ? { ...item, title: readChapterTitle(bookDir, item.id) }
            : item,
        );
      } else {
        removed.push(item.id);
      }
    }
  }

  // Append ids that are on disk but not yet in toc
  const existingIds = new Set(flattenToc(toc));
  const newIds = [...discovered].filter(id => !existingIds.has(id)).sort();
  for (const id of newIds) {
    updated.push({ title: readChapterTitle(bookDir, id), id });
    added.push(id);
  }

  return { updated, added, removed };
}

// ── Sync one book ─────────────────────────────────────────────────────────

function syncBook(bookSlug: string): void {
  const bookDir = path.join(booksDir, bookSlug);

  const indexMdx = path.join(bookDir, 'index.mdx');
  const indexMd  = path.join(bookDir, 'index.md');
  let indexPath  = '';
  if      (fs.existsSync(indexMdx)) indexPath = indexMdx;
  else if (fs.existsSync(indexMd))  indexPath = indexMd;
  else {
    console.error(`  ✗  ${bookSlug}: no index.mdx / index.md found`);
    return;
  }

  const raw = fs.readFileSync(indexPath, 'utf8');
  const { data, content } = matter(raw);

  const discovered  = new Set(discoverIds(bookDir));
  const existingToc = (data.chapters ?? []) as TocItem[];

  const { updated, added, removed } = reconcile(existingToc, bookDir, discovered);

  const changed = added.length > 0 || removed.length > 0 || updateTitles;
  if (!changed) {
    console.log(`  ✓  ${bookSlug}: up to date (${discovered.size} chapter${discovered.size === 1 ? '' : 's'})`);
    return;
  }

  data.chapters = updated;
  fs.writeFileSync(indexPath, matter.stringify(content, data));

  console.log(`  ✓  ${bookSlug}:`);
  if (added.length   > 0) console.log(`       + added:   ${added.join(', ')}`);
  if (removed.length > 0) console.log(`       - removed: ${removed.join(', ')}`);
  if (updateTitles)       console.log(`       ↺ titles refreshed from files`);
}

// ── Entry point ───────────────────────────────────────────────────────────

if (!fs.existsSync(booksDir)) {
  console.error('No content/books directory found.');
  process.exit(1);
}

console.log('Syncing book chapters…');

if (targetSlug) {
  const bookDir = path.join(booksDir, targetSlug);
  if (!fs.existsSync(bookDir)) {
    console.error(`Book "${targetSlug}" not found in ${booksDir}`);
    process.exit(1);
  }
  syncBook(targetSlug);
} else {
  const entries = fs.readdirSync(booksDir, { withFileTypes: true });
  const books   = entries.filter(e => e.isDirectory());
  if (books.length === 0) {
    console.log('No books found.');
  } else {
    for (const entry of books) syncBook(entry.name);
  }
}

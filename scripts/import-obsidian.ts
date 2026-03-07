import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Usage:
//   bun run import-obsidian                          # import all new files from imports/obsidian/
//   bun run import-obsidian --vault <path>           # use a custom vault/folder instead
//   bun run import-obsidian --dry-run                # preview without writing
//   bun run import-obsidian --all                    # re-import everything (ignore history)
//   bun run import-obsidian --append                 # append to existing flows instead of skipping
//   bun run import-obsidian --flows-only             # only process YYYY-MM-DD.md daily notes
//   bun run import-obsidian --notes-only             # only process regular notes
//   bun run import-obsidian <file>                   # process one specific file
//
// File routing (scans vault recursively):
//   YYYY-MM-DD.md  →  content/flows/YYYY/MM/DD.md   (matched anywhere in vault)
//   other .md      →  content/notes/[slug].md
//
// Inline Obsidian #tags are extracted from body content and moved to frontmatter.
// Import history is tracked in imports/obsidian/.imported (relative vault paths).

const DEFAULT_OBSIDIAN_DIR = path.join(process.cwd(), 'imports', 'obsidian');
const FLOWS_DIR = path.join(process.cwd(), 'content', 'flows');
const NOTES_DIR = path.join(process.cwd(), 'content', 'notes');

// ── Arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const vaultIdx   = args.indexOf('--vault');
const vaultArg   = vaultIdx > -1 ? args[vaultIdx + 1] : null;

const positional   = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--vault');
const explicitFile = positional[0] ?? null;
const dryRun       = args.includes('--dry-run');
const reimportAll  = args.includes('--all');
const appendMode   = args.includes('--append');
const flowsOnly    = args.includes('--flows-only');
const notesOnly    = args.includes('--notes-only');

const OBSIDIAN_DIR    = vaultArg ? path.resolve(vaultArg) : DEFAULT_OBSIDIAN_DIR;
const IMPORTED_RECORD = path.join(DEFAULT_OBSIDIAN_DIR, '.imported');

const DATE_FILE_RE = /^(\d{4})-(\d{2})-(\d{2})\.mdx?$/;

// ── Tag extraction ───────────────────────────────────────────────────────────

// Extracts Obsidian inline #tags from body, removes them, and returns both.
// Skips fenced code blocks to avoid matching #include, #define, etc.
function extractInlineTags(body: string): { body: string; tags: string[] } {
  const found = new Set<string>();

  // Split on fenced code blocks; only process non-code segments.
  const segments = body.split(/(```[\s\S]*?```|`[^`]+`)/g);

  const processed = segments.map((seg, i) => {
    // Odd indices are code spans/blocks — leave them untouched.
    if (i % 2 !== 0) return seg;

    // Match #tag at start of line or after whitespace.
    // Capture prefix (whitespace or empty) separately so we can preserve it.
    return seg.replace(
      /(^|\s)#([a-zA-Z\u4e00-\u9fff][a-zA-Z0-9\u4e00-\u9fff/_-]*)/gm,
      (_, prefix, tag) => {
        found.add(tag.replace(/\//g, '-').toLowerCase());
        return prefix; // keep the whitespace, drop the #tag
      },
    );
  });

  // Collapse runs of blank lines left after tag removal.
  const cleaned = processed.join('').replace(/\n{3,}/g, '\n\n').trim();
  return { body: cleaned, tags: [...found].sort() };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'untitled';
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function tagsLiteral(tags: string[]): string {
  return tags.length > 0 ? `[${tags.map(t => `"${t}"`).join(', ')}]` : '[]';
}

// Transforms Obsidian [[Target Title]] → [[target-title]] and
// [[Target Title|Label]] → [[target-title|Label]] using the same
// slugify logic applied to filenames, so wikilinks resolve correctly
// after import. Code spans/blocks are left untouched.
function transformWikilinks(body: string): string {
  const segments = body.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return segments.map((seg, i) => {
    if (i % 2 !== 0) return seg;
    return seg.replace(
      /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
      (_, target, label) => {
        const slug = slugify(target.trim());
        return label ? `[[${slug}|${label.trim()}]]` : `[[${slug}]]`;
      },
    );
  }).join('');
}

// ── Import tracking ──────────────────────────────────────────────────────────

// Keys are relative paths from OBSIDIAN_DIR root (e.g. "journals/2024-01-15.md")
// so files with the same name in different folders don't collide.
function relKey(filePath: string): string {
  return path.relative(OBSIDIAN_DIR, filePath);
}

function loadImported(): Set<string> {
  if (!fs.existsSync(IMPORTED_RECORD)) return new Set();
  return new Set(
    fs.readFileSync(IMPORTED_RECORD, 'utf8').split('\n').map(l => l.trim()).filter(Boolean),
  );
}

function markImported(filePath: string): void {
  if (!fs.existsSync(DEFAULT_OBSIDIAN_DIR)) fs.mkdirSync(DEFAULT_OBSIDIAN_DIR, { recursive: true });
  fs.appendFileSync(IMPORTED_RECORD, relKey(filePath) + '\n');
}

// ── Flow processor ───────────────────────────────────────────────────────────

function processFlow(filePath: string, filename: string): boolean {
  const match = filename.match(DATE_FILE_RE)!;
  const [, year, month, day] = match;
  const date = `${year}-${month}-${day}`;

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);

  const existingTags: string[] = Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [];
  const { body: taggedBody, tags: inlineTags } = extractInlineTags(parsed.content);
  const body = transformWikilinks(taggedBody);
  const tags = [...new Set([...existingTags.map(t => t.toLowerCase()), ...inlineTags])].sort();

  const outDir  = path.join(FLOWS_DIR, year, month);
  const outPath = path.join(outDir, `${day}.md`);
  const altPath = path.join(outDir, `${day}.mdx`);
  const existing = fs.existsSync(outPath) ? outPath : fs.existsSync(altPath) ? altPath : null;

  const flowContent = `---\ntags: ${tagsLiteral(tags)}\n---\n\n${body}\n`;

  if (dryRun) {
    console.log(`    [flow] ${date} → content/flows/${year}/${month}/${day}.md`);
    if (tags.length > 0) console.log(`           tags: ${tags.join(', ')}`);
    return true;
  }

  if (existing && !appendMode) {
    console.log(`    ⚠  ${date}: flow already exists — skipped (use --append to add)`);
    return false;
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (existing) {
    fs.appendFileSync(existing, `\n\n* * *\n\n${body}\n`);
    console.log(`    +  ${date}: appended → ${path.basename(existing)}`);
  } else {
    fs.writeFileSync(outPath, flowContent);
    console.log(`    ✓  ${date}: content/flows/${year}/${month}/${day}.md`);
  }

  return true;
}

// ── Note processor ───────────────────────────────────────────────────────────

function processNote(filePath: string, filename: string): boolean {
  const titleFromFile = path.basename(filename, path.extname(filename));
  const slug = slugify(titleFromFile);

  const outPath = path.join(NOTES_DIR, `${slug}.md`);
  const altPath = path.join(NOTES_DIR, `${slug}.mdx`);
  const existing = fs.existsSync(outPath) ? outPath : fs.existsSync(altPath) ? altPath : null;

  const raw    = fs.readFileSync(filePath, 'utf8');
  const stat   = fs.statSync(filePath);
  const parsed = matter(raw);

  const title   = (parsed.data.title as string | undefined) ?? titleFromFile;
  const date    = (parsed.data.date as string | undefined)
               ?? (parsed.data.created as string | undefined)
               ?? formatDate(stat.mtime);
  const existingTags: string[] = Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [];
  const aliases: string[]      = Array.isArray(parsed.data.aliases) ? parsed.data.aliases.map(String) : [];

  const { body: taggedBody, tags: inlineTags } = extractInlineTags(parsed.content);
  const body = transformWikilinks(taggedBody);
  const tags = [...new Set([...existingTags.map(t => t.toLowerCase()), ...inlineTags])].sort();

  const escapedTitle = title.replace(/"/g, '\\"');
  const noteContent = [
    '---',
    `title: "${escapedTitle}"`,
    `date: "${date}"`,
    `tags: ${tagsLiteral(tags)}`,
    `aliases: ${tagsLiteral(aliases)}`,
    '---',
    '',
    body,
    '',
  ].join('\n');

  if (dryRun) {
    console.log(`    [note] "${title}" → content/notes/${slug}.md`);
    if (tags.length > 0) console.log(`           tags: ${tags.join(', ')}`);
    return true;
  }

  if (existing) {
    console.log(`    ⚠  "${slug}": note already exists — skipped`);
    return false;
  }

  if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });
  fs.writeFileSync(outPath, noteContent);
  console.log(`    ✓  "${title}": content/notes/${slug}.md`);
  return true;
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

function processFile(filePath: string): boolean {
  const filename = path.basename(filePath);
  const isFlow = DATE_FILE_RE.test(filename);
  if (isFlow && notesOnly)  return false;
  if (!isFlow && flowsOnly) return false;
  return isFlow ? processFlow(filePath, filename) : processNote(filePath, filename);
}

// ── File discovery ───────────────────────────────────────────────────────────

// Recursively collect all .md/.mdx files, skipping hidden entries and .obsidian/.trash folders.
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.mdx?$/.test(name)) {
      results.push(full);
    }
  }
  return results;
}

function findPendingFiles(): string[] {
  if (!fs.existsSync(OBSIDIAN_DIR)) {
    console.error(`Directory not found: ${OBSIDIAN_DIR}`);
    if (!vaultArg) {
      console.error('Create it and place your Obsidian exports there:');
      console.error('  mkdir -p imports/obsidian');
      console.error('Or point directly at your vault: --vault /path/to/vault');
    }
    process.exit(1);
  }
  const imported = reimportAll ? new Set<string>() : loadImported();
  return collectFiles(OBSIDIAN_DIR).filter(f => !imported.has(relKey(f)));
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (explicitFile) {
  if (!fs.existsSync(explicitFile)) {
    console.error(`Error: "${explicitFile}" not found.`);
    process.exit(1);
  }
  console.log(`Processing: ${explicitFile}${dryRun ? ' (dry run)' : ''}`);
  processFile(explicitFile);
} else {
  const pending = findPendingFiles();

  if (pending.length === 0) {
    const hint = reimportAll ? '' : ' (run with --all to re-import everything)';
    console.log(`Nothing new to import in ${path.relative(process.cwd(), OBSIDIAN_DIR) || OBSIDIAN_DIR}${hint}.`);
    process.exit(0);
  }

  const modeLabel = dryRun ? ' (dry run)' : reimportAll ? ' (--all)' : '';
  console.log(`Found ${pending.length} file${pending.length === 1 ? '' : 's'} to import${modeLabel}:`);

  let flows = 0, notes = 0, skipped = 0;

  for (const filePath of pending) {
    console.log(`\n  ${relKey(filePath)}`);
    const ok = processFile(filePath);
    if (ok && !dryRun) {
      markImported(filePath);
      if (DATE_FILE_RE.test(path.basename(filePath))) flows++; else notes++;
    } else if (!ok) {
      skipped++;
    }
  }

  const parts: string[] = [];
  if (flows   > 0) parts.push(`${flows} flow${flows === 1 ? '' : 's'}`);
  if (notes   > 0) parts.push(`${notes} note${notes === 1 ? '' : 's'}`);
  if (skipped > 0) parts.push(`${skipped} skipped`);

  if (!dryRun) {
    console.log(`\nDone: ${parts.join(', ') || 'nothing imported'}.`);
    console.log(`Import history saved to ${path.relative(process.cwd(), IMPORTED_RECORD)}.`);
  } else {
    console.log(`\nDry run complete: ${parts.join(', ') || 'nothing to import'}.`);
  }
}

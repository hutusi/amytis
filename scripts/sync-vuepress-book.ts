import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { parse as acornParse } from 'acorn';
import type * as acorn from 'acorn';

// Usage:
//   bun run sync-vuepress-book --source <vuepress-docs-dir> --dest <amytis-book-dir>
//   bun run sync-vuepress-book <source> <dest>     (positional shorthand)
//
// Walks a VuePress project's `.vuepress/config.{js,mjs}`, extracts the sidebar
// literal via AST parsing, converts it to the nested {section, items} TOC
// format Amytis books support natively, copies the source markdown + asset
// tree into the destination, and rewrites the dest's index.mdx with the new
// TOC (preserving user-controlled frontmatter fields).
//
// Supports both VuePress 2 (`{ text, link }` / `{ text, children }`) and
// VuePress 1 (`{ title, path }` / `{ title, children }`, plus bare string
// child paths and `path + children` group-with-index pages) sidebar shapes.
//
// Re-runnable: any subsequent run mirrors the current state of the source.

// ─── CLI ─────────────────────────────────────────────────────────────────────

interface CliArgs {
  source: string;
  dest: string;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let source: string | undefined;
  let dest: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') { source = argv[++i]; continue; }
    if (a === '--dest') { dest = argv[++i]; continue; }
    if (a.startsWith('--source=')) { source = a.slice('--source='.length); continue; }
    if (a.startsWith('--dest=')) { dest = a.slice('--dest='.length); continue; }
    if (a === '--help' || a === '-h') {
      printUsageAndExit(0);
    }
    positional.push(a);
  }
  if (!source && positional[0]) source = positional[0];
  if (!dest && positional[1]) dest = positional[1];
  if (!source || !dest) printUsageAndExit(1);
  return {
    source: path.resolve(source!),
    dest: path.resolve(dest!),
  };
}

function printUsageAndExit(code: number): never {
  console.error(
    'Usage: bun run sync-vuepress-book --source <vuepress-docs-dir> --dest <amytis-book-dir>\n' +
    '\n' +
    'Examples:\n' +
    '  bun run sync-vuepress-book --source /path/to/dmla/docs --dest content/books/dmla\n' +
    '  bun run sync-vuepress-book /path/to/dmla/docs content/books/dmla'
  );
  process.exit(code);
}

// ─── VuePress sidebar extraction ─────────────────────────────────────────────

// JS/ESM only — acorn 8.x has no TypeScript support, so a `config.ts` is
// rejected with a helpful error rather than producing a parse failure deep
// in `extractSidebar`. Users with a `.ts` config can compile to `.js` and
// place the result next to the original, or rename to `.mjs`.
const CONFIG_CANDIDATES = ['config.mjs', 'config.js'];
const UNSUPPORTED_CONFIG_CANDIDATES = ['config.ts'];

function findVuepressConfig(sourceDir: string): string {
  const dir = path.join(sourceDir, '.vuepress');
  if (!fs.existsSync(dir)) {
    throw new Error(`[amytis] VuePress config dir not found at ${dir}. Expected the source to be a VuePress \`docs/\` folder.`);
  }
  for (const name of CONFIG_CANDIDATES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  for (const name of UNSUPPORTED_CONFIG_CANDIDATES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      throw new Error(
        `[amytis] Found ${name} at ${p}, but the importer parses configs with ` +
        `acorn (JS-only). Compile to JavaScript first (\`tsc\` or \`bun build --no-bundle\`) ` +
        `and place the result alongside the original, or rename to .mjs if it's pure ESM.`
      );
    }
  }
  throw new Error(`[amytis] No VuePress config found in ${dir} (looked for ${CONFIG_CANDIDATES.join(', ')}).`);
}

// JSON-like value reconstructed from the AST.
type SidebarItem =
  | { text?: string; link?: string; children?: SidebarItem[]; collapsible?: boolean; [k: string]: unknown }
  | string;

/**
 * Recursively converts a JS literal AST node into a plain JS value. Supports
 * string / numeric / boolean / null literals, arrays, and plain object
 * expressions with string-keyed string-or-shorthand properties. Throws on
 * anything else — better to fail loudly than to silently drop config fields.
 */
function literalNodeToValue(node: acorn.AnyNode): unknown {
  if (node.type === 'Literal') return (node as acorn.Literal).value;
  if (node.type === 'ArrayExpression') {
    return (node as acorn.ArrayExpression).elements.map(el => {
      if (el === null) return null;
      if (el.type === 'SpreadElement') {
        throw new Error('[amytis] Unsupported `...spread` in sidebar literal');
      }
      return literalNodeToValue(el);
    });
  }
  if (node.type === 'ObjectExpression') {
    const out: Record<string, unknown> = {};
    for (const prop of (node as acorn.ObjectExpression).properties) {
      if (prop.type !== 'Property') {
        throw new Error(`[amytis] Unsupported property type "${prop.type}" in sidebar literal`);
      }
      let key: string;
      if (prop.key.type === 'Identifier') {
        key = (prop.key as acorn.Identifier).name;
      } else if (prop.key.type === 'Literal' && typeof (prop.key as acorn.Literal).value === 'string') {
        key = (prop.key as acorn.Literal).value as string;
      } else {
        throw new Error(`[amytis] Unsupported key node "${prop.key.type}" in sidebar literal`);
      }
      out[key] = literalNodeToValue(prop.value);
    }
    return out;
  }
  if (node.type === 'TemplateLiteral') {
    const tpl = node as acorn.TemplateLiteral;
    if (tpl.expressions.length > 0) {
      throw new Error('[amytis] Template literals with `${...}` interpolation are not supported in sidebar values');
    }
    return tpl.quasis.map(q => q.value.cooked ?? '').join('');
  }
  if (node.type === 'UnaryExpression') {
    const un = node as acorn.UnaryExpression;
    if (un.operator === '-' || un.operator === '+' || un.operator === '!') {
      const inner = literalNodeToValue(un.argument);
      switch (un.operator) {
        case '-': return -(inner as number);
        case '+': return +(inner as number);
        case '!': return !inner;
      }
    }
  }
  throw new Error(`[amytis] Unsupported AST node "${node.type}" while reading sidebar literal`);
}

/**
 * Walks the parsed AST looking for the `sidebar:` property anywhere in the
 * file (it's typically inside a `dmlaTheme({...})` call argument in dmla; the
 * exact wrapper varies by theme so we don't rely on its name). Returns the
 * first array-valued match.
 */
function extractSidebarFromAst(ast: acorn.Program): SidebarItem[] {
  let found: acorn.AnyNode | undefined;
  const visit = (n: unknown) => {
    if (found || !n || typeof n !== 'object') return;
    const node = n as Record<string, unknown> & { type?: string };
    if (
      node.type === 'Property' &&
      ((node.key as { type?: string; name?: string; value?: string })?.name === 'sidebar' ||
        (node.key as { type?: string; name?: string; value?: string })?.value === 'sidebar') &&
      (node.value as { type?: string })?.type === 'ArrayExpression'
    ) {
      found = node.value as acorn.AnyNode;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range' || key === 'start' || key === 'end' || key === 'parent') continue;
      const v = node[key];
      if (Array.isArray(v)) {
        for (const item of v) visit(item);
      } else if (v && typeof v === 'object') {
        visit(v);
      }
    }
  };
  visit(ast);
  if (!found) {
    throw new Error('[amytis] Could not locate a `sidebar: [...]` property in the VuePress config');
  }
  return literalNodeToValue(found) as SidebarItem[];
}

function extractSidebar(configPath: string): SidebarItem[] {
  const source = fs.readFileSync(configPath, 'utf8');
  // sourceType: module since VuePress configs use ESM `import`.
  const ast = acornParse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowReturnOutsideFunction: false,
    locations: false,
  });
  return extractSidebarFromAst(ast as acorn.Program);
}

// ─── Sidebar → Amytis TOC ────────────────────────────────────────────────────

type ChapterRef = { title: string; id: string };
type Section = { section: string; collapsible?: boolean; items: Array<Section | ChapterRef> };
type TocItem = Section | ChapterRef;

function normalizeLink(link: string): string {
  // VuePress sidebar links may use any of: leading slash, no slash, trailing
  // slash (folder-index style like `/guide/`), or an explicit `.md`/`.mdx`
  // suffix. The canonical Amytis chapter id has none of those — trailing
  // slashes are stripped and `resolveSourceFile` finds the `<id>/README.md`
  // companion via its candidate list.
  let s: string;
  try {
    s = decodeURIComponent(link.trim());
  } catch {
    s = link.trim();
  }
  if (s.startsWith('/')) s = s.slice(1);
  if (s.endsWith('/')) s = s.replace(/\/+$/, '');
  if (s.endsWith('.md')) s = s.slice(0, -3);
  if (s.endsWith('.mdx')) s = s.slice(0, -4);
  return s;
}

// Sidebar leaves whose normalized id matches one of these (case-insensitive)
// are dropped from the generated TOC. They're VuePress / GitBook conventions
// for a hand-written table-of-contents page that duplicates what Amytis's
// book landing page already renders. `SUMMARY` covers GitBook-style
// `SUMMARY.md` entries common in VP1 imports.
const SKIPPED_LEAF_IDS = new Set(['contents', 'summary']);

function isSkippedMetaLeaf(id: string): boolean {
  const tail = id.split('/').pop() ?? id;
  return SKIPPED_LEAF_IDS.has(tail.toLowerCase());
}

interface ConvertWarnings {
  emptySections: string[];           // sections with no items
  unsupported: string[];             // strings or other forms we skip
  skippedMetaLeaves: string[];       // leaves dropped because their id is a known meta-nav slug
}

/**
 * Common shape for both VP1 and VP2 sidebar entries. Produced by
 * `normalizeRawEntry` so the downstream walker only deals with one schema.
 */
interface NormalizedEntry {
  title?: string;          // missing for bare-string entries
  path?: string;           // normalized via normalizeLink()
  children?: SidebarItem[];
  collapsible?: boolean;
}

/**
 * Collapses a VuePress 1.x or 2.x sidebar entry into the common
 * `NormalizedEntry` shape, returning `null` for anything we can't recognize.
 *
 * - VP2 leaf:     `{ text, link }`               → `{ title, path }`
 * - VP2 section:  `{ text, children, collapsible? }`
 * - VP1 leaf:     `{ title, path }`              (no children)
 * - VP1 section:  `{ title, children, collapsable? }`
 * - VP1 indexed:  `{ title, path, children }`    (README promoted later)
 * - Bare string:  `'/foo/bar'`                   → `{ path }` (title resolved
 *                                                    from the source file)
 */
function normalizeRawEntry(raw: SidebarItem): NormalizedEntry | null {
  if (typeof raw === 'string') {
    return { path: raw };
  }
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const title = typeof item.text === 'string'
    ? item.text
    : typeof item.title === 'string'
      ? item.title
      : undefined;
  const path = typeof item.link === 'string'
    ? item.link
    : typeof item.path === 'string'
      ? item.path
      : undefined;
  const children = Array.isArray(item.children) ? (item.children as SidebarItem[]) : undefined;

  // VP2 uses `collapsible` (boolean); VP1 uses `collapsable` (boolean meaning
  // "user may collapse"). Both map to the same Amytis hint.
  let collapsible: boolean | undefined;
  if (typeof item.collapsible === 'boolean') collapsible = item.collapsible;
  else if (typeof item.collapsable === 'boolean') collapsible = item.collapsable;

  // Must carry at least a title, a path, or children — otherwise there's
  // nothing to convert. (Bare strings are already handled above.)
  if (!title && !path && !children) return null;

  return { title, path, children, collapsible };
}

/**
 * Reads a chapter title from a source markdown file. Tries frontmatter
 * `title` first, then the first H1 in the body, then falls back to a
 * titleized slug. Used when the sidebar entry was a bare string (VP1 style)
 * or when we're promoting a section's README as a chapter.
 *
 * Returns `null` if the file can't be read — caller decides the fallback.
 */
function readTitleFromSource(absPath: string | null): string | null {
  if (!absPath || !fs.existsSync(absPath)) return null;
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = matter(raw);
    const fmTitle = (parsed.data as { title?: unknown }).title;
    if (typeof fmTitle === 'string' && fmTitle.trim()) return fmTitle.trim();
    const h1 = parsed.content.match(/^\s*#\s+(.+?)\s*$/m);
    if (h1) return h1[1].trim();
  } catch {
    return null;
  }
  return null;
}

function titleizeSlug(id: string): string {
  const tail = id.split('/').pop() ?? id;
  return tail
    .split(/[-_]/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ') || id;
}

function resolveTitle(
  norm: NormalizedEntry,
  id: string | null,
  sourceDir: string,
): string {
  if (norm.title) return norm.title;
  if (id) {
    const src = resolveSourceFile(sourceDir, id);
    const fromFile = readTitleFromSource(src);
    if (fromFile) return fromFile;
    return titleizeSlug(id);
  }
  return '(untitled)';
}

function convertSidebar(
  sidebar: SidebarItem[],
  sourceDir: string,
  warnings: ConvertWarnings,
): TocItem[] {
  const result: TocItem[] = [];
  for (const raw of sidebar) {
    const norm = normalizeRawEntry(raw);
    if (!norm) {
      warnings.unsupported.push(typeof raw === 'string' ? raw : JSON.stringify(raw));
      continue;
    }

    const hasChildren = !!norm.children && norm.children.length > 0;
    const hasPath = typeof norm.path === 'string';
    const pathId = hasPath ? normalizeLink(norm.path!) : null;

    if (hasChildren) {
      const items: Array<Section | ChapterRef> = [];
      // VP1 sections often carry both a `path` (the section's README index
      // page) and `children` (sub-chapters). Promote the README as the first
      // chapter so its content stays reachable from the sidebar — matches
      // VuePress UX where clicking the section title navigates to its README.
      //
      // Skip `norm.title` for the promoted chapter — it belongs to the
      // section header. Read the chapter's own title from the README's
      // frontmatter / H1 instead so the sidebar doesn't show the section
      // name twice (once as the section, once as its first child).
      if (pathId) {
        if (isSkippedMetaLeaf(pathId)) {
          warnings.skippedMetaLeaves.push(`${norm.title ?? pathId} (${pathId})`);
        } else {
          items.push({
            title: resolveTitle({ ...norm, title: undefined }, pathId, sourceDir),
            id: pathId,
          });
        }
      }
      items.push(...convertSidebar(norm.children!, sourceDir, warnings));

      const sectionTitle = norm.title ?? '(untitled)';
      const section: Section = { section: sectionTitle, items };
      if (typeof norm.collapsible === 'boolean') section.collapsible = norm.collapsible;
      if (items.length === 0) warnings.emptySections.push(sectionTitle);
      result.push(section);
      continue;
    }

    if (hasPath && pathId) {
      if (isSkippedMetaLeaf(pathId)) {
        warnings.skippedMetaLeaves.push(`${norm.title ?? pathId} (${pathId})`);
        continue;
      }
      result.push({
        title: resolveTitle(norm, pathId, sourceDir),
        id: pathId,
      });
      continue;
    }

    // {title, no path, no children} — a section header that's a placeholder.
    const placeholderTitle = norm.title ?? '(untitled)';
    warnings.emptySections.push(placeholderTitle);
    result.push({ section: placeholderTitle, items: [] });
  }
  return result;
}

// ─── Leaf validation ─────────────────────────────────────────────────────────

function collectChapterIds(toc: TocItem[], out: ChapterRef[] = []): ChapterRef[] {
  for (const item of toc) {
    if ('section' in item) collectChapterIds(item.items, out);
    else out.push(item);
  }
  return out;
}

function resolveSourceFile(sourceDir: string, chapterId: string): string | null {
  // VuePress folder-index conventions: `/guide/` resolves to `guide/README.md`
  // or `guide/index.md` inside the docs tree. Earlier candidates win.
  const candidates = chapterId === ''
    ? ['README.md', 'README.mdx', 'index.md', 'index.mdx']
    : [
        `${chapterId}.md`,
        `${chapterId}.mdx`,
        `${chapterId}/README.md`,
        `${chapterId}/README.mdx`,
        `${chapterId}/index.md`,
        `${chapterId}/index.mdx`,
      ];
  for (const rel of candidates) {
    const p = path.join(sourceDir, rel);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ─── Rsync ───────────────────────────────────────────────────────────────────

const COPY_SKIP = new Set(['.vuepress', 'node_modules', '.git', '.DS_Store']);

/**
 * Files in the dest that are NOT in the source must NOT be pruned by the
 * mirror: index.mdx is generated by writeIndexMdx (its frontmatter is the
 * sync output), and dotfiles are by convention out-of-band overlay state
 * (`.gitkeep`, OS metadata, editor scratch files) that the importer never
 * created and shouldn't touch.
 */
function isDestManagedByImporter(relPath: string): boolean {
  if (relPath === 'index.mdx') return false;
  if (relPath.split(path.sep).some(part => part.startsWith('.'))) return false;
  return true;
}

/**
 * Mirror the source tree into the dest: copy every non-excluded file from
 * source, then prune any importer-managed file under dest that doesn't
 * exist in source. The "mirror" semantics matter on re-runs after an
 * upstream rename or deletion — without the prune, stale content lingers
 * in the dest and stays reachable.
 */
function syncTree(srcDir: string, destDir: string): { files: number; assets: number } {
  let files = 0;
  let assets = 0;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const sourceRelPaths = new Set<string>();

  const walkSource = (src: string, dest: string, relBase: string) => {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (COPY_SKIP.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;
      const sPath = path.join(src, entry.name);
      const dPath = path.join(dest, entry.name);
      const relPath = relBase ? path.join(relBase, entry.name) : entry.name;
      sourceRelPaths.add(relPath);
      if (entry.isDirectory()) {
        if (!fs.existsSync(dPath)) fs.mkdirSync(dPath, { recursive: true });
        walkSource(sPath, dPath, relPath);
      } else if (entry.isFile()) {
        fs.copyFileSync(sPath, dPath);
        if (/\.mdx?$/i.test(entry.name)) files += 1;
        else assets += 1;
      }
    }
  };
  walkSource(srcDir, destDir, '');

  // Prune importer-managed dest paths not present in the source set.
  // Depth-first so empty directories left after pruning their contents get
  // removed in the same pass.
  const prune = (dir: string, relBase: string): boolean => {
    let stillHasContent = false;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const dPath = path.join(dir, entry.name);
      const relPath = relBase ? path.join(relBase, entry.name) : entry.name;
      if (!isDestManagedByImporter(relPath)) {
        stillHasContent = true;
        continue;
      }
      if (entry.isDirectory()) {
        const childKept = prune(dPath, relPath);
        if (!sourceRelPaths.has(relPath) && !childKept) {
          fs.rmdirSync(dPath);
        } else {
          stillHasContent = stillHasContent || childKept || sourceRelPaths.has(relPath);
        }
      } else {
        if (sourceRelPaths.has(relPath)) {
          stillHasContent = true;
        } else {
          fs.unlinkSync(dPath);
        }
      }
    }
    return stillHasContent;
  };
  prune(destDir, '');

  return { files, assets };
}

// ─── index.mdx writing ───────────────────────────────────────────────────────

interface BookFrontmatter {
  title?: string;
  excerpt?: string;
  date?: string;
  coverImage?: string;
  featured?: boolean;
  draft?: boolean;
  authors?: string[];
  latex?: boolean;
  chapters?: unknown;
  [k: string]: unknown;
}

function loadVuepressTitle(configPath: string): string | undefined {
  const source = fs.readFileSync(configPath, 'utf8');
  // Cheap scan — the title is a top-level string property. AST round-trip is
  // overkill here.
  const m = source.match(/\btitle\s*:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : undefined;
}

function writeIndexMdx(destDir: string, configPath: string, toc: TocItem[]): void {
  const indexPath = path.join(destDir, 'index.mdx');
  let existing: { data: BookFrontmatter; content: string } = { data: {}, content: '' };
  if (fs.existsSync(indexPath)) {
    const raw = fs.readFileSync(indexPath, 'utf8');
    const parsed = matter(raw);
    existing = { data: parsed.data as BookFrontmatter, content: parsed.content };
  }

  const data: BookFrontmatter = { ...existing.data };
  if (!data.title) data.title = loadVuepressTitle(configPath) ?? path.basename(destDir);
  if (!data.date) data.date = new Date().toISOString().split('T')[0];
  if (data.draft === undefined) data.draft = false;
  if (data.featured === undefined) data.featured = false;
  data.chapters = toc;

  const body = existing.content.trim().length > 0
    ? existing.content
    : `\nImported from VuePress source at ${path.relative(process.cwd(), path.dirname(path.dirname(configPath)))}.\n`;

  fs.writeFileSync(indexPath, matter.stringify(body, data));
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const { source, dest } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(source)) {
    throw new Error(`[amytis] Source directory does not exist: ${source}`);
  }

  const configPath = findVuepressConfig(source);
  console.log(`[sync-vuepress-book] Reading sidebar from ${path.relative(process.cwd(), configPath)}`);

  const sidebar = extractSidebar(configPath);
  const warnings: ConvertWarnings = { emptySections: [], unsupported: [], skippedMetaLeaves: [] };
  const toc = convertSidebar(sidebar, source, warnings);

  const chapters = collectChapterIds(toc);
  const missing: string[] = [];
  for (const ch of chapters) {
    if (!resolveSourceFile(source, ch.id)) missing.push(ch.id);
  }
  if (missing.length > 0) {
    throw new Error(
      `[amytis] ${missing.length} sidebar leaf chapter${missing.length === 1 ? '' : 's'} ` +
      `point to source files that do not exist:\n  ${missing.map(m => `${m}.md`).join('\n  ')}\n` +
      `Fix the sidebar in ${path.relative(process.cwd(), configPath)} or write the missing files before syncing.`
    );
  }

  console.log(`[sync-vuepress-book] Copying ${path.relative(process.cwd(), source)} → ${path.relative(process.cwd(), dest)}`);
  const { files, assets } = syncTree(source, dest);

  writeIndexMdx(dest, configPath, toc);

  console.log(`[sync-vuepress-book] Done. ${files} markdown files, ${assets} asset files copied, ${chapters.length} chapters mapped.`);
  if (warnings.emptySections.length > 0) {
    console.warn(`[sync-vuepress-book] Empty sections (no items): ${warnings.emptySections.join(', ')}`);
  }
  if (warnings.unsupported.length > 0) {
    console.warn(`[sync-vuepress-book] Skipped unsupported sidebar entries: ${warnings.unsupported.join(', ')}`);
  }
  if (warnings.skippedMetaLeaves.length > 0) {
    console.log(`[sync-vuepress-book] Dropped meta-nav leaves from TOC (Amytis already renders one): ${warnings.skippedMetaLeaves.join(', ')}`);
  }
}

main();

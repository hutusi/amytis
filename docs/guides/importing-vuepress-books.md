# Importing a VuePress book

Amytis can host a VuePress book natively. `bun run sync-vuepress-book`
copies the upstream `docs/` tree into a slug under `content/books/`, derives
Amytis's nested-section book TOC from the VuePress sidebar config, and
preserves any user-controlled fields you've added to the book's `index.mdx`.

Both VuePress 2 and VuePress 1 sidebars are supported — the importer
auto-detects the shape per entry, so a single config can mix `{ text, link }`
(VP2) and `{ title, path }` (VP1) without configuration.

The importer is idempotent — re-running mirrors the current state of the
source (including upstream deletions). You should *not* edit chapter
markdown files in the dest: they get overwritten on every sync. Customize
the book's metadata in `index.mdx` (preserved) or extend the source repo.

---

## Prerequisites

- The source must be a VuePress project (1.x or 2.x) where the docs root
  contains a `.vuepress/` directory with a `config.js` or `config.mjs`.
- `config.ts` is **not supported** — acorn (used to AST-extract the sidebar)
  parses JS only. Compile to JS first (`tsc`, `bun build --no-bundle`, …) or
  rename to `.mjs` if the config is pure ESM.
- The destination directory under `content/books/<slug>/` may already exist
  with a partial `index.mdx`; user-controlled frontmatter is preserved.

## Quick start

```bash
bun run sync-vuepress-book \
  --source /path/to/your-book/docs \
  --dest   content/books/your-book

# Positional shorthand:
bun run sync-vuepress-book /path/to/your-book/docs content/books/your-book

# Then rebuild + preview locally:
bun run build:dev
bun dev
```

The script prints a one-line summary on completion:

```
[sync-vuepress-book] Done. 74 markdown files, 104 asset files copied, 61 chapters mapped.
```

It will also warn about anomalies it noticed in the sidebar — empty section
placeholders, sections with their own page-link header, dropped meta-nav
leaves (see [Conventions](#conventions) below), etc.

## What the script does

1. Locates `.vuepress/config.{js,mjs}` under `<source>`.
2. AST-parses the file with acorn, walks the tree for the `sidebar:` array
   wherever it lives (theme wrapper, plain export, etc.), and converts its
   literals to a plain JS structure. Unsupported AST shapes throw — silent
   drops would produce a half-correct TOC.
3. Maps every VuePress sidebar item to one of:
   - `{ title, id }` for a leaf. Accepted shapes:
     - VP2: `{ text, link }`
     - VP1: `{ title, path }` (no `children`)
     - VP1: a bare string path (e.g. `'/intro/about-me'`) — the title is
       read from the source file's frontmatter `title`, falling back to the
       first H1, then a slug-derived fallback.
   - `{ section, items, collapsible? }` for a group. Accepted shapes:
     - VP2: `{ text, children, collapsible? }`
     - VP1: `{ title, children, collapsable? }` (VP1's `collapsable` is
       aliased to `collapsible`)
   - A group entry that carries **both** `path` (VP1) or `link` (VP2) AND
     `children` (a "section + index page" — common in VP1 books where
     `/foo/` is the section's README) has its index page **promoted as the
     first chapter** of the section. The promoted chapter's title is read
     from the README's frontmatter or first H1, not from the section title,
     so the sidebar doesn't show the section name twice.
   - Mixed/unknown shapes are warned and skipped.
4. Validates that every leaf's resolved chapter id has a real source file at
   one of `<id>.md`, `<id>.mdx`, `<id>/README.md(x)`, or `<id>/index.md(x)`.
   Throws and lists the missing files if any.
5. **Mirrors** the source tree into `<dest>` (`fs.copyFileSync`):
   - Copies every file except `.vuepress/`, `node_modules`, `.git`, and
     dotfiles.
   - Prunes any importer-managed dest file/dir whose path is no longer in
     the source — re-running after an upstream rename or deletion is clean.
   - Preserves `index.mdx` (regenerated separately, not mirrored) and any
     dest dotfiles you added (`.gitkeep`, etc.).
6. Rewrites `<dest>/index.mdx` with the new `chapters:` TOC, merging into
   any existing frontmatter rather than replacing it. See
   [User-controlled fields](#user-controlled-fields-in-indexmdx) below.

## Conventions

- Sidebar leaves whose id (case-insensitive, basename only) matches
  `contents` or `SUMMARY` are dropped from the generated TOC. They're
  VuePress/GitBook conventions for a hand-written table-of-contents page,
  and Amytis's book landing page already renders one. The source files are
  still copied so the dest layout matches upstream; they just aren't
  reachable from the TOC.
- Sections with `collapsible: false` (or VP1's `collapsable: false`) on the
  VuePress side keep that hint — the Amytis sidebar honors it (forces the
  section open).
- A group whose VuePress entry has both `link`/`path` and `children` has
  the index page promoted as the section's first chapter (see "Maps every
  VuePress sidebar item …" above). Earlier versions dropped the link with
  a warning; the current behavior is strictly more useful and matches the
  upstream VuePress click-the-section-title UX.
- Path normalization is identical for VP1 and VP2: leading `/` stripped,
  trailing `/` stripped (so `/guide/` resolves to id `guide` and the file
  is found via the `guide/README.md` or `guide/index.md` candidate), and
  any `.md`/`.mdx` suffix stripped. Both build-time validation and the
  runtime chapter resolver accept `<id>.md`, `<id>.mdx`, `<id>/index.md`,
  `<id>/index.mdx`, `<id>/README.md`, `<id>/README.mdx`.

## User-controlled fields in `index.mdx`

The script forces `chapters:` to whatever the current sidebar produces, but
leaves the rest of the frontmatter alone if it's already populated:

| Field        | Behavior |
| --- | --- |
| `title`      | Preserved if set; else derived from the VuePress config's `title` |
| `excerpt`    | Preserved |
| `date`       | Preserved if set; else today |
| `coverImage` | Preserved |
| `featured`   | Preserved (defaults to `false` on first sync) |
| `draft`      | Preserved (defaults to `false` on first sync) |
| `authors`    | Preserved |
| `latex`      | Preserved — set to `true` for math-heavy books to enable KaTeX globally for the book |
| `showChapterExcerpt` | Preserved (defaults to `false`). Set to `true` if you want the chapter's `excerpt` rendered as a subtitle under the chapter title. The default suppresses it because most chapters open with their own lede paragraph that duplicates the excerpt. |
| `chapters`   | **Always rewritten** from the sidebar |

The prose body below the frontmatter is also preserved, so you can write a
custom landing-page introduction and re-running the script won't blow it
away.

## What about VuePress-specific content?

`MarkdownRenderer` quietly handles the syntax shapes the VuePress ecosystem
uses, so you don't have to rewrite chapters by hand:

- **`:::note` / `:::tip` / `:::warning` / `:::danger` / `:::info`** —
  rewritten to Amytis's existing `<GithubAlert>` component. Custom titles
  (e.g. `:::tip 智慧的疆界`) are preserved via `data-alert-title`.
- **Mermaid fences** — `` ```mermaid `` blocks render via the existing
  `<Mermaid>` client component. The `compact` modifier dmla uses is harmless
  (it lives in fence meta, not the language tag).
- **Inline `$$ ... $$` block math** — VuePress allows
  `$$ \mathbf{A} = \begin{bmatrix}` openers and `\end{bmatrix} $$` closers
  on the same line as the math body; `remark-math` requires `$$` to be on
  its own line. A pre-processor (`normalizeVuepressBlockMath`) splits them
  before parsing, preserving any list-item indent.
- **Inter-chapter `[X](other.md)` links** — `remark-book-chapter-links`
  rewrites these to canonical `/books/<slug>/<chapter-id>` URLs. Targets
  outside the book throw; targets not in the TOC (work-in-progress chapters
  the author commented out of the sidebar) warn and pass through unrewritten.
- **CJK in math** — KaTeX's `unicodeTextInMathMode` warning is silenced via
  `strict: 'ignore'`. Chinese-language math like `$输入$` or `$h_{隐藏状态}$`
  renders without flooding the dev console.
- **Custom Vue components** — `<Swiper>` / `<Slide>` / `<ClientOnly>` /
  `<GlobalTOC>` / `<HomeHero>` / `<ChatDemo>` get passive overrides so
  React doesn't warn about unknown HTML tags. Children pass through where
  reasonable (slides stack vertically); UI-component nulls render nothing.
- **Inline-styled `<img>` tags** — author-supplied `style` attributes
  (typical for small social-media icons in author bios) are respected and
  the image isn't pushed through `next/image` optimization.

## Re-running

Running the sync again against the same source/dest is the common case:

```bash
bun run sync-vuepress-book --source ... --dest ...
```

It is **safe** and **idempotent** so long as you haven't hand-edited the
synced chapter `.md` files. The script:

- Overwrites every chapter file from source.
- Prunes importer-managed dest files whose path is not in the current source.
- Re-derives `chapters:` from the current sidebar.
- Preserves user-controlled `index.mdx` fields + body.

After re-running, run `bun run build:dev` to regenerate the image-optimization
output under `public/books/<slug>/` and the Pagefind search index.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `[amytis] No VuePress config found …` | Source isn't a VuePress 2 docs root | Pass the parent of `.vuepress/`, e.g. `<repo>/docs`, not the repo root. |
| `[amytis] Found config.ts …` error | TS config not supported | Compile to JS first, or rename to `.mjs` if pure ESM. |
| `[amytis] N sidebar leaf chapters point to source files that do not exist` | Sidebar entry has no matching `.md` | Fix the sidebar in the VuePress config or write the missing file. |
| `Could not locate a sidebar: [...] property` | Sidebar uses an unsupported shape | The walker only handles plain literal arrays/objects; a sidebar built by a function call won't work. Extract to a literal array. |
| Chapter page 404s after sync | Chapter file moved/renamed upstream, but the dest dir still has the old file | This shouldn't happen now (mirror prunes deletions); if it does, rerun the sync and clear `.next` / `public/books/<slug>`. |
| Stale image after upstream rename | Pagefind / Next image cache | `bun run clean && bun run build:dev`. |

## Related

- `scripts/sync-vuepress-book.ts` — the implementation.
- `docs/ARCHITECTURE.md` — book schema, route map, and the markdown
  pipeline plugins listed above.
- `tests/integration/sync-vuepress-book.test.ts` — covers AST extraction,
  mirror semantics, folder-index links, TS-config rejection, dotfile
  preservation, the `contents` skip, and the VP1 sidebar shape (bare-string
  children, `title`/`collapsable`, README promotion, `SUMMARY` drop).

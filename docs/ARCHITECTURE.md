# Architecture Overview

Amytis is a static-export-first Next.js 16 App Router project for Markdown/MDX publishing across posts, series, books, flows, and notes, with optional series-scoped rST support for legacy content.

## Core Stack

- Framework: Next.js 16.2.1 + React 19
- Runtime/tooling: Bun
- Styling: Tailwind CSS v4 + CSS variables + `next-themes`
- Content parsing: `gray-matter` + Zod validation in `src/lib/markdown.ts`
- rST rendering: Python `docutils` bridge in `scripts/render-rst.py` plus normalization in `src/lib/rst-renderer.ts`
- Search: Pagefind (`/pagefind/pagefind.js` loaded at runtime)
- Tests: Bun test suites in `src/` and `tests/`

## Content Model

- `content/posts/`: standalone posts (`.md/.mdx`) and folder posts (`index.mdx`)
- `content/series/<slug>/`: series metadata (`index.mdx` / `index.md` / `README.mdx` / `README.md` / `index.rst` / `README.rst`) + series posts in the same format
- `content/books/<slug>/`: book metadata + chapter files
- `content/flows/YYYY/MM/DD.(md|mdx)`: daily flow entries
- `content/notes/`: evergreen notes
- `content/*.mdx`: static pages (about, links, subscribe, privacy, etc.)

## Runtime Data Flow

1. Source files are read from disk by `src/lib/markdown.ts`.
2. Frontmatter is parsed and validated (invalid frontmatter throws at build time).
3. Draft/future filtering and sorting are applied (based on `site.config.ts`).
4. Route files consume typed helpers (`getAllPosts`, `getBookData`, `getAllFlows`, `getAllNotes`, etc.).
5. `generateStaticParams()` precomputes dynamic routes for static export.
6. Series content format is inferred from the series index file; ambiguous or mixed-format series fail fast during content loading.
7. When `docutils` is available, rST files are rendered to HTML through the Python bridge; if the Python runtime is unavailable, Amytis falls back to the lightweight built-in rST compatibility path.

## Route Map (App Router)

```text
src/app/
  page.tsx                          # Homepage
  page/[page]/page.tsx              # Homepage pagination
  layout.tsx                        # Root layout/providers
  posts/page.tsx                    # Posts index
  posts/page/[page]/page.tsx        # Posts pagination
  posts/[slug]/page.tsx             # Canonical post route
  series/page.tsx                   # Series index
  series/[slug]/page.tsx            # Series detail
  series/[slug]/page/[page]/page.tsx
  books/page.tsx                    # Books index
  books/[slug]/page.tsx             # Book landing
  books/[slug]/[chapter]/page.tsx   # Book chapter
  flows/page.tsx                    # Flow index
  flows/page/[page]/page.tsx        # Flow pagination
  flows/[year]/page.tsx
  flows/[year]/[month]/page.tsx
  flows/[year]/[month]/[day]/page.tsx
  notes/page.tsx                    # Notes index
  notes/page/[page]/page.tsx
  notes/[slug]/page.tsx
  tags/page.tsx
  tags/[tag]/page.tsx
  authors/[author]/page.tsx
  archive/page.tsx
  graph/page.tsx
  feed.xml/route.ts                 # Main curated RSS feed
  feed.atom/route.ts                # Main curated Atom feed
  all.xml/route.ts                  # Firehose RSS feed
  all.atom/route.ts                 # Firehose Atom feed
  posts/feed.xml/route.ts           # Posts-only RSS feed
  posts/feed.atom/route.ts          # Posts-only Atom feed
  flows/feed.xml/route.ts           # Flows-only RSS feed
  flows/feed.atom/route.ts          # Flows-only Atom feed
  search.json/route.ts
  sitemap.ts
  [slug]/page.tsx                   # Static pages + custom series listing path
  [slug]/page/[page]/page.tsx       # Custom series listing pagination
  [slug]/[postSlug]/page.tsx        # Custom post basePath/series post path
```

## URL Routing Rules

- `next.config.ts` sets `output: "export"` and `trailingSlash: true`.
- Series format is inferred from the index file:
  - Markdown series: `index.md`, `index.mdx`, `README.md`, or `README.mdx`
  - rST series: `index.rst` or `README.rst`
- A series may not mix Markdown and rST content files; ambiguous or mixed layouts are treated as build errors.
- Post URLs use `getPostUrl()` in `src/lib/urls.ts`:
  - Default: `/<posts.basePath>/<post.slug>` (basePath defaults to `posts`)
  - Series auto path: `/<series.slug>/<post.slug>` when `series.autoPaths` is enabled
  - Series override: `/<series.customPaths[seriesSlug]>/<post.slug>`
- Legacy aliases declared in frontmatter `redirectFrom` are emitted as static redirect pages, so old URLs can continue resolving after a rename or path migration.
- Dynamic route handlers validate whether a request is canonical or legacy, then either render the content or return `RedirectPage`.
- Dynamic route params should return raw segment values from `generateStaticParams()` (do not pre-encode values).
- Links should always target concrete paths, not route placeholders such as `/posts/[slug]`.
- When moving series posts off the default posts path, `scripts/add-series-redirects.ts` updates frontmatter `redirectFrom` entries so static redirect pages can be generated.

## Key Components

Layout & navigation:

- `Navbar`, `Footer`, `Hero` (configurable homepage hero with collapsible intro)
- `LanguageSwitch` (i18n language selector), `ThemeToggle` (light/dark mode)
- `FlowHubTabs`

Content renderers:

- `MarkdownRenderer` — MDX with GFM, KaTeX math, build-time syntax highlighting via Shiki, Mermaid
- `CodeBlock` (async server component, calls Shiki) and `CodeBlockToolbar` (client: copy + word-wrap toggle), `Mermaid`
- `CoverImage` — optimized image component with WebP support

Post & series surfaces:

- `PostLayout` / `SimpleLayout` — post page layouts with TOC, series sidebar, external links, comments
- `PostList` — card-based post listing with thumbnails, metadata, excerpts, tags
- `PostCard`, `PostSidebar`, `RelatedPosts`, `ShareBar`
- `SeriesCatalog` — timeline-style listing with numbered entries and progress indicator
- `SeriesSidebar` — series navigation sidebar with progress bar and color-coded states
- `SeriesList` — mobile-optimized series navigation matching sidebar design
- `TableOfContents` — sticky TOC with scroll tracking, reading progress, back-to-top
- `HorizontalScroll` — scrollable container with navigation arrows for featured content

Notes & flows:

- `NoteSidebar`, `TagContentTabs`
- `FlowContent` — client wrapper for flow pages with tag filtering state
- `FlowCalendarSidebar` — calendar sidebar with date navigation, browse panel, clickable tag filters
- `FlowTimelineEntry` — individual flow entry in timeline list

Search & discovery:

- `Search` — full-text search (Cmd/Ctrl+K) powered by Pagefind; type filter tabs (All/Post/Flow/Book), recent searches, keyboard navigation, debounced input, focus trap, ARIA, search syntax (`"phrase"`, `-exclude`)
- `Pagination`, `KnowledgeGraph`

Integrations:

- `Comments` — Giscus or Disqus (theme-aware)
- `Analytics` — Umami, Plausible, or Google Analytics

## Data Layer Highlights (`src/lib/markdown.ts`)

- Posts/series: `getAllPosts`, `getListingPosts`, `getPostBySlug`, `getSeriesPosts`, `getSeriesData`
- Books: `getAllBooks`, `getBookData`, `getBookChapter`
- Flows: `getAllFlows`, `getFlowBySlug`, `getFlowsByYear`, `getFlowsByMonth`
- Notes: `getAllNotes`, `getNoteBySlug`, `getNotesByTag`
- Discovery: `buildSlugRegistry`, `getBacklinks`, `getAllTags`, `getAllAuthors`

## Code Block Highlighting

- Highlighter: **Shiki** (build-time, dual `github-light` / `github-dark` theme via CSS variables). See `docs/CODE-BLOCKS.md` for author-facing fence/directive metadata.
- Singleton lives at `src/lib/shiki.ts` (`getHighlighter()`, cached on `globalThis` for HMR). It exposes `highlightToHast(code, language, opts)` and `parseFenceMeta(meta)`.
- Transformers: `transformerMetaHighlight` from `@shikijs/transformers` plus three custom transformers in `src/lib/shiki.ts` for the line-numbers data attribute, the title data attribute, and raw-`diff` line backgrounds.
- MDX/Markdown path: `MarkdownRenderer.tsx` → `rehype-fence-meta` (copies `node.data.meta` to a real `data-meta` HTML attribute so it survives `react-markdown`'s prop filtering and the `rehypeRaw` round-trip) → `CodeBlock` (async server component) → Shiki → inline HTML. Mermaid blocks are short-circuited before `CodeBlock` is reached.
- rST path: `scripts/render-rst.py` rewrites every `literal_block` into a `<pre data-amytis-code …>` marker carrying option attributes (`data-language`, `data-line-numbers`, `data-highlight-lines`, `data-title`); `src/lib/shiki-rst.ts` walks the rendered HTML inside `RstRenderer` (async server component) and replaces each marker with Shiki output. The fallback rST parser routes through `rstToMarkdown` and lands in the MDX path — single highlighter, single source of truth.
- Cache: `RST_RENDERER_DISK_CACHE_VERSION` in `src/lib/rst-renderer.ts` must be bumped whenever the docutils output shape or Shiki theme changes, otherwise stale cached entries in `.cache/rst-renderer/` keep rendering with the old markup.

## rST Notes

- Full-fidelity rST rendering depends on a Python environment with `docutils` (and ideally `pygments`) available.
- `src/lib/rst-renderer.ts` uses `AMYTIS_RST_PYTHON` when set; otherwise it falls back to `python3`.
- Top-of-document docinfo is parsed into Amytis metadata, but it is stripped from rendered article HTML so blog-style posts do not show duplicate author/version blocks above the content.
- Supported legacy roles are normalized or degraded intentionally:
  - `:doc:` resolves to local site URLs when the target exists in the imported content tree
  - `:ref:` / `:numref:` prefer local anchors
  - unresolved legacy roles degrade to readable inline HTML instead of docutils system-message blocks

## Build Pipeline

1. `bun scripts/copy-assets.ts`: copy co-located media into `public/`
2. `bun run build:graph`: generate graph data
3. `next build`: static export to `out/`
4. Production only (`bun run build`): `next-image-export-optimizer`
5. Pagefind indexing:
   - Production: `pagefind --site out` (writes to `out/pagefind`)
   - Dev build: `pagefind --site out --output-path public/pagefind`

## Content Frontmatter

Validated by Zod in `src/lib/markdown.ts` — invalid frontmatter throws at build time.

### Posts

```yaml
---
title: "Post Title"
subtitle: "Optional subtitle line"  # Rendered below the title in italic
date: "2026-01-01"
excerpt: "Optional summary (auto-generated if omitted)"
category: "Category Name"
tags: ["tag1", "tag2"]
authors: ["Author Name"]
series: "series-slug"             # Link to a series
draft: true                       # Hidden in production
featured: true                    # Show in featured section
pinned: true                      # Always shown in featured section; hero = most recent pinned
coverImage: "./images/cover.jpg"  # Local path, external URL, or text placeholder
latex: true                       # Enable KaTeX math
toc: false                        # Hide table of contents
layout: "simple"                  # Use simple layout (default: "post")
externalLinks:                    # Links to external discussions
  - name: "Hacker News"
    url: "https://news.ycombinator.com/item?id=12345"
  - name: "V2EX"
    url: "https://v2ex.com/t/123456"
redirectFrom:                     # Old URLs to redirect to this post (prefix changes only)
  - /posts/my-old-slug
  - /old-series/my-old-slug
---
```

### Series (`content/series/[slug]/index.mdx`)

```yaml
---
title: "Series Title"
excerpt: "Series description"
date: "2026-01-01"
coverImage: "./images/cover.jpg"
featured: true               # Show in featured series
draft: true                  # Hidden in production (default: false)
sort: "date-asc"             # 'date-asc' | 'date-desc' | 'manual'
posts: ["post-1", "post-2"]  # Manual post ordering (optional)
---
```

### Books (`content/books/[slug]/index.mdx`)

A book's `chapters:` array accepts three item shapes (mix freely):

```yaml
---
title: "Book Title"
excerpt: "Book description"
date: "2026-01-01"
coverImage: "text:DG"             # Image path or text placeholder
featured: true
draft: false
authors: ["Author Name"]
chapters:
  # 1. Bare chapter ref — top-level chapter with no grouping
  - title: "Standalone Chapter"
    id: "standalone"

  # 2. Legacy "part" — single-level grouping
  - part: "Part I: Getting Started"
    chapters:
      - title: "Chapter Title"
        id: "chapter-file"        # Maps to chapter-file.mdx or chapter-file/index.mdx

  # 3. "section" — recursive grouping with arbitrary nesting depth (≥ 2 layers)
  - section: "机器学习数学基础"
    collapsible: true             # Optional UI hint for the sidebar
    items:
      - section: "线性代数"
        items:
          - title: "引言：机器学习的语言"
            id: "maths/linear/introduction"   # Slash-separated id → nested folder on disk
          - title: "向量基础"
            id: "maths/linear/vectors"
      - section: "微积分"
        items:
          - title: "引言：变化与累积"
            id: "maths/calculus/introduction"
---
```

Chapter `id` values may contain `/` to map to nested folders. For id `maths/linear/introduction`,
the loader resolves to the first existing file under `<bookDir>/maths/linear/introduction.{md,mdx}`
or `<bookDir>/maths/linear/introduction/index.{md,mdx}`. Path traversal (`..`) is rejected.

Per the strict-build invariant, `getBookData` throws if any chapter id in the TOC has no
matching file on disk — silent skips are not allowed.

#### Book-level `latex: true`

Book frontmatter accepts an optional `latex: true` flag that enables KaTeX rendering for
every chapter in the book without having to annotate each chapter file. Chapter-level
`latex: true` still works and takes precedence. Math-heavy books (e.g. ML textbooks) should
set the book-level flag rather than copy it onto every chapter.

#### Book-level `showChapterExcerpt`

Book frontmatter accepts an optional `showChapterExcerpt` flag (default `false`)
controlling whether the chapter-page header renders the chapter's `excerpt` underneath
the title. The default suppresses it because the common case is a chapter that opens
with its own lede paragraph, and an excerpt line above it just duplicates that text.
Set it to `true` on books where the excerpt is a distinct subtitle the author actually
wants the reader to see. The excerpt is still used in metadata (OpenGraph, JSON-LD,
search) regardless of this flag.

#### Book-specific markdown extensions

When `MarkdownRenderer` renders a book chapter (i.e. `bookContext` prop is set, which
happens automatically inside `BookLayout`), two extra plugins fire:

- **`remark-vuepress-containers`** — converts VuePress fenced containers
  (`:::note`, `:::tip`, `:::important`, `:::warning`, `:::danger`, `:::info`) into the
  same `<github-alert>` hast element that `remark-github-alerts` produces. Custom titles
  (`:::tip 智慧的疆界`) are preserved via `data-alert-title`. A small string-level
  preprocessor (`normalizeVuepressContainerSyntax`) normalizes `::: name [label]` →
  `:::name[label]` so `remark-directive` (which only parses the space-less form) sees the
  containers.
- **`remark-book-chapter-links`** — rewrites relative `.md` / `.mdx` links to other
  chapters into canonical `/books/<slug>/<chapter-id>[#fragment]` URLs. Resolution uses
  the chapter's `sourcePath` (exposed by `getBookChapter`). Broken links (target chapter
  id not in the TOC, or target outside the book directory) throw at build time.

Mermaid diagrams in book chapters already work via the existing `Mermaid` component (any
\`\`\`mermaid fenced block, with or without a `compact` modifier after the language tag).

#### Immersive reading mode

Chapter pages support an "immersive reading" mode: a fullscreen book-reader
overlay with a top bar, the existing `BookSidebar` on the left, and the chapter
article in a centred scrollable column. It's entered two ways — the toggle
button in the chapter header, or the secondary "Immersive reading" CTA on the
book index page (`/books/<slug>`), which links to the first chapter with
`?immersive=1` appended.

**Layout boundary.** `src/layouts/BookLayout.tsx` stays a server component for
data resolution and delegates to `src/components/BookReadingShell.tsx`. The
shell branches on `enabled` from context: when on, it renders the fullscreen
overlay (`ImmersiveBookReader`) with the chapter article as `children`; when
off, it renders the pre-immersive page layout unchanged.

**State + persistence.** `src/components/ImmersiveReadingProvider.tsx` is the
context. Mounted in `src/app/books/[slug]/layout.tsx` so it survives
chapter-to-chapter navigation within a book. The reader's preferences
(`fontSize`, `readingTheme`, `columnWidth`, `sidebarOpen`) persist to
`localStorage` under the key `amytis-reader-prefs` via the helpers in
`src/lib/immersive-reading-prefs.ts`; the read path is per-key defensive so
schema drift or hand-edited values fall back to their default without
discarding the whole blob. `enabled` and `prefsPanelOpen` are deliberately
**not** persisted — entering the reader is a per-visit intent, not a
preference.

**`?immersive=1` URL flag.** `src/components/ImmersiveReadingFlagHandler.tsx`
sits as a sibling of `{children}` inside the layout (wrapped in its own
`<Suspense>`), reads the query param via `useSearchParams`, calls
`provider.enter()`, then strips the flag via `router.replace`. The Suspense
boundary is load-bearing — `useSearchParams` triggers a static-export bailout,
so wrapping the provider instead would drag the chapter page out of static
prerender.

**Overlay anatomy** (`src/components/ImmersiveBookReader.tsx`,
`position: fixed inset-0 z-40`):

- `ImmersiveReaderTopBar` — sidebar toggle, `book / chapter` breadcrumb, `Aa`
  button, exit (✕). The header is `relative z-30` so its `backdrop-blur-md`
  stacking context paints above article-area code blocks.
- `ImmersiveReadingPrefsPopover` — anchored under the `Aa` button. Four control
  groups with visual previews: font size (4 sizes, `A` letters rendered at the
  actual size), reading theme (Auto / Light / Sepia / Dark colour swatches —
  Auto reads as a split light/dark gradient), column width (Narrow / Medium /
  Wide / Full as stacked line-icons), and a "Reset to defaults" link at the
  bottom (one-click, no confirmation). Dismisses on outside `pointerdown` or
  ESC; ESC with the popover closed exits the reader.
- `BookSidebar` in `mode="fill"` — the existing TOC sidebar without its
  page-mode `sticky top-20`/`hidden lg:block` classes, so it fills the parent
  flex column and scrolls inside its own overflow container. Auto-collapsed
  below `lg` (one-directional: never auto-opens on resize to wide so the user's
  manual close sticks).
- Main scroll area — article centred at the column width the user picked
  (`max-w-2xl` to `max-w-none`).

**CSS scoping.** `html[data-immersive]` hides site chrome via the three stable
hooks `data-site-nav` / `data-site-footer` / `data-reading-progress` —
defense-in-depth (the fixed overlay covers them anyway). Reading-theme
overrides are scoped to `[data-reader-overlay]` so they don't leak outside the
reader; when `readingTheme === 'dark'` the overlay also gets Tailwind's `.dark`
class so `dark:prose-invert` fires regardless of the underlying site theme.
Shiki code blocks deliberately keep their normal theme.

## Configuration Reference (`site.config.ts`)

| Field | Notes |
| --- | --- |
| `nav` | Navigation links with weights |
| `social` | GitHub, Twitter, email links for the footer |
| `series.navbar` | Series slugs to show in the navbar dropdown |
| `series.customPaths` | Per-series URL prefix, e.g. `{ 'weeklies': 'weeklies' }` → `/weeklies/[slug]` |
| `pagination.posts`, `pagination.series` | Items per page |
| `themeColor` | `'default' \| 'blue' \| 'rose' \| 'amber'` |
| `hero` | Homepage hero title and subtitle |
| `i18n` | Default locale and supported locales |
| `featured.series` | Scrollable series: `scrollThreshold` (default 2), `maxItems` (default 6) |
| `featured.stories` | Scrollable stories: `scrollThreshold` (default 1), `maxItems` (default 5) |
| `analytics.providers` | Enabled providers, e.g. `['umami', 'google']`; `[]` disables |
| `comments.provider` | `'giscus' \| 'disqus' \| null` |
| `feed.format` | `'rss' \| 'atom' \| 'both'` |
| `feed.content` | `'full' \| 'excerpt'` |
| `feed.maxItems` | Max feed items (`0` = unlimited) |
| `footer.bottomLinks` | Custom footer links (ICP, cookie policy); `text` accepts plain string or `{ en, zh }` |
| `posts.basePath` | URL prefix for all posts (default `'posts'`) |
| `posts.authors.default` | Fallback authors when a post has none in frontmatter |
| `posts.authors.showInHeader` | Show author byline below post title (default `true`) |
| `posts.authors.showAuthorCard` | Show author card at end of post (default `true`) |
| `posts.excludeFromListing` | Series slugs whose posts are hidden from `/posts` listings |
| `authors` | Per-author profiles: `bio`, `avatar`, `social[]` |

### Config sync

`site.config.ts` (this repo, i18n object form) and `site.config.example.ts`
(shipped via `create-amytis`, plain strings, single-locale, optional features
default disabled) must stay in sync. Any schema change to one must be mirrored
in the other. Locale-aware fields use `{ en, zh }` in `site.config.ts` and
plain strings in the example.

# Architecture Overview

Amytis is a static-export-first Next.js 16 App Router project for Markdown/MDX publishing across posts, series, books, flows, and notes.

## Core Stack

- Framework: Next.js 16.2.1 + React 19
- Runtime/tooling: Bun
- Styling: Tailwind CSS v4 + CSS variables + `next-themes`
- Content parsing: `gray-matter` + Zod validation in `src/lib/markdown.ts`
- Search: Pagefind (`/pagefind/pagefind.js` loaded at runtime)
- Tests: Bun test suites in `src/` and `tests/`

## Content Model

- `content/posts/`: standalone posts (`.md/.mdx`) and folder posts (`index.mdx`)
- `content/series/<slug>/`: series metadata (`index.mdx`) + series posts
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

- Layout/navigation: `Navbar`, `Footer`, `Hero`, `FlowHubTabs`
- Content renderers: `MarkdownRenderer`, `CodeBlock`, `Mermaid`
- Post surfaces: `PostLayout`, `PostSidebar`, `PostCard`, `RelatedPosts`, `ShareBar`
- Notes/flows discovery: `NoteSidebar`, `FlowContent`, `FlowCalendarSidebar`, `TagContentTabs`
- Search/discovery: `Search`, `Pagination`, `KnowledgeGraph`

## Data Layer Highlights (`src/lib/markdown.ts`)

- Posts/series: `getAllPosts`, `getListingPosts`, `getPostBySlug`, `getSeriesPosts`, `getSeriesData`
- Books: `getAllBooks`, `getBookData`, `getBookChapter`
- Flows: `getAllFlows`, `getFlowBySlug`, `getFlowsByYear`, `getFlowsByMonth`
- Notes: `getAllNotes`, `getNoteBySlug`, `getNotesByTag`
- Discovery: `buildSlugRegistry`, `getBacklinks`, `getAllTags`, `getAllAuthors`

## Build Pipeline

1. `bun scripts/copy-assets.ts`: copy co-located media into `public/`
2. `bun run build:graph`: generate graph data
3. `next build`: static export to `out/`
4. Production only (`bun run build`): `next-image-export-optimizer`
5. Pagefind indexing:
   - Production: `pagefind --site out` (writes to `out/pagefind`)
   - Dev build: `pagefind --site out --output-path public/pagefind`

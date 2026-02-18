# Architecture Overview

Amytis is a static site generator built with **Next.js 16 (App Router)**, designed to render a "digital garden" of Markdown/MDX content.

## Core Stack

- **Framework:** Next.js 16.1.1 (App Router) with React 19
- **Runtime:** Bun
- **Styling:** Tailwind CSS v4 with CSS variables for theming
- **Content:** Local `.md`/`.mdx` files parsed at build time
- **Validation:** Zod for frontmatter schema validation
- **Testing:** Bun Test

## Data Flow

1. **Source:** Content lives in `content/posts/` (posts) and `content/series/` (series metadata).
2. **Parsing:** `src/lib/markdown.ts` reads the file system using Node.js `fs`. It uses `gray-matter` to parse frontmatter, `zod` to validate the schema, and `image-size` to extract image dimensions.
3. **Filtering:** Draft content (`draft: true`) is excluded in production for both posts and series. Future-dated posts are hidden unless `showFuturePosts` is enabled.
4. **Rendering:**
   - **Lists:** `getAllPosts()` returns sorted post metadata for listing pages.
   - **Single Post:** `getPostBySlug(slug)` reads a specific file with full content.
   - **Series:** `getSeriesPosts(slug)` fetches posts for a series (supports manual ordering or automatic collection). `getAllSeries()` returns all series with their posts.
   - **Authors:** `getPostsByAuthor(author)` fetches posts for a specific author. Metadata inheritance allows posts to inherit authors from series if omitted.
   - **Relationships:** `getRelatedPosts()` finds related content by tag/category matching.
   - **Static Generation:** `generateStaticParams` is implemented in dynamic routes (`[slug]`, `[page]`, `[tag]`, `[author]`) to pre-render all pages at build time.

## Route Structure

```
src/app/
  page.tsx                          # Homepage (hero, featured, latest)
  layout.tsx                        # Root layout (providers, navbar, footer)
  globals.css                       # Theme variables, palettes, utilities
  posts/
    [slug]/page.tsx                 # Individual post
    page.tsx                        # Posts listing (page 1)
    page/[page]/page.tsx            # Paginated posts
  series/
    page.tsx                        # All series overview
    [slug]/page.tsx                 # Single series
    [slug]/page/[page]/page.tsx     # Series pagination
  tags/
    page.tsx                        # Tag cloud
    [tag]/page.tsx                  # Posts by tag
  authors/
    [author]/page.tsx               # Posts by author (supports slug-based routes)
  archive/
    page.tsx                        # Chronological archive
  [slug]/page.tsx                   # Static pages (about, etc.)
```

## Component Architecture

### Layout Components
- **`Navbar`** - Config-driven navigation with series dropdown, search trigger, theme toggle, and language switch.
- **`Footer`** - Social links, copyright, site metadata, and language switch.
- **`Hero`** - Homepage hero with collapsible intro (persisted via localStorage).

### Content Display
- **`PostList`** - Card-based post listing with thumbnails, metadata, excerpts, and tags. Used on homepage and post listing pages.
- **`SeriesCatalog`** - Timeline-style post listing for series pages with numbered entries, progress indicator, and card design.
- **`SeriesSidebar`** - Desktop sidebar for navigating series posts with progress bar and color-coded states (current/past/future).
- **`SeriesList`** - Mobile-optimized series navigation matching sidebar design.
- **`PostCard`** - Individual post preview card.
- **`HorizontalScroll`** - Reusable scrollable container with navigation arrows for featured content sections.

### Content Rendering
- **`MarkdownRenderer`** - Core rendering component using `react-markdown` with plugins:
  - `remark-gfm` - GitHub Flavored Markdown
  - `remark-math` + `rehype-katex` - LaTeX math
  - `rehype-raw` - Raw HTML support
  - `rehype-slug` - Heading IDs for TOC
  - Custom image metadata injection for optimization
- **`CodeBlock`** - Syntax-highlighted code blocks via `react-syntax-highlighter` with copy button support.
- **`Mermaid`** - Client-side Mermaid diagram rendering.
- **`CoverImage`** - Optimized image component using `next-image-export-optimizer` with dynamic desaturated gradients.

### Navigation & Discovery
- **`TableOfContents`** - Sticky TOC with scroll-based active heading tracking, reading progress percentage/bar, and back-to-top button.
- **`Search`** - Client-side fuzzy search modal (Cmd/Ctrl+K) using Fuse.js. Loads a pre-built `/search.json` index.
- **`Pagination`** - Previous/Next page navigation with numeric page links and ellipses support.
- **`RelatedPosts`** - Tag/category-based related content suggestions.

### Integrations
- **`Comments`** - Giscus (GitHub Discussions) or Disqus integration with automatic theme synchronization.
- **`Analytics`** - Umami, Plausible, or Google Analytics via Next.js Script component.
- **`LanguageProvider` / `LanguageSwitch`** - i18n context and UI toggle for language switching.
- **`ThemeProvider` / `ThemeToggle`** - Light/dark mode via `next-themes`.

## Data Access Layer (`src/lib/markdown.ts`)

Key functions:

| Function | Returns | Purpose |
|----------|---------|---------|
| `getAllPosts()` | `PostData[]` | All posts, filtered (drafts, future dates), sorted by date |
| `getPostBySlug(slug)` | `PostData \| null` | Single post with full content |
| `getSeriesPosts(slug)` | `PostData[]` | Posts in a series (manual or automatic ordering) |
| `getAllSeries()` | `Record<string, PostData[]>` | All series with their posts (draft series filtered) |
| `getSeriesData(slug)` | `PostData \| null` | Series metadata from index file |
| `getFeaturedPosts()` | `PostData[]` | Posts with `featured: true` |
| `getFeaturedSeries()` | `Record<string, PostData[]>` | Series with `featured: true` |
| `getRelatedPosts(slug)` | `PostData[]` | Related posts by tag/category |
| `getAllTags()` | `string[]` | All unique tags |
| `getAllAuthors()` | `string[]` | All unique authors |
| `calculateReadingTime(content)` | `string` | Estimated reading time, handling mixed Latin and CJK text |

## Theming

Theming is handled by `next-themes` and Tailwind CSS v4:

- `src/app/globals.css` defines CSS variables (e.g., `--background`, `--foreground`, `--accent`) under `:root` (light) and `.dark` (dark).
- Four color palettes are defined via `[data-palette]` selectors: `default` (emerald), `blue`, `rose`, `amber`.
- `ThemeProvider` manages the `.dark` class on `<html>`.
- The active palette is set via `data-palette` attribute on `<body>`, driven by `siteConfig.themeColor`.

## Build Pipeline

1. **`scripts/copy-assets.ts`** - Copies images from `content/` to `public/posts/` for static hosting. Handles both post and series assets, distinguishing post folders from asset folders to avoid duplication.
2. **`next build`** - Next.js static export to `out/`.
3. **`next-image-export-optimizer`** - Generates optimized WebP variants (production only; skipped in `build:dev`).

In development mode, images are served unoptimized to avoid requiring pre-built WebP files.

## Content Structure

```
content/
  posts/
    my-post.mdx                    # Flat file post
    my-post/
      index.mdx                    # Nested folder post
      images/
        cover.jpg                  # Co-located images
    2026-01-01-dated-post.mdx      # Date-prefixed (date auto-extracted)
  series/
    my-series/
      index.mdx                    # Series metadata (title, excerpt, sort, draft)
      images/
        cover.jpg                  # Series cover image
  about.mdx                        # Static page
```

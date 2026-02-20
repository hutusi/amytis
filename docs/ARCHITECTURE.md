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

1. **Source:** Content lives in `content/posts/`, `content/series/`, `content/books/`, and `content/flows/`.
2. **Parsing:** `src/lib/markdown.ts` reads the file system using Node.js `fs`. It uses `gray-matter` to parse frontmatter, `zod` to validate the schema, and `image-size` to extract image dimensions.
3. **Filtering:** Draft content (`draft: true`) is excluded in production. Future-dated posts are hidden unless `showFuturePosts` is enabled.
4. **Rendering:**
   - **Lists:** `getAllPosts()` / `getAllBooks()` / `getAllFlows()` returns sorted metadata for listing pages.
   - **Single Post/Book:** `getPostBySlug(slug)` / `getBookData(slug)` reads a specific file with full content.
   - **Series:** `getSeriesPosts(slug)` fetches posts for a series.
   - **Book Chapters:** `getBookChapter(bookSlug, chapterSlug)` fetches individual chapter content.
   - **Flows:** `getFlowBySlug(slug)` fetches individual flow entries.
   - **Static Generation:** `generateStaticParams` is implemented in dynamic routes (`[slug]`, `[page]`, `[tag]`, `[author]`, `[year]`) to pre-render all pages at build time.

## Route Structure

```
src/app/
  page.tsx                          # Homepage (hero, featured, latest)
  layout.tsx                        # Root layout (providers, navbar, footer)
  posts/
    [slug]/page.tsx                 # Individual post
    page.tsx                        # Posts listing
  series/
    page.tsx                        # All series overview
    [slug]/page.tsx                 # Single series
  books/
    page.tsx                        # All books overview
    [slug]/page.tsx                 # Book landing page
    [slug]/[chapter]/page.tsx       # Individual book chapter
  flows/
    page.tsx                        # Flows stream/listing
    [year]/[month]/[day]/page.tsx   # Individual flow entry (optional if modal/stream used)
  tags/
    page.tsx                        # Tag cloud
    [tag]/page.tsx                  # Posts by tag
  authors/
    [author]/page.tsx               # Posts by author
  archive/
    page.tsx                        # Chronological archive
  [slug]/page.tsx                   # Static pages (about, etc.)
```

## Component Architecture

### Layout Components
- **`Navbar`** - Config-driven navigation with series dropdown, search trigger, theme toggle, and language switch.
- **`Footer`** - Social links, copyright, site metadata, and language switch.
- **`Hero`** - Homepage hero with collapsible intro.
- **`BookLayout`** - Dedicated layout for book chapters with sidebar navigation.

### Content Display
- **`PostList`** - Card-based post listing.
- **`FlowContent`** - Stream-based display for daily notes with timeline grouping.
- **`SeriesCatalog`** - Timeline-style post listing for series.
- **`PostCard`** - Individual post preview card.
- **`CoverImage`** - Optimized image component using `next-image-export-optimizer` with dynamic desaturated gradients.

### Content Rendering
- **`MarkdownRenderer`** - Core rendering component using `react-markdown` with plugins (GFM, Math, Raw HTML).
- **`CodeBlock`** - Syntax-highlighted code blocks with copy button.
- **`Mermaid`** - Client-side Mermaid diagram rendering.

### Navigation & Discovery
- **`TableOfContents`** - Sticky TOC with scroll-based tracking.
- **`Search`** - Full-text search modal (Cmd/Ctrl+K) powered by Pagefind. Supports type filter tabs (All/Post/Flow/Book), recent searches, keyboard navigation, debounced input, focus trap, and ARIA accessibility. Search syntax: `"exact phrase"`, `word1 word2` (AND), `-exclude`.
- **`Pagination`** - Previous/Next page navigation.
- **`ReadingProgressBar`** - Top-of-page progress bar for book chapters.

## Data Access Layer (`src/lib/markdown.ts`)

| Function | Returns | Purpose |
|----------|---------|---------|
| `getAllPosts()` | `PostData[]` | All posts, filtered and sorted |
| `getAllFlows()` | `FlowData[]` | All daily notes, sorted by date |
| `getAllBooks()` | `BookData[]` | All books metadata |
| `getBookData(slug)` | `BookData \| null` | Single book metadata & TOC |
| `getBookChapter(...)` | `BookChapterData` | Single chapter content |
| `getFlowBySlug(slug)` | `FlowData \| null` | Single flow entry |
| `getSeriesPosts(slug)` | `PostData[]` | Posts in a series |
| `calculateReadingTime(content)` | `string` | Estimated reading time (multilingual) |

## Theming

Theming is handled by `next-themes` and Tailwind CSS v4. `src/app/globals.css` defines CSS variables for palettes (`default`, `blue`, `rose`, `amber`).

## Build Pipeline

1. **`scripts/copy-assets.ts`** - Copies images from content directories (`posts/`, `series/`, `books/`, `flows/`) to `public/posts/` for static hosting.
2. **`next build`** - Next.js static export to `out/`.
3. **`next-image-export-optimizer`** - Generates optimized WebP variants (production build only).
4. **`pagefind --site out`** - Crawls the exported HTML and builds a full-text search index in `out/pagefind/`. The index is loaded at runtime by `src/components/Search.tsx` via a dynamic import. Pure utility functions used by the search component and the search index route live in `src/lib/search-utils.ts`.

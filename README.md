# Amytis

**Amytis** is a minimalist, elegant digital garden built with Next.js 16, React 19, and Tailwind CSS v4. It is designed for cultivating thoughts, sharing knowledge, and growing ideas with a focus on typography and readability.

[**Live Demo**](https://amytis.vercel.app/)

![Amytis Screenshot](public/screenshot.png)

## Features

- **Digital Garden Philosophy:** Non-linear navigation through tags, series, authors, and chronological archives.
- **Fuzzy Search:** Instant, client-side search across all posts (Cmd/Ctrl+K) powered by Fuse.js.
- **Series Support:** Multi-part content organization with manual or automatic ordering, cover images, and progress tracking.
- **Rich MDX Content:**
  - GitHub Flavored Markdown (tables, task lists, strikethrough).
  - Syntax-highlighted code blocks.
  - Mermaid diagrams (flowcharts, sequence diagrams, etc.).
  - LaTeX math via KaTeX.
  - Raw HTML support for custom layouts.
- **Elegant Design:**
  - Minimalist aesthetic with high-contrast typography.
  - Light/Dark mode with automatic system detection.
  - Four color palettes: default (emerald), blue, rose, amber.
  - Responsive layout optimized for reading.
  - Horizontal scrolling for featured content on the homepage.
- **Table of Contents:** Sticky TOC with scroll tracking, reading progress indicator, and active heading highlight.
- **Flexible Content Structure:**
  - Flat files (`post.mdx`) or nested folders (`post/index.mdx`).
  - Co-located assets: keep images inside post folders (`./images/`).
  - Date-prefixed filenames: `2026-01-01-my-post.mdx`.
  - Draft support for both posts and series.
- **Performance & SEO:**
  - Fully static export with optimized WebP images.
  - Development build mode without image optimization for faster iteration.
  - Native sitemap and RSS feed generation.
  - Estimated reading time for every article.
- **Integrations:**
  - Analytics: Umami, Plausible, or Google Analytics.
  - Comments: Giscus (GitHub Discussions) or Disqus.
  - Internationalization: multi-language support (en, zh).
- **Content CLI Tools:** Create posts, series, and import from PDFs or image folders.
- **Modern Stack:** Next.js 16, React 19, Tailwind CSS v4, TypeScript 5, Bun.

## Quick Start

1. **Install Dependencies:**
   ```bash
   bun install
   ```

2. **Start Development Server:**
   ```bash
   bun dev
   ```
   Visit [http://localhost:3000](http://localhost:3000).

3. **Build for Production (Static Export):**
   ```bash
   bun run build
   ```
   The static site will be generated in the `out/` directory with optimized images.

4. **Development Build (faster, no image optimization):**
   ```bash
   bun run build:dev
   ```

## CLI Commands

```bash
# Development
bun dev                    # Start dev server at localhost:3000
bun run lint               # Run ESLint

# Build
bun run build              # Full production build (copy assets + Next.js build + image optimization)
bun run build:dev          # Development build (no image optimization, faster)
bun run clean              # Remove .next, out, public/posts directories

# Testing
bun test                   # Run all tests
bun run test:unit          # Run unit tests (src/)
bun run test:int           # Run integration tests
bun run test:e2e           # Run end-to-end tests

# Content creation
bun run new "Post Title"                          # Create new post (flat file)
bun run new "Title" --folder                      # Create as folder with index.mdx
bun run new "Title" --prefix weekly               # Create with prefix (e.g., weekly-title)
bun run new "Title" --template custom             # Use custom template from templates/
bun run new "Title" --md                          # Create as .md instead of .mdx
bun run new "Title" --series my-series            # Create post in a series directory
bun run new-series "Series Name"                  # Create new series with cover image placeholder
bun run new-from-pdf doc.pdf                      # Create post from PDF (converts pages to images)
bun run new-from-pdf doc.pdf --title "My Doc"     # With custom title
bun run new-from-pdf doc.pdf --scale 3.0          # Higher resolution (default: 2.0)
bun run new-from-images ./photos                  # Create post from image folder
bun run new-from-images ./photos --title "Gallery" # With custom title
bun run new-from-images ./photos --sort date      # Sort by date (default: name)
bun run new-from-images ./photos --no-copy        # Reference images instead of copying
```

## Configuration

All site settings are managed in `site.config.ts`:

```typescript
export const siteConfig = {
  // Basic metadata
  title: "Amytis",
  description: "A minimalist digital garden...",
  baseUrl: "https://example.com",
  footerText: "...",

  // Navigation menu (sorted by weight)
  nav: [
    { name: "Garden", url: "/", weight: 1 },
    { name: "Series", url: "/series", weight: 1.5 },
    { name: "Archive", url: "/archive", weight: 2 },
    { name: "Tags", url: "/tags", weight: 3 },
    { name: "About", url: "/about", weight: 4 },
  ],

  // Social links (displayed in footer)
  social: {
    github: "https://github.com/...",
    twitter: "https://twitter.com/...",
    email: "mailto:...",
  },

  // Series shown in navbar dropdown
  series: {
    navbar: ["series-slug-1", "series-slug-2"],
  },

  // Pagination
  pagination: {
    posts: 10,    // Posts per page
    series: 10,   // Series posts per page
  },

  // URL and content behavior
  includeDateInUrl: false,     // Include date prefix in post URLs
  showFuturePosts: false,      // Show future-dated posts
  toc: true,                   // Enable table of contents by default

  // Appearance
  themeColor: 'default',       // 'default' | 'blue' | 'rose' | 'amber'

  // Homepage hero section
  hero: {
    title: "Cultivating Digital Knowledge",
    subtitle: "A minimalist digital garden...",
  },

  // Featured content on homepage (horizontal scrolling)
  featured: {
    series: {
      scrollThreshold: 2,      // Enable scrolling when more than N items
      maxItems: 6,             // Maximum series shown
    },
    stories: {
      scrollThreshold: 1,
      maxItems: 5,
    },
  },

  // Internationalization
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
  },

  // Analytics (pick one or set to null)
  analytics: {
    provider: 'umami',         // 'umami' | 'plausible' | 'google' | null
    umami: { websiteId: '...', src: '...' },
    plausible: { domain: '...', src: '...' },
    google: { measurementId: 'G-...' },
  },

  // Comments (pick one or set to null)
  comments: {
    provider: 'giscus',        // 'giscus' | 'disqus' | null
    giscus: { repo: '...', repoId: '...', category: '...', categoryId: '...' },
    disqus: { shortname: '...' },
  },
};
```

## Writing Content

### Posts

Create `.md` or `.mdx` files in `content/posts/`. Two formats are supported:

- **Flat file:** `content/posts/my-post.mdx`
- **Nested folder:** `content/posts/my-post/index.mdx` (allows co-located images in `./images/`)

Date-prefixed filenames (`2026-01-01-my-post.mdx`) automatically extract the date.

**Post frontmatter:**

```yaml
---
title: "Post Title"               # Required
date: "2026-01-01"                # Optional (auto-extracted from filename)
excerpt: "Optional summary"       # Auto-generated from content if omitted
category: "Category Name"         # Default: "Uncategorized"
tags: ["tag1", "tag2"]            # Optional
authors: ["Author Name"]          # Optional
series: "series-slug"             # Link post to a series
draft: true                       # Hidden in production (default: false)
featured: true                    # Show in featured section (default: false)
coverImage: "./images/cover.jpg"  # Local path or external URL
latex: true                       # Enable KaTeX math rendering (default: false)
toc: false                        # Hide table of contents (default: true)
layout: "simple"                  # Use simple layout (default: "post")
---
```

### Series

Series are collections of related posts. Create a series directory in `content/series/`:

```
content/series/my-series/
  index.mdx          # Series metadata
  images/
    cover.jpg         # Cover image
```

**Series frontmatter:**

```yaml
---
title: "Series Title"
excerpt: "Series description"
date: "2026-01-01"
coverImage: "./images/cover.jpg"
featured: true                     # Show in featured series on homepage
draft: true                        # Hidden in production (default: false)
sort: "date-asc"                   # 'date-asc' | 'date-desc' | 'manual'
posts: ["post-slug-1", "post-slug-2"]  # Manual post ordering (optional)
---
```

Posts join a series in two ways:
1. **Automatic:** Add `series: "series-slug"` to post frontmatter.
2. **Manual:** List post slugs in the series `posts` array for explicit ordering.

### Static Pages

Create pages like About at `content/about.mdx`. They're accessible at `/about`.

## Project Structure

```
amytis/
  content/
    posts/              # Blog posts (.md/.mdx)
    series/             # Series with metadata and cover images
    about.mdx           # Static pages
  public/               # Static assets
  scripts/
    copy-assets.ts      # Build: copy content images to public/
    new-post.ts         # CLI: create new post
    new-series.ts       # CLI: create new series
    new-from-pdf.ts     # CLI: convert PDF to post with images
    new-from-images.ts  # CLI: create post from image folder
  src/
    app/                # Next.js App Router pages
    components/         # React components
    i18n/               # Translation strings
    lib/
      markdown.ts       # Data access layer (content parsing)
  site.config.ts        # Site configuration
  CLAUDE.md             # AI pair programming guidance
```

### Key Components

| Component | Description |
|-----------|-------------|
| `Hero` | Configurable homepage hero section with collapsible intro |
| `HorizontalScroll` | Scrollable container with navigation arrows for featured content |
| `PostList` | Card-based post listing with thumbnails, meta info, and tags |
| `SeriesCatalog` | Timeline-style series post listing with numbered entries and progress |
| `SeriesSidebar` | Sidebar navigation for series posts with progress bar |
| `TableOfContents` | Sticky TOC with scroll tracking, progress bar, and back-to-top |
| `Search` | Fuzzy search modal (Cmd/Ctrl+K) using Fuse.js |
| `MarkdownRenderer` | Content rendering with GFM, math, syntax highlighting, diagrams |
| `Comments` | Giscus or Disqus integration (theme-aware) |
| `Analytics` | Umami, Plausible, or Google Analytics |
| `CoverImage` | Optimized image component with WebP support |
| `ThemeToggle` | Light/dark mode toggle |
| `LanguageSwitch` | i18n language selector |

### Route Structure

| Route | Description |
|-------|-------------|
| `/` | Homepage: hero, featured series, featured stories, latest writing |
| `/posts/[slug]` | Individual post with TOC, series sidebar, comments |
| `/posts`, `/posts/page/[page]` | Paginated post listing |
| `/series` | All series overview |
| `/series/[slug]` | Single series with post catalog |
| `/tags`, `/tags/[tag]` | Tag cloud and filtered post listing |
| `/authors/[author]` | Posts filtered by author |
| `/archive` | Chronological listing grouped by year/month |
| `/[slug]` | Static pages (about, etc.) |

## Theming

Amytis supports four color palettes, configured via `themeColor` in `site.config.ts`:

| Palette | Light Accent | Dark Accent |
|---------|-------------|-------------|
| `default` | Emerald (#059669) | Emerald (#34d399) |
| `blue` | Blue (#2563eb) | Blue (#60a5fa) |
| `rose` | Rose (#e11d48) | Rose (#fb7185) |
| `amber` | Amber (#d97706) | Amber (#fbbf24) |

Each palette defines CSS variables for `--accent`, `--background`, `--foreground`, `--heading`, `--muted`, and more. Light/dark mode is handled by `next-themes` with automatic system detection.

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guide](docs/CONTRIBUTING.md)

## License

MIT

# Amytis

**Amytis** is a high-performance, elegant digital garden built with Next.js 16, React 19, and Tailwind CSS v4. It is designed for cultivating thoughts, sharing knowledge, and growing ideas with a focus on typography and readability.

[**Live Demo**](https://amytis.vercel.app/)

![Amytis Screenshot](public/screenshot.png)

## Features

- **Digital Garden Philosophy:** Non-linear navigation through tags, series, authors, books, flows, and chronological archives.
- **Full-text Search:** Fast, static client-side search across all content (Cmd/Ctrl+K) powered by Pagefind.
- **Structured Content:**
  - **Series:** Multi-part content organization with manual or automatic ordering.
  - **Books:** Long-form content with explicit chapters, parts, and a dedicated reading interface.
  - **Flows:** Stream-style daily notes or micro-blogging for quick thoughts.
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
  - Draft support for posts, series, books, and flows.
- **Performance & SEO:**
  - Fully static export with optimized WebP images.
  - Native sitemap and RSS feed generation.
  - Multilingual reading time estimate (supports Latin and CJK).
- **Integrations:**
  - Analytics: Umami, Plausible, or Google Analytics.
  - Comments: Giscus (GitHub Discussions) or Disqus.
  - Internationalization: multi-language support (en, zh) with localized `site.config.ts`.
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
  // ...
  nav: [
    { name: "Home", url: "/", weight: 1 },
    { name: "Flow", url: "/flows", weight: 1.1 }, // Add Flows to nav
    { name: "Series", url: "/series", weight: 1.5 },
    { name: "Books", url: "/books", weight: 1.7 },
    { name: "Archive", url: "/archive", weight: 2 },
    // ...
  ],
  // ...
  flows: {
    recentCount: 5,
  },
};
```

## Writing Content

### Posts

Create `.md` or `.mdx` files in `content/posts/`.

### Flows

Create daily notes in `content/flows/YYYY/MM/DD.mdx` or `content/flows/YYYY/MM/DD/index.mdx`.

### Series

Create a directory in `content/series/` with an `index.mdx`.

### Books

Books are for long-form, structured content. Create a directory in `content/books/`.

## Project Structure

```
amytis/
  content/
    posts/              # Blog posts
    series/             # Series collections
    books/              # Long-form books
    flows/              # Daily notes (YYYY/MM/DD)
    about.mdx           # Static pages
  public/               # Static assets
  src/
    app/                # Next.js App Router pages
      books/            # Book routes
      flows/            # Flow routes
    components/         # React components
    lib/
      markdown.ts       # Data access layer
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guide](docs/CONTRIBUTING.md)

## License

MIT

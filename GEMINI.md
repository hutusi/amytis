# Amytis Project Context

## Project Overview
**Amytis** is a high-performance, elegant digital garden and blog engine built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**. It is designed for cultivating thoughts and sharing knowledge with a focus on typography, readability, and flexible content organization.

### Main Technologies
- **Framework**: Next.js 16 (App Router)
- **Runtime/Package Manager**: [Bun](https://bun.sh/)
- **Styling**: Tailwind CSS v4 with CSS-variable based themes and `@tailwindcss/typography`.
- **Content**: Local MDX/Markdown files with Zod-validated frontmatter.
- **Search**: Client-side fuzzy search using `Fuse.js`.
- **Diagrams**: Native support for `Mermaid` diagrams.
- **Math**: LaTeX support via `rehype-katex`.

## Building and Running

### Development
```bash
bun dev
```

### Production Build (Static Export)
```bash
bun run build
```
Generates a fully optimized static site in the `out/` directory.

### Linting & Testing
```bash
bun run lint
bun test
```

## Project Structure
- `src/app/`: Next.js App Router pages and global styles.
  - `page.tsx`: Homepage with horizontal scrolling featured sections and latest timeline.
  - `posts/`: Paginated post listing and individual post routes.
  - `series/`: Series overview and individual series catalog pages with pagination support.
  - `archive/`: Timeline-based chronological archive grouped by year and month.
  - `tags/`: Popularity-sorted tag cloud and filtered listings.
  - `authors/`: Posts filtered by individual authors.
  - `search.json/`: Static search index generator.
- `src/lib/`: Core logic and utilities.
  - `markdown.ts`: Advanced parsing for posts/series, sorting, reading time calculation (multilingual), and metadata inheritance.
- `src/components/`: Modular UI blocks (Hero, HorizontalScroll, Search, CoverImage, etc.).
- `content/`: Source Markdown/MDX content.
- `scripts/`: CLI tools for content management and asset processing.

## Key Features & Configuration

### Advanced Content Management
- **Posts**: Supports both flat files (`.mdx`) and nested folders (`/index.mdx`) with co-located assets.
- **Series**: 
  - Robust grouping with folder-based or file-based entries.
  - Configurable sorting: `date-asc`, `date-desc`, or `manual` (explicit list of slugs).
  - Cross-referencing: Series can include posts from the general pool or other folders.
  - Metadata inheritance: Posts can inherit attributes (like authors) from series index files.
- **Featured Content**: Mark posts or series as `featured` to display them in prominent homepage sections with horizontal scrolling.
- **Cover Images**: Support for local paths, external URLs, and dynamic desaturated gradients (`text:Label`).
- **External Links**: Posts can include a list of curated external resources in frontmatter.

### Refined UX & Design
- **Homepage**: Elegant layout with "Curated Series" and "Featured Stories" sections using horizontal scroll triggers.
- **Navigation**: Command+K fuzzy search, sticky TOC with progress tracking, and Series Catalog sidebars.
- **Theming**: Four built-in palettes (`default`, `blue`, `rose`, `amber`) with high-contrast Dark Mode support.
- **i18n**: Multi-language infrastructure (en, zh) with footer language switcher. `site.config.ts` supports localized strings.

### Build Pipeline
- **Asset Mapping**: `scripts/copy-assets.ts` mirrors content assets to the public folder, handling relative path resolution for both flat and nested structures.
- **Image Optimization**: Fully integrated with `next-image-export-optimizer` for optimized WebP delivery in static exports.

## Recent Updates
- Upgraded to Next.js 16.1.1 and React 19.
- Implemented robust series sorting and manual selection logic.
- Refined homepage layout with horizontal scrolling and distinct card styles for Series, Featured, and Latest sections.
- Added comprehensive CLI tools for PDF and Image-to-post conversions.
- Unified simple page layouts (About, Tags, Archive) for visual consistency.
- Resolved text-rendering cover image display issues using stable utility classes.
- Added pagination to the main posts list and individual series pages.
- Implemented sophisticated reading time calculation for mixed Latin and CJK text.
- Enhanced author management with metadata inheritance and slug-based routing.

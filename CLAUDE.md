# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amytis is a minimalist digital garden built with Next.js 15+ (App Router), React 19, and Tailwind CSS v4. It statically generates a blog from MDX content files with features like fuzzy search, table of contents, series grouping, and i18n support.

## Commands

```bash
# Development
bun dev                          # Start dev server at localhost:3000
bun run build                    # Production build (copies assets, builds, optimizes images)
bun run clean                    # Clean build artifacts (.next, out, public/posts)

# Testing
bun test                         # Run all tests
bun run test:unit                # Unit tests (src/)
bun run test:int                 # Integration tests (tests/integration/)
bun run test:e2e                 # E2E tests (tests/e2e/)

# Linting
bun run lint                     # Run ESLint

# Content creation
bun run new "Post Title"         # Create new post (flat .mdx file)
bun run new "Title" --folder     # Create post as folder with index.mdx
bun run new "Title" --prefix weekly  # Add prefix to filename
```

## Architecture

### Data Layer (`src/lib/markdown.ts`)
Central data access layer for all content operations. Key functions:
- `getAllPosts()` - Returns all published posts (filtered by draft/date, sorted)
- `getPostBySlug(slug)` - Single post with full content
- `getSeriesPosts(seriesName)` - Posts grouped by series
- `getRelatedPosts(slug, limit)` - Related posts by tag/category scoring
- `getAllTags()` - Tag frequency map

Uses Zod schema validation for frontmatter. Posts are parsed with `gray-matter` and rendered with `react-markdown`.

### Static Generation Pattern
All dynamic routes implement `generateStaticParams` for build-time pre-rendering:
- `src/app/posts/[slug]/page.tsx`
- `src/app/tags/[tag]/page.tsx`
- `src/app/series/[slug]/page.tsx`
- `src/app/page/[page]/page.tsx`

Output is fully static (`output: "export"` in next.config.ts).

### Component Pattern
- **Server Components** (default): Pages and layouts that fetch from markdown.ts
- **Client Components** (`'use client'`): Interactive UI - Search, ThemeToggle, LanguageSwitch, Navbar, TableOfContents

### Content Structure
```
content/
├── posts/
│   ├── post.mdx              # Flat post
│   ├── post/index.mdx        # Nested post with co-located images/
│   └── 2026-01-01-post.mdx   # Date-prefixed (date extracted from filename)
├── series/
│   └── series-name/
│       ├── index.mdx         # Series landing page
│       └── part-1.mdx        # Series parts
└── about.mdx                 # Single page (layout: simple)
```

### Configuration
`site.config.ts` controls site-wide settings:
- `nav[]` - Navigation menu items with weights
- `themeColor` - Color palette ('default' | 'blue' | 'rose' | 'amber')
- `i18n` - Language configuration
- `analytics` - Provider settings (umami/plausible/google)
- `comments` - Giscus/Disqus configuration

### Theming
CSS variables defined in `src/app/globals.css` under `:root` (light) and `.dark` (dark). Theme palette applied via `data-palette` attribute on body. Managed by `next-themes`.

### Markdown Rendering (`src/components/MarkdownRenderer.tsx`)
Plugins:
- `remark-gfm` - GitHub Flavored Markdown
- `remark-math` + `rehype-katex` - LaTeX math (conditional on `latex: true`)
- `rehype-raw` - Raw HTML support
- `rehype-slug` - Heading IDs for TOC
- Custom `rehype-image-metadata` - Injects image dimensions

### Path Aliases
`@/*` maps to `./src/*` (configured in tsconfig.json)

## Frontmatter Schema

Required: `title`

Optional with defaults:
- `date` - Extracted from filename if date-prefixed
- `excerpt` - Auto-generated from content if missing
- `category` - Default: "Uncategorized"
- `tags` - Default: []
- `authors` - Default: ["Amytis"]
- `layout` - "post" or "simple"
- `series` - Groups posts chronologically
- `coverImage` - Local path, URL, or `text:Abstract Text`
- `draft` - Hidden in production when true
- `latex` - Enables KaTeX when true
- `toc` - Default: true

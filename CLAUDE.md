# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amytis is a static "digital garden" blog built with Next.js 15+ (App Router), React 19, and Tailwind CSS v4. Content is authored in MDX/Markdown files and statically generated at build time. Features include series support, multi-language (i18n), configurable themes, and comments integration.

## Commands

```bash
# Development
bun dev                    # Start dev server at localhost:3000
bun run lint               # Run ESLint

# Testing
bun test                   # Run all tests
bun run test:unit          # Run unit tests (src/)
bun run test:int           # Run integration tests
bun run test:e2e           # Run end-to-end tests
bun test path/to/file.test.ts  # Run a single test file

# Build
bun run build              # Full production build (copies assets, builds Next.js, optimizes images)
bun run clean              # Remove .next, out, public/posts directories

# Content creation
bun run new "Post Title"              # Create new post (flat file)
bun run new "Title" --folder          # Create as folder with index.mdx
bun run new "Title" --prefix weekly   # Create with prefix (e.g., weekly-title)
bun run new "Title" --template custom # Use custom template from templates/
bun run new "Title" --md              # Create as .md instead of .mdx
bun run new-series "Series Name"      # Create new series with cover image
```

## Architecture

### Data Flow

1. **Content source**: MDX/Markdown files in `content/posts/` and `content/series/`
2. **Data layer**: `src/lib/markdown.ts` - reads files with Node `fs`, parses frontmatter with `gray-matter`, validates with Zod
3. **Static generation**: Routes use `generateStaticParams` to pre-render at build time
4. **Rendering**: `react-markdown` with remark/rehype plugins for GFM, math (KaTeX), syntax highlighting, and Mermaid diagrams

### Key Files

- `site.config.ts` - Site configuration (nav, social, pagination, themes, i18n, analytics, comments)
- `src/lib/markdown.ts` - Data access layer with all content query functions
- `src/app/globals.css` - Theme CSS variables and color palettes
- `src/components/MarkdownRenderer.tsx` - MDX rendering with all plugins
- `src/i18n/translations.ts` - Language strings for i18n

### Route Structure

- `/` - Homepage with hero, featured series, featured posts, latest writing
- `/posts/[slug]` - Individual post pages
- `/posts/page/[page]` - Paginated post listing
- `/series` - All series overview
- `/series/[slug]` - Single series with its posts
- `/series/[slug]/page/[page]` - Series pagination
- `/tags` - Tag cloud with post counts
- `/tags/[tag]` - Posts filtered by tag
- `/authors/[author]` - Posts filtered by author
- `/archive` - Chronological listing grouped by year/month
- `/[slug]` - Static pages (about, etc.)

### Content Structure

**Posts** support two formats:
- **Flat file**: `content/posts/my-post.mdx`
- **Nested folder**: `content/posts/my-post/index.mdx` (allows co-located images in `./images/`)

**Series** live in `content/series/[slug]/index.mdx` with optional `images/` folder for cover images.

Date-prefixed filenames (`2026-01-01-my-post.mdx`) extract dates automatically.

## Configuration (`site.config.ts`)

Key configuration options:
- `nav` - Navigation links with weights
- `social` - GitHub, Twitter, email links for footer
- `series.navbar` - Series slugs to show in navbar dropdown
- `pagination.posts`, `pagination.series` - Items per page
- `themeColor` - 'default' | 'blue' | 'rose' | 'amber'
- `hero` - Homepage hero title and subtitle
- `i18n` - Default locale and supported locales
- `featured.series` - Scrollable series: `scrollThreshold` (default: 2), `maxItems` (default: 6)
- `featured.stories` - Scrollable stories: `scrollThreshold` (default: 1), `maxItems` (default: 5)
- `analytics.provider` - 'umami' | 'plausible' | 'google' | null
- `comments.provider` - 'giscus' | 'disqus' | null

## Content Frontmatter

### Posts

```yaml
---
title: "Post Title"
date: "2026-01-01"
excerpt: "Optional summary (auto-generated if omitted)"
category: "Category Name"
tags: ["tag1", "tag2"]
authors: ["Author Name"]
series: "series-slug"      # Link to a series
draft: true                # Hidden in production
featured: true             # Show in featured section
coverImage: "./images/cover.jpg"  # Local or external URL
latex: true                # Enable KaTeX math
toc: false                 # Hide table of contents
layout: "simple"           # Use simple layout (default: "post")
---
```

### Series (`content/series/[slug]/index.mdx`)

```yaml
---
title: "Series Title"
excerpt: "Series description"
date: "2026-01-01"
coverImage: "./images/cover.jpg"
featured: true             # Show in featured series
sort: "date-asc"           # 'date-asc' | 'date-desc' | 'manual'
posts: ["post-1", "post-2"] # Manual post ordering (optional)
---
```

## Key Components

- `PostLayout` / `SimpleLayout` - Post page layouts with TOC, series sidebar, comments
- `Hero` - Configurable homepage hero section
- `HorizontalScroll` - Scrollable container with navigation arrows for featured content
- `Search` - Client-side fuzzy search (Cmd/Ctrl+K) using Fuse.js
- `TableOfContents` - Sticky TOC extracted from H2-H3 headings
- `SeriesSidebar` - Series navigation with current post indicator
- `Comments` - Giscus or Disqus integration (theme-aware)
- `LanguageSwitch` - i18n language selector
- `ThemeToggle` - Light/dark mode toggle

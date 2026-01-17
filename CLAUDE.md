# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amytis is a minimalist digital garden/blog built with Next.js 16 (App Router), React 19, and Tailwind CSS v4. Content is managed as Markdown/MDX files in the filesystem.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server (localhost:3000)
bun run build        # Production build
bun run lint         # Run ESLint
bun test             # Run all tests
bun run test:unit    # Unit tests only (src/)
bun run test:int     # Integration tests (tests/integration/)
bun run test:e2e     # E2E tests (tests/e2e/)
```

## Architecture

### Data Flow

1. Content lives in `content/posts/*.mdx` (posts) and `content/*.mdx` (pages)
2. `src/lib/markdown.ts` reads files, parses frontmatter with `gray-matter`, returns typed `PostData`
3. Routes use `generateStaticParams()` for static generation at build time

### Key Directories

- `src/app/` - Next.js App Router pages (uses async components with `params: Promise<>`)
- `src/components/` - Reusable UI components (Navbar, PostList, MarkdownRenderer, Mermaid, ThemeToggle)
- `src/lib/markdown.ts` - Data access layer (getAllPosts, getPostBySlug, getPostsByTag, etc.)
- `content/posts/` - Blog posts (`.mdx` or `.md`)
- `site.config.ts` - Site metadata, navigation, pagination settings

### Post Formats

Posts support multiple formats:

- `slug.mdx` - Standard file
- `YYYY-MM-DD-slug.mdx` - Date-prefixed (date extracted from filename)
- `slug/index.mdx` - Directory-based (for posts with assets)

### Frontmatter Schema

```yaml
---
title: "Post Title"
date: "2026-01-15"
excerpt: "Optional - auto-generated from content if omitted"
category: "Thoughts"
tags: ["tag1", "tag2"]
authors: ["Author Name"]
draft: false          # Hidden in production
layout: "post"        # or "simple"
---
```

### Visibility Rules (production)

- `draft: true` posts are hidden
- Future-dated posts are hidden (configurable via `siteConfig.showFuturePosts`)
- `category: "Page"` posts are excluded from home/archive lists

## Tech Stack Details

- **Runtime:** Bun
- **Testing:** Bun's test runner (`import { describe, expect, test } from "bun:test"`)
- **Theming:** next-themes with CSS variables in `src/app/globals.css`
- **Path alias:** `@/*` maps to `src/*`
- **ESLint:** v9 flat config format (`.mjs` files)

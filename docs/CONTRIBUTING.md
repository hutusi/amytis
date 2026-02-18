# Contributing to Amytis

## Getting Started

1. **Install Bun:** Ensure you have [Bun](https://bun.sh/) (1.3.4+) installed.
2. **Install Dependencies:**
   ```bash
   bun install
   ```
3. **Run Development Server:**
   ```bash
   bun dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Writing Content

### Creating Posts

Use the CLI to scaffold new content:

```bash
# Create a flat file post
bun run new "My New Post"

# Create as a folder with index.mdx (for co-located images)
bun run new "Photography" --folder

# Create with a prefix (e.g., for a newsletter)
bun run new "Update 1" --prefix weekly

# Use a custom template
bun run new "My Post" --template custom

# Create as .md instead of .mdx
bun run new "My Post" --md

# Create a post inside a series directory
bun run new "Getting Started" --series my-series
```

Or create files manually:

- **Flat file:** `content/posts/my-post.mdx`
- **Nested folder:** `content/posts/my-post/index.mdx` (put images in `./images/`)

### Creating Series

```bash
bun run new-series "My Series Name"
```

This creates `content/series/my-series-name/index.mdx` with a cover images folder.

### Importing Content

```bash
# Convert a PDF to a post (each page becomes an image)
bun run new-from-pdf document.pdf
bun run new-from-pdf document.pdf --title "My Document" --scale 3.0

# Create a post from a folder of images
bun run new-from-images ./photos
bun run new-from-images ./photos --title "Gallery" --sort date --no-copy
```

### Content Tools

- **Draft Preview:** `bun run series-draft` lists all draft posts and series with their current status.

### Frontmatter

**Posts:**

```yaml
---
title: "My New Post"
date: "2026-01-01"
excerpt: "A brief summary."
category: "Thoughts"
tags: ["example", "demo"]
authors: ["Your Name"]
series: "series-slug"      # Link to a series
draft: false               # Set to true to hide in production
featured: false            # Set to true to show in featured section
coverImage: "./images/cover.jpg"
latex: true                # Enable math equations ($...$)
toc: true                  # Show table of contents
layout: "post"             # "post" (default) or "simple"
externalLinks:             # Optional curated resources
  - name: "Source"
    url: "https://..."
---

Your content here...

![My Image](./images/pic.png)
```

**Series:**

```yaml
---
title: "Series Title"
excerpt: "Series description"
date: "2026-01-01"
coverImage: "./images/cover.jpg"
featured: true             # Show on homepage
draft: false               # Set to true to hide in production
sort: "date-asc"           # "date-asc" | "date-desc" | "manual"
posts: ["post-1", "post-2"] # Manual ordering (optional)
---
```

### Draft Content

Both posts and series support `draft: true`:

- **Development:** Drafts are visible everywhere for preview.
- **Production:** Drafts are hidden from all listings and return 404 on direct URL access.

## Running Tests

We use Bun's built-in test runner:

```bash
bun test                   # Run all tests
bun run test:unit          # Run unit tests (src/)
bun run test:int           # Run integration tests (tests/integration/)
bun run test:e2e           # Run end-to-end tests (tests/e2e/)
bun test path/to/file.test.ts  # Run a single test file
```

## Building

```bash
bun run build              # Production build (assets + Next.js + image optimization)
bun run build:dev          # Development build (no image optimization, faster)
bun run clean              # Clean build artifacts (.next, out, public/posts)
```

## Code Style

- **Linting:** `bun run lint`
- Follow the existing patterns in the codebase.
- Use TypeScript for all new files.
- Components go in `src/components/`, utilities in `src/lib/`.
- Use Tailwind CSS utility classes; theme colors via CSS variables (`text-accent`, `bg-muted/10`, etc.).
- **Localization:** Use `TranslatedText` component or `t()` helper for localized UI strings. Ensure `site.config.ts` handles localized objects where appropriate.
- **Author Pages:** Authors are now slug-based (`/authors/amytis-team`). Use `getAuthorSlug()` utility when linking to authors.

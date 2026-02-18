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

# Create as a folder with index.mdx
bun run new "Photography" --folder

# Create post in a series
bun run new "Getting Started" --series my-series
```

### Creating Series

```bash
bun run new-series "My Series Name"
```

### Creating Books

Books are manually structured in `content/books/`.

1. Create a folder: `content/books/my-book/`
2. Add `index.mdx` with metadata and chapters configuration:

```yaml
---
title: "The Handbook"
excerpt: "A guide..."
date: "2026-01-01"
coverImage: "./images/cover.jpg"
featured: true
authors: ["Name"]
chapters:
  - part: "Introduction"
    chapters:
      - title: "Welcome"
        file: "welcome"  # Refers to welcome.mdx in the same folder
  - title: "Conclusion"
    file: "conclusion"
---
```

3. Create the chapter files (`welcome.mdx`, `conclusion.mdx`) in the same folder.

### Importing Content

```bash
# PDF to post
bun run new-from-pdf doc.pdf --title "My Doc"

# Image folder to post
bun run new-from-images ./photos --title "Gallery"
```

## Running Tests

```bash
bun test                   # Run all tests
bun run test:unit          # Run unit tests
bun run test:e2e           # Run end-to-end tests
```

## Building

```bash
bun run build              # Production build
bun run build:dev          # Development build (faster)
```

## Code Style

- **Linting:** `bun run lint`
- **TypeScript:** Use strict types.
- **Tailwind:** Use utility classes.
- **Localization:** Use `t()` helper for UI strings.

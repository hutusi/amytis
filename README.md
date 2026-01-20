# Amytis

**Amytis** is a minimalist, elegant digital garden built with Next.js 15+ and Tailwind CSS v4. It is designed for cultivating thoughts, sharing knowledge, and growing ideas with a focus on typography and readability.

![Amytis Screenshot](public/screenshot.png)

## Features

- 🌿 **Digital Garden Philosophy:** Non-linear navigation, tags, and chronological archives.
- 📝 **Rich MDX Content:**
  - **Standard Markdown:** GFM support (Tables, Task Lists, Strikethrough).
  - **Code:** Syntax highlighting and Mermaid diagrams.
  - **Math:** LaTeX support via KaTeX.
  - **Components:** Embed React components directly in content.
  - **Raw HTML:** Support for raw HTML tags for custom layouts.
- 🎨 **Elegant Design:**
  - Minimalist aesthetic.
  - **Light/Dark Mode:** Automatic system detection with manual toggle.
  - **Responsive Layout:** Optimized for reading.
- 📂 **Flexible Content Structure:**
  - **Flat or Nested:** Support for `post.mdx` or `post/index.mdx`.
  - **Co-located Assets:** Keep images inside post folders (`./images/pic.png`).
  - **Date-prefixed Filenames:** `2026-01-01-my-post.mdx` support.
- ⚙️ **Configurable:**
  - **Drafts:** Hide content marked `draft: true` in production.
  - **Future Posts:** Automatically hide future-dated posts (configurable).
  - **Permalinks:** Configurable URL structure.
- ⚡ **Modern Stack:** Built on Next.js 15, React 19, Tailwind v4, and Bun.

## Quick Start

1.  **Install Dependencies:**
    ```bash
    bun install
    ```

2.  **Start Development Server:**
    ```bash
    bun dev
    ```
    Visit [http://localhost:3000](http://localhost:3000).

3.  **Build for Production (Static Export):**
    ```bash
    bun run build
    ```
    The static site will be generated in the `out/` directory.

## Configuration

Customize the site via `site.config.ts`:

```typescript
export const siteConfig = {
  title: "Amytis", // Site title
  description: "...", // Meta description
  footerText: "...", // Footer content
  nav: [ // Navigation menu items
    { name: "Garden", url: "/", weight: 1 },
    { name: "GitHub", url: "...", weight: 5, external: true } // External link support
  ],
  pagination: {
    pageSize: 10,
  },
  includeDateInUrl: false, // If true, URLs will include the date prefix from filename
  showFuturePosts: false, // If true, future-dated posts are visible
};
```

## Writing Content

Create `.md` or `.mdx` files in `content/posts/`.

**Frontmatter Options:**

```yaml
---
title: "My Post Title"
date: "2026-01-01"
excerpt: "Optional summary."
category: "Thoughts"
tags: ["garden", "meta"]
authors: ["Your Name"]
layout: "post" # or 'simple' for pages
draft: false # Set to true to hide in production
latex: false # Set to true to enable Math/KaTeX
---
```

## Documentation

For deeper details on the architecture and contributing:

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guide](docs/CONTRIBUTING.md)

## License

MIT
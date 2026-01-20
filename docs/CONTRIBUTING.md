# Contributing to Amytis

## Getting Started

1.  **Install Bun:** Ensure you have Bun installed.
2.  **Install Dependencies:**
    ```bash
    bun install
    ```
3.  **Run Development Server:**
    ```bash
    bun dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## Writing Content

1.  **Create a Post:**
    - **Flat File:** Create `content/posts/my-post.mdx`.
    - **Nested Folder:** Create `content/posts/my-post/index.mdx`. This allows you to keep assets (images) inside the folder (e.g. `content/posts/my-post/images/pic.png`).

2.  **Frontmatter:**

```yaml
---
title: "My New Post"
date: "2026-01-01"
excerpt: "A brief summary."
category: "Thoughts"
tags: ["example", "demo"]
authors: ["Your Name"]
draft: false
latex: true # Enable if using math equations ($...$)
---

Your content here...

![My Image](./images/pic.png)
```

## Running Tests

We use Bun's built-in test runner.

- **Run all tests:** `bun test`
- **Run unit tests:** `bun run test:unit`
- **Run integration tests:** `bun run test:int`

## Code Style

- **Linting:** `bun run lint`
- **Formatting:** Code should match the project's Prettier/ESLint configuration.

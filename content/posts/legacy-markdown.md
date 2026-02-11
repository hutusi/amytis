---
title: "Legacy Markdown Support"
date: "2026-01-15"
excerpt: "Demonstrating support for standard .md files."
category: "Meta"
tags: ["markdown", "legacy"]
author: "Old Timer"
featured: true
coverImage: "text:Legacy Markdown"
---

# Legacy Markdown Support

This post is written in a standard `.md` file, not `.mdx`.

## Why support both?

Migration from other systems (Jekyll, Hugo) often involves thousands of `.md` files. Supporting them natively makes migration easier.

## Footnotes

Footnote test[^test].

One of the main benefits of `.md` support is seamless migration. If you're moving from Jekyll, Hugo, or another static site generator, your existing posts can be dropped into the `content/posts/` directory without any changes. Frontmatter fields like `title`, `date`, and `tags` are parsed identically for both formats.

The key difference is that `.mdx` files allow embedding React components directly in your content, while `.md` files stick to standard Markdown. For most blog posts, standard Markdown is more than sufficient — and keeping your content in `.md` means it stays portable across any Markdown-compatible system.

### Code Block Test

```javascript
console.log("Hello from .md file!");
```

- Item 1
- Item 2

## References

This is a [link to markdown guide][md-guide].

Internal links: [Home](/) and [Archives](/archive).

## More Reference Links

Reference links test: [Markdown Guide][guide], [CommonMark][commonmark].

[guide]: https://www.markdownguide.org
[commonmark]: https://commonmark.org

### markdown table

| Feature | Sum | Notes |
| :--- | :---: | :--- |
| Tables | `>` 10 | Requires remark-gfm |
| Task Lists | 5 | Checkboxes |
| Strikethrough | 1 | ~~Deleted~~ |


[^test]: A simple footnote.


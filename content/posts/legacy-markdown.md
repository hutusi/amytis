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

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?

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


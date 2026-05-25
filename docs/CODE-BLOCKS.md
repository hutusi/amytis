# Code Blocks

Amytis highlights code at **build time** with [Shiki](https://shiki.style/).
The same pipeline runs for Markdown, MDX, and reStructuredText, so the
authoring syntax is symmetric across formats: write a fence with metadata in
Markdown/MDX, write directive options in rST, and the same features come out
the other side.

The features below are all opt-in — a plain ` ```ts ` fence still renders as a
normal highlighted block.

## Feature matrix

| Feature | Markdown / MDX | rST |
|---|---|---|
| Line numbers | ` ```ts linenos ` | `:linenos:` |
| Highlighted lines | ` ```ts {1,3-5} ` | `:emphasize-lines: 1,3-5` |
| Title / filename bar | ` ```ts title="app.ts" ` | `:caption: app.ts` |
| Override language | (set on the fence) | `:language: rust` |
| Diff `+`/`-` backgrounds | ` ```diff ` | `.. code-block:: diff` |
| Word-wrap toggle | header button (client) | header button (client) |

All four metadata fields can be combined freely:

````markdown
```tsx title="components/CodeBlock.tsx" linenos {3,7-9}
import { highlightToHast } from '@/lib/shiki';
// ...
```
````

```rst
.. code-block:: tsx
   :caption: components/CodeBlock.tsx
   :linenos:
   :emphasize-lines: 3,7-9

   import { highlightToHast } from '@/lib/shiki';
   ...
```

Both produce identical output: header bar with the filename + language label,
a line-number gutter, and lines 3 and 7–9 highlighted.

## Supported languages

The Shiki bundle is loaded with this curated list (see `src/lib/shiki.ts`):

`tsx`, `typescript` (`ts`), `javascript` (`js`), `bash` (`sh`, `shell`,
`zsh`), `markdown` (`md`), `json`, `css`, `python` (`py`), `rust`, `go`
(`golang`), `c`, `cpp` (`c++`), `java`, `ruby` (`rb`), `sql`, `yaml`
(`yml`), `diff`, `html`, `xml`, `svg` (aliased to `xml`), `plaintext`
(`text`, `txt`, `plain`).

Unknown languages don't fail the build — they degrade to `plaintext` and
emit a one-line `[shiki] Unknown code-block language "…"` warning. Add the
language to `SHIKI_LANGS` in `src/lib/shiki.ts` to enable it properly.

## Diff fences

When the language is exactly `diff`, lines starting with `+` get a green
background and lines starting with `-` get a red background, on top of
the normal token coloring. Lines like `+++` and `---` (diff headers) are
intentionally NOT colored so they read as headers, not changes.

## Word-wrap toggle

Every block ships with two header buttons: `Copy` (the existing behavior)
and `No wrap` / `Wrap`. The wrap toggle is per-block client state — it
flips `data-wrap` on the block's root and CSS does the rest. There's no
global default.

## Theming

Shiki runs in dual-theme mode with `github-light` and `github-dark`.
Every token gets two CSS variables (`--shiki-light` and `--shiki-dark`),
and `src/app/globals.css` picks one or the other based on the global
`html.dark` class.

To swap themes, edit `SHIKI_THEMES` in `src/lib/shiki.ts` and bump
`RST_RENDERER_DISK_CACHE_VERSION` in `src/lib/rst-renderer.ts` so cached
rST renders pick up the new theme (Markdown is highlighted on every
render and doesn't need the bump).

## How it works

- **Markdown/MDX**: `MarkdownRenderer.tsx` parses fence meta (preserved via
  the small `rehype-fence-meta.ts` plugin because `react-markdown` strips
  `node.data` before invoking overrides). `CodeBlock` is an async server
  component that calls `highlightToHast` and inlines the resulting HTML.
- **rST**: `scripts/render-rst.py` rewrites each `literal_block` into an
  opaque `<pre data-amytis-code …>` marker carrying option attributes.
  `src/lib/shiki-rst.ts` walks the rendered HTML in `RstRenderer` and
  replaces each marker with the same Shiki output.
- The fallback rST parser (`src/lib/rst.ts`) converts directive options
  into Markdown fence meta and routes through the MDX pipeline, so both
  rST paths produce identical output.

## Gotchas

- The rST sanitize-html allowlist in `src/components/RstRenderer.tsx` must
  permit `style` and `data-*` attributes on `pre`/`code`/`span`/`div`.
  Stripping them silently kills syntax highlighting for rST while leaving
  Markdown unaffected.
- The Shiki highlighter is a singleton on `globalThis` — never instantiate
  it per render. Loading WASM grammars takes ~1–2 s.
- Mermaid blocks are short-circuited in `MarkdownRenderer.tsx` before
  `CodeBlock` is reached; they never go through Shiki.

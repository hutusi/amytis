# Code Blocks

Amytis highlights code at **build time** with [Shiki](https://shiki.style/).
The same pipeline runs for Markdown, MDX, and reStructuredText, so the
authoring syntax is symmetric across formats: write a fence with metadata in
Markdown/MDX, write directive options in rST, and the same features come out
the other side.

The features below are all opt-in — a plain `` ```ts `` fence still renders as a
normal highlighted block.

## Feature matrix

| Feature | Markdown / MDX | rST |
|---|---|---|
| Line numbers | `` ```ts linenos `` | `:linenos:` |
| Highlighted lines | `` ```ts {1,3-5} `` | `:emphasize-lines: 1,3-5` |
| Title / filename bar | `` ```ts title="app.ts" `` | `:caption: app.ts` |
| Override language | (set on the fence) | `:language: rust` |
| Diff `+`/`-` backgrounds | `` ```diff `` | `.. code-block:: diff` |
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

## Tabbed code groups

Group adjacent fences into a tabbed widget. The mechanism is **CSS-only**
(hidden `<input type="radio">` + `<label>` siblings + attribute selectors)
— no JavaScript, no hydration cost. Keyboard navigation works for free via
the browser's native arrow-key cycling between radios in the same group.

**Markdown / MDX** — wrap fences in a `:::code-group` container directive
from [`remark-directive`](https://github.com/remarkjs/remark-directive).
Tab names come from a `[label]` token at the start of each fence's info
string (Docusaurus convention). When `[label]` is absent, the language
name is used as the tab name.

````markdown
:::code-group
```bash [npm]
npm install foo
```
```bash [yarn]
yarn add foo
```
```bash [bun]
bun add foo
```
:::
````

**rST** — use the custom `.. code-group::` directive wrapping nested
`.. code-block::` blocks, each with a `:label:` option for the tab name:

```rst
.. code-group::

   .. code-block:: bash
      :label: npm

      npm install foo

   .. code-block:: bash
      :label: yarn

      yarn add foo
```

Both pipelines produce identical HTML and share the same CSS. Up to 10
tabs per group are supported out of the box (CSS rules hardcoded for
`data-idx="0"` through `data-idx="9"`); extend the rules in
`src/app/globals.css` if you need more.

## Notation comments

Six VitePress-style `[!code …]` markers can be embedded inline in any code
block. They're written using the language's native comment syntax (the
Shiki transformers detect `//`, `#`, `--`, `<!-- -->`, etc.):

| Marker | Effect |
|---|---|
| `[!code focus]` | Dim every other line in the block; revert on `:hover` of the `<pre>` |
| `[!code highlight]` | Same `.line.highlighted` style as the `{1,3-5}` fence-meta range syntax |
| `[!code ++]` | Green-tinted line (same `.line.diff.add` as raw `+` in `diff` fences) |
| `[!code --]` | Red-tinted line (same `.line.diff.remove` as raw `-` in `diff` fences) |
| `[!code error]` | Red border + tint for error annotations |
| `[!code warning]` | Amber border + tint for warning annotations |

Example:

````markdown
```ts
function login(user: string) {           // [!code focus]
  const token = oldApi.auth(user)        // [!code --]
  const token = newApi.auth({ user })    // [!code ++]
  validate(token)                        // [!code highlight]
  throwIfExpired(token)                  // [!code error]
  if (!token.refreshable) warn()         // [!code warning]
  return token
}
```
````

Notation comments and the meta-based features (`title="…"`, `linenos`,
`{1,3-5}`) compose freely on the same fence.

The four transformers (`transformerNotationFocus`, `transformerNotationErrorLevel`,
`transformerNotationHighlight`, `transformerNotationDiff`) ship with the
`@shikijs/transformers` package; see [`src/lib/shiki.ts`](../src/lib/shiki.ts)
for where they're registered.

## Supported languages

The Shiki bundle is loaded with this curated list (see `src/lib/shiki.ts`):

`tsx`, `typescript` (`ts`), `javascript` (`js`), `bash` (`sh`, `shell`,
`zsh`), `markdown` (`md`), `json`, `css`, `python` (`py`), `rust`, `go`
(`golang`), `c`, `cpp` (`c++`), `java`, `ruby` (`rb`), `sql`, `yaml`
(`yml`), `diff`, `html`, `xml`, `svg` (aliased to `xml`), `nginx`,
`haskell`, `ocaml`, `plaintext` (`text`, `txt`, `plain`).

Unknown languages **fail the build** with an explicit error — per the
"strict build over silent runtime failure" principle in `CLAUDE.md`, a
typo'd fence language is treated as misconfiguration. To add a language,
extend `SHIKI_LANGS` or `LANG_ALIASES` in `src/lib/shiki.ts`. To render
unhighlighted code on purpose, use `plaintext` (or its aliases `text` /
`txt` / `plain`).

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

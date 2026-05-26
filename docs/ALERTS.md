# Alerts (GitHub-flavored callouts)

Amytis renders the five GitHub-flavored alert types as styled callouts.
Both Markdown / MDX (`> [!TYPE]` blockquote markers) and rST (the built-in
`.. note::` / `.. tip::` etc. directives) produce visually consistent
output — same border color, same icon-less title bar for rST (docutils
supplies the title), same per-type accent palette.

## Markdown / MDX

Start a blockquote with `[!TYPE]` on its own first line:

```markdown
> [!NOTE]
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.
```

The marker is **case-insensitive** (`[!note]` works too). Body content
keeps full Markdown — paragraphs, lists, links, inline code, even other
code blocks.

A blockquote without a recognized marker stays as a plain blockquote.
An unknown type like `[!UNKNOWN]` also passes through unchanged.

## reStructuredText

rST uses docutils' built-in admonition directives. All five GitHub types
have a docutils equivalent, plus a few aliases:

```rst
.. note::

   Highlights information that users should take into account.

.. tip::

   Optional information to help a user be more successful.

.. hint::

   Also styled as a tip.

.. important::

   Crucial information necessary for users to succeed.

.. warning::

   Critical content demanding immediate user attention.

.. attention::

   Also styled as a warning.

.. caution::

   Negative potential consequences of an action.

.. danger::

   Also styled as a caution.
```

The CSS rules in `src/app/globals.css` apply the same `--alert-accent`
color variable to docutils' `.admonition-note` / `.admonition-tip` /
`.admonition-hint` / `.admonition-important` / `.admonition-warning` /
`.admonition-attention` / `.admonition-caution` / `.admonition-danger`
classes, so `> [!NOTE]` in MDX and `.. note::` in rST land at the same
visual output.

## Visual style

- Per-type accent color drives the left border, the title bar text, and
  a tinted background (8% accent over the page background).
- Dark mode uses brighter accent variants matching GitHub Primer's
  dark-tier alert colors.
- MDX alerts use an inline SVG icon; rST admonitions skip the icon (docutils
  doesn't emit one) but keep the colored title.

## How it works

- **MDX**: a small remark plugin at `src/lib/remark-github-alerts.ts`
  detects the `[!TYPE]` marker, strips it from the blockquote, and routes
  the node through a `<GithubAlert>` React server component
  (`src/components/GithubAlert.tsx`). `remark-gfm` v4 does NOT include
  the alert transform — it passes blockquotes through with the marker
  intact — so the plugin is what makes this work.
- **rST**: docutils' built-in admonition directives produce the
  `<aside class="admonition admonition-<type>">` markup. The shared CSS
  in `globals.css` matches both pipelines.

## Gotchas

- Don't rely on a blank line between the marker and body — `> [!NOTE]\n> body`
  works; `> [!NOTE]\n>\n> body` also works.
- The marker must be `[!TYPE]` *exactly* (square brackets, exclamation,
  type). VitePress-style colon variants like `:::tip` aren't recognized.
- Custom alert types beyond the five GitHub ones aren't supported. If you
  need one, extend the regex in `remark-github-alerts.ts` and add a CSS
  rule.

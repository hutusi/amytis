# Translating content with `bun run translate`

Amytis keeps each language in its own content tree: a translation is the same
file at the same path under `content/<locale>/` (see "Translating content" in
[`CONTRIBUTING.md`](../CONTRIBUTING.md)). `bun run translate` writes that file
with an LLM. The model only translates prose; the parts that must be exact
(where the file goes, frontmatter, code, links, assets) are done in code and
checked afterwards.

## Set up

1. Turn on i18n in `site.config.ts` and list the target locale:
   `i18n: { enabled: true, defaultLocale: 'en', locales: ['en', 'zh'] }`.
2. Put the provider settings in `.env.local`. Bun loads it, and git ignores
   every `.env*` file, so the key is never committed.

   ```bash
   # Aliyun Bailian (Model Studio), OpenAI-compatible mode
   TRANSLATE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
   TRANSLATE_MODEL=<model id from the Bailian console, e.g. a GLM model>
   TRANSLATE_API_KEY=sk-...
   ```

   Accounts in Bailian's international region use
   `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. Any provider with
   an OpenAI-compatible `/chat/completions` endpoint works the same way, for
   example `https://api.openai.com/v1`, or a local Ollama at
   `http://localhost:11434/v1`.

   `TRANSLATE_REQUEST_OPTIONS` (optional) is a JSON object merged into every
   request body, for provider-specific switches such as
   `{"enable_thinking": false}` on a reasoning model, or a higher
   `{"max_tokens": 16384}` when replies get cut off. Check your provider's
   docs for what its models accept.

## Translate

```bash
bun run translate content/posts/my-post.mdx            # a post, page or note
bun run translate content/posts/my-trip/               # a folder post, with its files
bun run translate content/series/my-series/            # a whole series
bun run translate content/books/my-book/               # a whole book
bun run translate content/posts/my-post.mdx --dry-run  # print it, write nothing
```

`--to <locale>` picks the target when the site has more than one other
locale. An existing translation is skipped (or refused, for a single file)
unless you pass `--force`, so an interrupted folder run can simply be run
again. A translation counts as existing in any form the site treats as the
same item (`foo.md` for `foo.mdx`, or `foo/index.md`); `--force` replaces it
only at the same path and refuses to add a second form beside it.

## What it does for you

- **Places the file.** `content/posts/foo.mdx` becomes
  `content/zh/posts/foo.mdx`, so the two pair up for the language switch and
  `hreflang`.
- **Frontmatter.** It translates `title`, `subtitle`, `excerpt`,
  `description`, book `part` and `section` names and the words of a `text:`
  cover, including values written over several lines. It keeps
  dates, tags, slugs and flags as written: tags stay in the default language,
  because tag pages are shared across languages. It drops `redirectFrom`,
  since those aliases belong to the original and a second copy fails the
  build. Comments and quoting in the frontmatter are kept.
- **Code and math.** Fenced code blocks and `$$` math never reach the model.
  They are restored byte for byte, so comments in code stay in the original
  language.
- **Checks the reply.** If the translation lost or changed a code block, a
  heading level, a link or image URL (in Markdown or in an HTML `src`,
  `href`, `poster` or `srcset`), a wikilink target, inline code, a `:::`
  directive or an HTML tag, the file is not written and the differences are
  listed. Run it again, or pass `--force` to write it anyway and fix it by
  hand. A reply the provider cut off at its output limit is never written.
- **Files next to the content.** A folder post's files, and the local files a
  post links to, are copied into the locale tree. Files already there are kept,
  so an image you translated by hand is never overwritten.
- **Series and books.** Translating one post or chapter also translates the
  series or book index when the locale tree doesn't have one yet, because a
  locale series without an index doesn't appear. It warns when an index's
  `posts:` or `chapters` list names items with no translation yet: the build
  fails until they are translated or removed from the list.
- **Long posts** go to the model in parts of about 6,000 characters, split at
  `## ` headings, so each part's translation fits a typical output limit.

## Before you publish

- **Read every translation.** Check terminology, names and tone; machine
  translation needs a human read.
- **In-page links.** Heading ids follow the heading text, so `## Setup` and
  `## 设置` have different ids. The script lists the `#anchor` links that
  pointed at a translated heading; change them to the new ids.
- **Images with words in them** are copied as they are. Replace them with
  translated versions in the locale tree.
- **Share cards.** A title character outside the bundled Chinese font subset
  fails `tests/integration/og-images.test.ts`; rerun
  `scripts/build-og-fonts.py` as described in `CONTRIBUTING.md`.
- **Look at it.** Open the page under `/zh/` with `bun dev` and use the
  language switch to move between the two versions.

## Limits

- Flows can't be translated yet: locale trees don't support them.
- Only `.md` and `.mdx` files; reStructuredText is not supported.
- The content is sent to your provider and billed at its rates. Don't
  translate anything you can't share with it.

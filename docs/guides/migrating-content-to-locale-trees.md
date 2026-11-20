# Migrating existing content into a locale tree

For sites that published non-default-locale content at unprefixed URLs (e.g.
Chinese series living at `/my-series/…` on an English-default site) and want
it to live under its locale prefix (`/zh/my-series/…`).

## Steps

1. **Move the files, keeping paths relative to the tree root:**

   ```bash
   git mv content/series/my-series      content/zh/series/my-series
   git mv content/books/my-book         content/zh/books/my-book
   git mv content/posts/my-zh-post.md   content/zh/posts/my-zh-post.md
   ```

   No frontmatter changes are needed for the *language* — tree membership is
   the signal.

2. **Keep the old URLs alive.** Add each page's old unprefixed path to its
   frontmatter `redirectFrom` (series: on the index for `/series/<old>` and on
   each post for its old post URL):

   ```yaml
   redirectFrom:
     - "/my-series/some-post"
   ```

   The build generates redirect pages at the old unprefixed paths targeting
   the new `/zh/…` URLs. Collisions with real routes or other aliases fail
   the build.

3. **Build and spot-check** the old URLs redirect and the new `/zh/…` pages
   render.

## What to expect

- **Feeds:** moved items keep appearing (locale-tree originals are included in
  every feed), but their GUID is their URL — subscribers receive each moved
  item once more under its new `/zh/…` permalink. To avoid that, set each
  moved post's `feedId` to its old `<guid>`, copied from the published feed:

  ```yaml
  feedId: "https://example.com/my-series/some-post/"
  ```
- **Search/sitemap/graph:** the new URLs replace the old ones on the next
  build; the sitemap carries no entry for the old paths (they are redirect
  stubs).
- **Twins:** if you later add a default-locale translation at the same
  relative path (`content/series/my-series/…`), the two pair automatically —
  reciprocal hreflang, and the language switch navigates between them. The
  canonical then becomes the unprefixed URL.
- **Do not** point `redirectFrom` at locale-prefixed sources (`/zh/…`) — the
  locale segment is reserved and the build rejects it; alias pages exist at
  unprefixed paths only.

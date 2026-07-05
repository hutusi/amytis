/**
 * Cover-image path normalization shared by the post parsers (`parse.ts`) and
 * the book loader (`books.ts`).
 *
 * Leaf module by design (no sibling imports): both consumers sit on different
 * branches of the content layer's acyclic dependency graph
 * (types → io/cache → series-metadata → parse → posts → series → …), so the
 * shared helper must live below both — see `dependency-graph.test.ts`.
 */

/**
 * Resolve a frontmatter `coverImage` value to a public URL path.
 *
 * Values that are already resolvable are returned unchanged: http(s) URLs,
 * site-absolute `/...` paths, and `text:` pseudo-images (title-card covers
 * rendered without an image file). Anything else is treated as relative to
 * the content's public asset directory: a leading `./` is stripped and the
 * value is prefixed with `<publicBasePath>/` (e.g. `/posts/my-post` or
 * `/books/my-book`).
 */
export function normalizeCoverImage(
  coverImage: string | undefined,
  publicBasePath: string,
): string | undefined {
  if (!coverImage) return coverImage;
  if (
    coverImage.startsWith('http') ||
    coverImage.startsWith('/') ||
    coverImage.startsWith('text:')
  ) {
    return coverImage;
  }
  const cleanPath = coverImage.replace(/^\.\//, '');
  return `${publicBasePath}/${cleanPath}`;
}

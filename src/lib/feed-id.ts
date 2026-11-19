/**
 * A post's optional `feedId` frontmatter field: the id its RSS <guid> and
 * Atom <id> carry instead of the page URL. Readers key items on that id
 * forever, so an author who moves a post (slug rename, new series,
 * basePath or domain change) sets `feedId` to the id the post had before,
 * copied from the old feed, and subscribers don't see it again as new.
 *
 * Shared by the Markdown frontmatter schema and the rST docinfo parser, so
 * both formats accept exactly the same values.
 */

export const FEED_ID_HINT =
  'feedId must be an absolute URI, such as https://example.com/posts/old-slug/ ' +
  '(copy the post\'s old <guid> from your feed) or tag:example.com,2026:old-slug';

/**
 * Atom requires <id> to be an IRI, so the value must be an absolute URI: a
 * scheme, then no whitespace. It is used verbatim, with no trailing-slash
 * normalization, so a pre-2.0 bare-URL id can be restored exactly.
 */
export function isValidFeedId(value: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:\S+$/i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

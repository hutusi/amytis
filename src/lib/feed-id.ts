/**
 * A post's optional `feedId` frontmatter field: the id its RSS <guid> and
 * Atom <id> carry instead of the page URL. Readers key items on that id
 * forever, so an author who moves a post (slug rename, new series,
 * basePath or domain change) sets `feedId` to the id the post had before,
 * copied from the old feed, and subscribers don't see it again as new.
 *
 * Shared by the Markdown frontmatter schema and the rST docinfo parser, so
 * both formats accept exactly the same values.
 *
 * The value is treated as an OPAQUE id, not validated against the IRI
 * grammar (RFC 3987), and this is deliberate. Readers only ever compare
 * ids as strings; none parse them. What protects them is that the id is
 * written exactly as given: XML-escaped in every feed format, never
 * normalized (no trailing-slash fixing, no percent re-encoding), so a
 * pre-2.0 bare-URL id or any other old <guid> can be restored exactly.
 * Chasing the full IRI grammar (percent escapes, brackets by component,
 * fragment rules) added a check per corner case without protecting a
 * single reader, so only these rules remain:
 *
 * - It starts with a URI scheme (`https:`, `tag:`, `urn:`, ...). This keeps
 *   it absolute: a site-relative `/posts/old/` would be ambiguous, and old
 *   <guid>s are always absolute anyway.
 * - It contains no whitespace or control characters (C0, DEL, C1), no lone
 *   surrogates and no U+FFFE/U+FFFF. Those are invisible in the source,
 *   and the feed escapers strip the ones XML forbids (`stripXmlIllegal` in
 *   feed-utils.ts), so the id readers receive would silently differ from
 *   the one written here and never match the old <guid>.
 *
 * Everything else, including non-ASCII (posts with CJK slugs have raw
 * Unicode in their ids), passes through untouched.
 */

export const FEED_ID_HINT =
  'feedId must be an absolute id that starts with a URI scheme and has no spaces or control characters, ' +
  'such as https://example.com/posts/old-slug/ (copy the post\'s old <guid> from your feed) ' +
  'or tag:example.com,2026:old-slug';

const SCHEME = /^[a-z][a-z0-9+.-]*:./i;
const INVISIBLE_OR_STRIPPED = /[\s\p{Cc}\p{Cs}\uFFFE\uFFFF]/u;

export function isValidFeedId(value: string): boolean {
  return SCHEME.test(value) && !INVISIBLE_OR_STRIPPED.test(value);
}

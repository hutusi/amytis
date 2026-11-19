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
 *
 * Neither `\S` nor `new URL()` rejects control characters, and most are
 * illegal in XML: the feed escapers strip them (`stripXmlIllegal` in
 * feed-utils.ts), so the id readers receive would silently differ from
 * the one written here and never match the old <guid>. So control
 * characters (C0, DEL, C1), lone surrogates and the U+FFFE/U+FFFF
 * noncharacters fail validation instead. Other Unicode stays legal: ids of
 * posts with CJK slugs carry it raw.
 */
const XML_UNSAFE = /[\p{Cc}\p{Cs}\uFFFE\uFFFF]/u;

/**
 * Not an IRI (RFC 3987): a `%` that doesn't start a two-hex-digit escape,
 * or an ASCII character IRIs never carry raw. `new URL()` accepts both,
 * only flagging a non-fatal error and encoding them when it serializes,
 * but the feed emits the original string. Valid escapes such as `%25`
 * pass untouched: a permanent id is never normalized.
 */
const NOT_IRI = /%(?![0-9A-Fa-f]{2})|[<>"{}|\\^`]/;

export function isValidFeedId(value: string): boolean {
  if (XML_UNSAFE.test(value)) return false;
  if (NOT_IRI.test(value)) return false;
  if (!/^[a-z][a-z0-9+.-]*:\S+$/i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

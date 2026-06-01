import { visit } from 'unist-util-visit';
import type { Root, Link } from 'mdast';
import path from 'path';
import { getBookChapterUrl } from './urls';

export interface BookChapterLinksOptions {
  /** Slug of the book being rendered (passed to getBookChapterUrl). */
  bookSlug: string;
  /** Absolute path to the book directory (e.g. content/books/dmla). */
  bookDir: string;
  /** Absolute path of the chapter source file (e.g. content/books/dmla/maths/linear/introduction.md). */
  chapterSourcePath: string;
  /** Set of valid chapter ids for the book — used to validate link targets. */
  validChapterIds: ReadonlySet<string>;
}

const EXTERNAL_RE = /^(?:https?:|mailto:|tel:|ftp:|\/\/|#)/i;
const MD_LINK_RE = /\.(?:md|mdx)(?:#([^?]*))?$/i;

/**
 * Rewrites relative `.md` / `.mdx` links in a book chapter to canonical
 * `/books/<slug>/<chapter-id>/[#fragment]` URLs, so the cross-references that
 * exist in a VuePress source repo (where chapters live in nested folders and
 * link to each other via `[向量](vectors.md)` or `[张量](matrices.md#张量)`)
 * keep working after the content is imported flat into Amytis's book layout.
 *
 * Resolution strategy
 * ───────────────────
 * - Skip external links (http, mailto, //, hash-only).
 * - Strip an optional `#fragment` suffix; remember it for re-attachment.
 * - Resolve the remaining path relative to `chapterSourcePath`'s directory.
 * - Make the result relative to `bookDir`, drop the `.md`/`.mdx` extension,
 *   and treat the resulting POSIX path as the chapter id.
 * - Validate the id against `validChapterIds`.
 *   - If the link escapes the book directory, **throw** — that's almost
 *     always a real bug (typo in `../../../somewhere`).
 *   - If the chapter id is well-formed but not in the TOC (e.g. the author
 *     links to a chapter they haven't written yet, or that's commented out
 *     of the sidebar), **warn and leave the link unrewritten** instead of
 *     blocking the build. Matches the Shiki precedent in CLAUDE.md: a
 *     single broken cross-reference shouldn't fail a production deploy.
 *     The warning still surfaces in CI build logs.
 */
const warned = new Set<string>();
export default function remarkBookChapterLinks(options: BookChapterLinksOptions) {
  const { bookSlug, bookDir, chapterSourcePath, validChapterIds } = options;
  const chapterDir = path.dirname(chapterSourcePath);
  const bookDirResolved = path.resolve(bookDir);

  return (tree: Root) => {
    visit(tree, 'link', (node: Link) => {
      const url = node.url;
      if (!url || EXTERNAL_RE.test(url)) return;
      const match = MD_LINK_RE.exec(url);
      if (!match) return;

      // Split fragment from path.
      const hashIdx = url.indexOf('#');
      const fragment = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
      const pathPart = hashIdx >= 0 ? url.slice(0, hashIdx) : url;

      // Resolve to absolute, then back to a bookDir-relative POSIX path.
      // decodeURIComponent throws URIError on malformed `%XX`; swallow that
      // and fall back to the raw string so a single broken percent-encoded
      // link doesn't 500 the build (matches the broader "warn don't throw"
      // posture for stale cross-references below).
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(pathPart);
      } catch {
        decodedPath = pathPart;
      }
      const resolvedAbs = path.resolve(chapterDir, decodedPath);
      const inside =
        resolvedAbs === bookDirResolved ||
        resolvedAbs.startsWith(bookDirResolved + path.sep);
      if (!inside) {
        throw new Error(
          `[amytis] Book chapter link "${url}" in ${chapterSourcePath} resolves ` +
          `outside the book directory ${bookDirResolved}. Cross-book links are not supported.`
        );
      }

      const rel = path.relative(bookDirResolved, resolvedAbs).split(path.sep).join('/');
      const chapterId = rel.replace(/\.(?:md|mdx)$/i, '').replace(/\/index$/i, '');

      if (!validChapterIds.has(chapterId)) {
        const warnKey = `${bookSlug}::${chapterId}`;
        if (!warned.has(warnKey)) {
          warned.add(warnKey);
          console.warn(
            `[amytis] Book chapter link "${url}" in ${chapterSourcePath} points to ` +
            `chapter id "${chapterId}", which is not in book "${bookSlug}"'s TOC. ` +
            `Leaving link unrewritten — it will 404 if clicked. To fix, add the ` +
            `chapter to index.mdx or remove the link.`
          );
        }
        return;
      }

      node.url = fragment
        ? `${getBookChapterUrl(bookSlug, chapterId)}#${fragment}`
        : getBookChapterUrl(bookSlug, chapterId);
    });
  };
}

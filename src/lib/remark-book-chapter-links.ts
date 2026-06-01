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
 * - Validate the id against `validChapterIds`. If absent, throw — broken
 *   inter-chapter links are a build-time error (strict-build invariant).
 */
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
      const resolvedAbs = path.resolve(chapterDir, decodeURIComponent(pathPart));
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
        throw new Error(
          `[amytis] Book chapter link "${url}" in ${chapterSourcePath} points to ` +
          `chapter id "${chapterId}", which is not declared in the book's TOC. ` +
          `Either add it to index.mdx's chapters list or remove the link.`
        );
      }

      node.url = fragment
        ? `${getBookChapterUrl(bookSlug, chapterId)}#${fragment}`
        : getBookChapterUrl(bookSlug, chapterId);
    });
  };
}

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { getAllBooks, getBookData, getFeaturedBooks } from '../../src/lib/content/books';
import { setEnvVar, restoreEnvVar } from "../helpers/env";

describe("Integration: Books", () => {
  test("getAllBooks returns an array", () => {
    const books = getAllBooks();
    expect(Array.isArray(books)).toBe(true);
  });

  test("getAllBooks entries have required fields", () => {
    const books = getAllBooks();
    books.forEach((book) => {
      expect(typeof book.slug).toBe("string");
      expect(book.slug.length).toBeGreaterThan(0);
      expect(typeof book.title).toBe("string");
      expect(book.title.length).toBeGreaterThan(0);
      expect(typeof book.date).toBe("string");
      expect(Array.isArray(book.authors)).toBe(true);
      expect(Array.isArray(book.chapters)).toBe(true);
      expect(typeof book.featured).toBe("boolean");
      expect(typeof book.draft).toBe("boolean");
    });
  });

  test("getAllBooks is sorted newest first", () => {
    const books = getAllBooks();
    for (let i = 1; i < books.length; i++) {
      expect(books[i - 1].date >= books[i].date).toBe(true);
    }
  });

  test("getFeaturedBooks returns only books with featured: true", () => {
    const featured = getFeaturedBooks();
    featured.forEach((book) => {
      expect(book.featured).toBe(true);
    });
  });

  test("getFeaturedBooks is a subset of getAllBooks", () => {
    const all = getAllBooks();
    const featured = getFeaturedBooks();
    expect(featured.length).toBeLessThanOrEqual(all.length);
    const allSlugs = new Set(all.map((b) => b.slug));
    featured.forEach((book) => {
      expect(allSlugs.has(book.slug)).toBe(true);
    });
  });

  test("getAllBooks excludes drafts in production", () => {
    const prev = process.env.NODE_ENV;
    setEnvVar("NODE_ENV", "production");
    try {
      const books = getAllBooks();
      books.forEach((book) => {
        expect(book.draft).toBe(false);
      });
    } finally {
      restoreEnvVar("NODE_ENV", prev);
    }
  });

  test("getBookData throws at build time when a TOC chapter has no file on disk", () => {
    // Strict-build invariant: a misconfigured TOC must fail the export, not
    // emit a book with broken chapter links.
    const slug = "__test-missing-chapter__";
    const bookDir = path.join(process.cwd(), "content", "books", slug);
    fs.mkdirSync(bookDir, { recursive: true });
    fs.writeFileSync(
      path.join(bookDir, "index.mdx"),
      [
        "---",
        'title: "Broken TOC Book"',
        "date: 2026-01-01",
        "chapters:",
        '  - title: "Ghost Chapter"',
        "    id: does-not-exist",
        "---",
        "",
        "Intro",
        "",
      ].join("\n"),
      "utf8",
    );

    try {
      expect(() => getBookData(slug)).toThrow(/no matching file on disk.*"does-not-exist"/);
    } finally {
      fs.rmSync(bookDir, { recursive: true, force: true });
    }
  });

  test("getBookData throws on invalid frontmatter instead of silently skipping", () => {
    // Strict-build invariant: a malformed book index must fail the export, not
    // silently vanish (consistent with the missing-chapter throw above).
    const slug = "__test-bad-frontmatter__";
    const bookDir = path.join(process.cwd(), "content", "books", slug);
    fs.mkdirSync(bookDir, { recursive: true });
    fs.writeFileSync(
      path.join(bookDir, "index.mdx"),
      // `title` is required by BookSchema; omitting it must throw.
      ["---", "date: 2026-01-01", "chapters: []", "---", "", "Intro", ""].join("\n"),
      "utf8",
    );

    try {
      expect(() => getBookData(slug)).toThrow(/Invalid book frontmatter/);
    } finally {
      fs.rmSync(bookDir, { recursive: true, force: true });
    }
  });
});

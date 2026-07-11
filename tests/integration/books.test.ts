import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { getAllBooks, getBookData, getBookChapter, getFeaturedBooks } from '../../src/lib/content/books';
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

  test("draft chapters are dropped from chapters/toc/prev-next in production", () => {
    // getBookChapter 404s a draft chapter in production, so the book's
    // chapter list and TOC must not advertise it — published neighbors would
    // otherwise render dead prev/next and sidebar links.
    const slug = "__test-draft-chapter__";
    const bookDir = path.join(process.cwd(), "content", "books", slug);
    fs.mkdirSync(bookDir, { recursive: true });
    fs.writeFileSync(
      path.join(bookDir, "index.mdx"),
      [
        "---",
        'title: "Draft Chapter Book"',
        "date: 2026-01-01",
        "chapters:",
        '  - title: "One"',
        "    id: ch1",
        '  - title: "Two (draft)"',
        "    id: ch2",
        '  - title: "Three"',
        "    id: ch3",
        "---",
        "",
        "Intro",
        "",
      ].join("\n"),
      "utf8",
    );
    const chapterBody = (draft: boolean) =>
      ["---", `draft: ${draft}`, "---", "", "Body.", ""].join("\n");
    fs.writeFileSync(path.join(bookDir, "ch1.md"), chapterBody(false), "utf8");
    fs.writeFileSync(path.join(bookDir, "ch2.md"), chapterBody(true), "utf8");
    fs.writeFileSync(path.join(bookDir, "ch3.md"), chapterBody(false), "utf8");

    const prev = process.env.NODE_ENV;
    try {
      // Dev: drafts stay visible (same policy as posts/flows).
      const devBook = getBookData(slug);
      expect(devBook!.chapters.map((c) => c.id)).toEqual(["ch1", "ch2", "ch3"]);

      setEnvVar("NODE_ENV", "production");
      const prodBook = getBookData(slug);
      expect(prodBook!.chapters.map((c) => c.id)).toEqual(["ch1", "ch3"]);
      expect(JSON.stringify(prodBook!.toc)).not.toContain("ch2");

      const ch3 = getBookChapter(slug, "ch3");
      expect(ch3!.prevChapter!.id).toBe("ch1");
      const ch1 = getBookChapter(slug, "ch1");
      expect(ch1!.nextChapter!.id).toBe("ch3");
    } finally {
      restoreEnvVar("NODE_ENV", prev);
      fs.rmSync(bookDir, { recursive: true, force: true });
    }
  });

  test("getAllBooks is memoized in production (stable reference across calls)", () => {
    // Build-perf: getAllBooks runs from the root layout, so on a static export
    // it must not re-read + re-parse every book index per page.
    const prev = process.env.NODE_ENV;
    setEnvVar("NODE_ENV", "production");
    try {
      const a = getAllBooks();
      const b = getAllBooks();
      expect(a).toBe(b); // same reference ⇒ memoized, not recomputed
    } finally {
      restoreEnvVar("NODE_ENV", prev);
    }
  });
});

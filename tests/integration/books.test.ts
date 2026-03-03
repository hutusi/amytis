import { describe, expect, test } from "bun:test";
import { getAllBooks, getFeaturedBooks } from "../../src/lib/markdown";

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
    process.env.NODE_ENV = "production";
    try {
      const books = getAllBooks();
      books.forEach((book) => {
        expect(book.draft).toBe(false);
      });
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

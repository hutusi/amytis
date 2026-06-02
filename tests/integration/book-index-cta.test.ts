import { describe, expect, test } from "bun:test";
import BookLandingPage from "@/app/books/[slug]/page";
import { renderAsync } from "@/test-utils/render";
import { getBookData } from "@/lib/markdown";
import { getBookChapterUrl } from "@/lib/urls";

// Renders the actual book landing page server component for a real fixture
// book under content/books/. The page is async (calls getBookData internally)
// so we use the project's renderAsync helper — same pattern as
// tests/integration/book-chapter-links.test.ts. Catches the regression
// modes that pure-helper tests can't: someone removes the secondary CTA
// from the JSX, or changes the href format and drops ?immersive=1.

const FIXTURE_BOOK_SLUG = "sample-book";

describe("Integration: book index Immersive reading CTA", () => {
  test("renders an Immersive reading CTA linking to the first chapter with ?immersive=1", async () => {
    const book = getBookData(FIXTURE_BOOK_SLUG);
    if (!book || book.chapters.length === 0) {
      throw new Error(
        `Fixture book "${FIXTURE_BOOK_SLUG}" not found or has no chapters — this test depends on it`,
      );
    }
    const firstChapter = book.chapters[0];
    const expectedHref = `${getBookChapterUrl(book.slug, firstChapter.id)}?immersive=1`;

    const html = await renderAsync(
      BookLandingPage({ params: Promise.resolve({ slug: FIXTURE_BOOK_SLUG }) }),
    );

    expect(html).toContain(`href="${expectedHref}"`);
  });

  test("primary 'Start reading' CTA still renders alongside the immersive CTA", async () => {
    // Guard against accidentally replacing (rather than supplementing) the
    // primary CTA when editing this region of the page in the future.
    const book = getBookData(FIXTURE_BOOK_SLUG);
    if (!book || book.chapters.length === 0) {
      throw new Error(
        `Fixture book "${FIXTURE_BOOK_SLUG}" not found or has no chapters`,
      );
    }
    const firstChapter = book.chapters[0];
    const primaryHref = getBookChapterUrl(book.slug, firstChapter.id);

    const html = await renderAsync(
      BookLandingPage({ params: Promise.resolve({ slug: FIXTURE_BOOK_SLUG }) }),
    );

    // Plain href (no ?immersive flag) for the primary "Start reading" button.
    expect(html).toContain(`href="${primaryHref}"`);
  });
});

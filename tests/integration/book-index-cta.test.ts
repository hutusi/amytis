import { describe, expect, test } from "bun:test";
import BookLandingPage from "@/app/books/[slug]/page";
import { renderAsync } from "@/test-utils/render";
import { getBookData } from "@/lib/markdown";
import { t } from "@/lib/i18n";
import { getBookChapterUrl } from "@/lib/urls";

// Renders the actual book landing page server component for a real fixture
// book under content/books/. The page is async (calls getBookData internally)
// so we use the project's renderAsync helper — same pattern as
// tests/integration/book-chapter-links.test.ts. Catches the regression
// modes that pure-helper tests can't: someone removes either CTA from the
// JSX, or changes the href format and drops ?immersive=1.

const FIXTURE_BOOK_SLUG = "sample-book";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns the inner HTML of the smallest <a> element on the page whose href
// attribute equals the given value, or null if no such anchor exists. We
// match the anchor body rather than just `href="..."` so the label-text
// assertion is bound to the same element — otherwise an unrelated link with
// the same href (e.g. a TOC chapter row pointing at the first chapter) would
// satisfy a naïve `toContain('href="..."')` check and let an accidentally
// deleted CTA pass.
function findAnchorBodyByHref(html: string, href: string): string | null {
  const re = new RegExp(`<a[^>]*\\bhref="${escapeRegex(href)}"[^>]*>([\\s\\S]*?)</a>`);
  const m = html.match(re);
  return m ? m[1] : null;
}

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

    const body = findAnchorBodyByHref(html, expectedHref);
    expect(body).not.toBeNull();
    // Label text is rendered inside the same anchor — guards against the
    // anchor existing but having been repurposed to a different CTA.
    expect(body).toContain(t("immersive_reading"));
  });

  test("primary 'Start reading' CTA still renders alongside the immersive CTA", async () => {
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

    // Multiple links may share this href (TOC rows also point at the first
    // chapter), so iterate over all matches and confirm at least one of them
    // is the CTA — the one containing the start_reading label text.
    const re = new RegExp(
      `<a[^>]*\\bhref="${escapeRegex(primaryHref)}"[^>]*>([\\s\\S]*?)</a>`,
      "g",
    );
    const label = t("start_reading");
    let foundCta = false;
    for (const match of html.matchAll(re)) {
      if (match[1].includes(label)) {
        foundCta = true;
        break;
      }
    }
    expect(foundCta).toBe(true);
  });
});

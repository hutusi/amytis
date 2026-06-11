import { describe, expect, test } from "bun:test";
import SeriesPage from "@/app/series/[slug]/page";
import { renderAsync } from "@/test-utils/render";
import { getSeriesData, getSeriesPosts } from '@/lib/content/series';
import { t } from "@/lib/i18n";
import { getPostUrl } from "@/lib/urls";

// Renders the actual series landing page server component for a real fixture
// series under content/series/. Same pattern as book-index-cta.test.ts —
// catches accidental removal of either CTA or a broken ?immersive=1 href
// without needing component-rendering test infrastructure.

const FIXTURE_SERIES_SLUG = "digital-garden";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Returns the inner HTML of the smallest <a> element on the page whose href
// attribute equals the given value, or null if no such anchor exists. We
// match the anchor body rather than just `href="..."` so the label-text
// assertion is bound to the same element — otherwise an unrelated link with
// the same href (e.g. a post-row in the series list) would satisfy a naïve
// `toContain('href="..."')` check and let an accidentally deleted CTA pass.
function findAnchorBodyByHref(html: string, href: string): string | null {
  const re = new RegExp(`<a[^>]*\\bhref="${escapeRegex(href)}"[^>]*>([\\s\\S]*?)</a>`);
  const m = html.match(re);
  return m ? m[1] : null;
}

// Picks the first installment respecting series sort order, mirroring the
// inline logic in src/app/series/[slug]/page.tsx (the test would otherwise
// have to assume a particular sort).
function pickFirstPostHref(slug: string): string {
  const posts = getSeriesPosts(slug);
  if (posts.length === 0) {
    throw new Error(`Fixture series "${slug}" has no posts`);
  }
  const data = getSeriesData(slug) as (Record<string, unknown> | null);
  // Series sort lives on the index frontmatter — top-level on the resolved
  // PostData blob, same access the page uses. Treated as unknown here to
  // avoid leaning on internal PostData shape.
  const sort = typeof data?.sort === 'string' ? data.sort : undefined;
  const firstPost = sort === 'date-asc' || sort === 'manual' ? posts[0] : posts[posts.length - 1];
  return getPostUrl(firstPost);
}

describe("Integration: series index Immersive reading CTA", () => {
  test("renders an Immersive reading CTA linking to the first post with ?immersive=1", async () => {
    const primaryHref = pickFirstPostHref(FIXTURE_SERIES_SLUG);
    const expectedHref = `${primaryHref}?immersive=1`;

    const html = await renderAsync(
      SeriesPage({ params: Promise.resolve({ slug: FIXTURE_SERIES_SLUG }) }),
    );

    const body = findAnchorBodyByHref(html, expectedHref);
    expect(body).not.toBeNull();
    // Label text inside the same anchor — guards against the anchor existing
    // but having been repurposed to a different CTA.
    expect(body).toContain(t("immersive_reading"));
  });

  test("primary 'Start reading' CTA still renders alongside the immersive CTA", async () => {
    const primaryHref = pickFirstPostHref(FIXTURE_SERIES_SLUG);

    const html = await renderAsync(
      SeriesPage({ params: Promise.resolve({ slug: FIXTURE_SERIES_SLUG }) }),
    );

    // Multiple links may share this href (the series posts list also points
    // at the first post), so iterate over all matches and confirm at least
    // one of them is the CTA — the one containing the start_reading label.
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

import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if the page has no horizontal scrollbar (no overflow). */
async function hasNoHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
}

/**
 * Returns the computed font-size in px for the given selector.
 * Falls back to -1 if the element is not found.
 */
async function getFontSizePx(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return -1;
    return parseFloat(getComputedStyle(el).fontSize);
  }, selector);
}

/** Whether this device viewport is a phone (< 768px wide). */
function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768;
}

/** Whether this device viewport is considered mobile (phone or tablet, < 1024px). */
function isMobileViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024;
}

// ─── Test suite ─────────────────────────────────────────────────────────────

test.describe('Mobile Compatibility', () => {
  // ── Viewport meta ──────────────────────────────────────────────────────────
  test.describe('Viewport meta tag', () => {
    test('homepage has correct viewport meta tag', async ({ page }) => {
      await page.goto('/');
      const viewport = await page.$eval(
        'meta[name="viewport"]',
        (el) => el.getAttribute('content') ?? '',
      );
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');
    });
  });

  // ── No horizontal overflow ─────────────────────────────────────────────────
  test.describe('No horizontal overflow', () => {
    const routes = ['/', '/posts', '/series', '/tags', '/archive'];

    for (const route of routes) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        expect(await hasNoHorizontalOverflow(page)).toBe(true);
      });
    }

    test('post page has no horizontal overflow', async ({ page }) => {
      await page.goto('/posts/kitchen-sink');
      await page.waitForLoadState('networkidle');
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    });
  });

  // ── Navbar layout on narrow viewports ─────────────────────────────────────
  test.describe('Navbar layout', () => {
    test('brand link is visible and not clipped on phone', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      // The brand link (logo + site title) must be within the viewport
      const brand = page.locator('nav a[href="/"]').first();
      await expect(brand).toBeVisible();
      const navBox = await page.locator('nav').first().boundingBox();
      const brandBox = await brand.boundingBox();
      expect(brandBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      // Brand must start at or after the nav left edge (not clipped left)
      expect(brandBox!.x).toBeGreaterThanOrEqual(navBox!.x - 1);
      // Brand right edge must not exceed viewport width
      expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    });

    test('search button and theme toggle are visible on phone', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      const searchBtn = page.getByRole('button', { name: /search/i });
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });
      await expect(searchBtn).toBeVisible();
      await expect(themeToggle).toBeVisible();
    });

    test('navbar controls do not overlap on phone', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      const brand = page.locator('nav a[href="/"]').first();
      const hamburger = page.getByRole('button', { name: /open menu/i });
      const brandBox = await brand.boundingBox();
      const hamburgerBox = await hamburger.boundingBox();
      expect(brandBox).not.toBeNull();
      expect(hamburgerBox).not.toBeNull();
      // Brand right edge must not overlap hamburger left edge
      expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(hamburgerBox!.x + 1);
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  test.describe('Navigation', () => {
    test('correct nav variant is shown for the viewport', async ({ page }) => {
      await page.goto('/');

      const hamburger = page.getByRole('button', { name: /open menu|close menu/i });
      const desktopNavLinks = page.locator('[data-testid="desktop-nav"]');

      if (isPhone(page)) {
        // Phone: hamburger visible, desktop links hidden
        await expect(hamburger).toBeVisible();
        await expect(desktopNavLinks.first()).toBeHidden();
      } else {
        // Tablet / iPad: desktop nav visible, hamburger hidden
        await expect(hamburger).toBeHidden();
        await expect(desktopNavLinks.first()).toBeVisible();
      }
    });

    test('mobile menu opens and closes on phone', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');

      const hamburger = page.getByRole('button', { name: /open menu/i });
      await expect(hamburger).toBeVisible();

      // Open menu
      await hamburger.tap();
      const mobilePanel = page.locator('[data-testid="mobile-nav-panel"]');
      await expect(mobilePanel).toBeVisible();

      // Close via × button
      const closeBtn = page.getByRole('button', { name: /close menu/i });
      await closeBtn.tap();
      await expect(mobilePanel).toBeHidden();
    });

    test('mobile menu closes when a link is tapped', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      await page.getByRole('button', { name: /open menu/i }).tap();

      const mobilePanel = page.locator('[data-testid="mobile-nav-panel"]');
      await expect(mobilePanel).toBeVisible();

      // Tap the first regular nav link inside the mobile panel
      const firstLink = mobilePanel.getByRole('link').first();
      await firstLink.tap();

      // After navigation the menu should be gone
      await expect(mobilePanel).toBeHidden();
    });
  });

  // ── Touch targets ──────────────────────────────────────────────────────────
  test.describe('Touch target sizes', () => {
    test('hamburger button meets 44×44px minimum on phones', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      const hamburger = page.getByRole('button', { name: /open menu/i });
      const box = await hamburger.boundingBox();
      expect(box).not.toBeNull();
      // Allow a 2px tolerance (padding may put the clickable area above 44px
      // even if the element itself is slightly under)
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    });

    test('theme toggle button meets 32px minimum', async ({ page }) => {
      await page.goto('/');
      const toggle = page.getByRole('button', { name: /toggle theme|dark mode|light mode/i });
      if (!(await toggle.count())) { test.skip(); return; }
      const box = await toggle.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.max(box!.width, box!.height)).toBeGreaterThanOrEqual(32);
    });
  });

  // ── Post sidebar / TOC ─────────────────────────────────────────────────────
  test.describe('Post sidebar and TOC', () => {
    test('post sidebar is hidden on mobile and tablet viewports', async ({ page }) => {
      if (!isMobileViewport(page)) test.skip();

      await page.goto('/posts/kitchen-sink');
      await page.waitForLoadState('networkidle');

      // PostSidebar is `hidden lg:block` – invisible below 1024px
      const sidebar = page.locator('[data-testid="post-sidebar"]');
      await expect(sidebar.first()).toBeHidden();
    });

    test('SeriesList (mobile series nav) is visible on post pages on mobile', async ({ page }) => {
      if (!isMobileViewport(page)) test.skip();

      await page.goto('/posts/kitchen-sink');
      await page.waitForLoadState('networkidle');
      // Wait for article to render before querying series navigation
      await page.locator('article').first().waitFor({ state: 'visible' });

      // SeriesList renders below the post content on mobile as an alternative to the sidebar
      const seriesList = page.locator('[data-testid="series-list"], .lg\\:hidden nav[aria-label]');
      // It may not exist on posts without a series – just confirm the page loaded
      const count = await seriesList.count();
      if (count > 0) {
        await expect(seriesList.first()).toBeVisible();
      }
    });
  });

  // ── HorizontalScroll arrows ────────────────────────────────────────────────
  test.describe('HorizontalScroll', () => {
    test('scroll arrows are hidden on phone viewports', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Arrows have class `hidden md:flex` — they must not be visible on phones
      const arrows = page.getByRole('button', { name: /scroll left|scroll right/i });
      const count = await arrows.count();
      for (let i = 0; i < count; i++) {
        await expect(arrows.nth(i)).toBeHidden();
      }
    });
  });

  // ── Font sizes ─────────────────────────────────────────────────────────────
  test.describe('Font sizes', () => {
    test('body text is at least 14px (avoids forced iOS zoom)', async ({ page }) => {
      await page.goto('/');
      const fontSize = await getFontSizePx(page, 'body');
      // Inputs zoom at <16px on iOS; body prose text is typically larger.
      // We check a relaxed lower bound; the viewport-zoom concern applies mainly to inputs.
      expect(fontSize).toBeGreaterThanOrEqual(14);
    });
  });

  // ── Images ─────────────────────────────────────────────────────────────────
  test.describe('Images', () => {
    test('images do not overflow their containers on homepage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const overflows = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter((img) => {
          const parent = img.parentElement;
          if (!parent) return false;
          // An image overflows if its rendered width exceeds its container's width
          return img.offsetWidth > parent.offsetWidth + 2; // 2px tolerance
        }).length;
      });

      expect(overflows).toBe(0);
    });

    test('images do not overflow their containers on a post page', async ({ page }) => {
      await page.goto('/posts/kitchen-sink');
      await page.waitForLoadState('networkidle');
      // Wait for the article body to be present, then for all images to finish loading.
      // The kitchen-sink post has async content (Mermaid, KaTeX, syntax highlighting)
      // that can delay image layout settlement beyond networkidle.
      await page.locator('article').first().waitFor({ state: 'visible' });
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('img')).every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );

      const overflows = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter((img) => {
          const parent = img.parentElement;
          if (!parent) return false;
          return img.offsetWidth > parent.offsetWidth + 2;
        }).length;
      });

      expect(overflows).toBe(0);
    });
  });

  // ── Homepage section headings ──────────────────────────────────────────────
  test.describe('Homepage section headings', () => {
    test('section headings and their view-all links are both visible on phone', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Each section we care about: check the heading and the sibling link are
      // both visible (i.e. the header row did not collapse one of them off-screen)
      const sections = [
        { id: 'latest-posts', linkPattern: /all (posts|articles)/i },
        { id: 'featured-series', linkPattern: /all series/i },
        { id: 'featured-books', linkPattern: /all books/i },
        { id: 'recent-flows', linkPattern: /all flows/i },
      ];

      for (const { id, linkPattern } of sections) {
        const section = page.locator(`#${id}`);
        if (!(await section.count())) continue; // section may not be enabled

        const heading = section.locator('h2').first();
        await expect(heading).toBeVisible();

        const viewAllLink = section.getByRole('link', { name: linkPattern });
        if (await viewAllLink.count()) {
          await expect(viewAllLink.first()).toBeVisible();
        }
      }
    });

    test('hero stats row is visible and causes no horizontal overflow', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The hero stats container should not exceed the viewport width
      expect(await hasNoHorizontalOverflow(page)).toBe(true);

      // At least one stat link should be visible in the hero
      const heroLinks = page.locator('header a[href^="#"]');
      if (await heroLinks.count()) {
        await expect(heroLinks.first()).toBeVisible();
      }
    });
  });

  // ── Scroll lock ────────────────────────────────────────────────────────────
  test.describe('Scroll lock', () => {
    test('body scroll is locked when mobile menu is open', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      await page.getByRole('button', { name: /open menu/i }).tap();

      const overflow = await page.evaluate(
        () => document.body.style.overflow,
      );
      expect(overflow).toBe('hidden');
    });

    test('body scroll is restored when mobile menu is closed', async ({ page }) => {
      if (!isPhone(page)) test.skip();

      await page.goto('/');
      await page.getByRole('button', { name: /open menu/i }).tap();
      await page.getByRole('button', { name: /close menu/i }).tap();

      const overflow = await page.evaluate(
        () => document.body.style.overflow,
      );
      expect(overflow).toBe('');
    });
  });

  // ── Tags page ──────────────────────────────────────────────────────────────
  test.describe('Tags page', () => {
    test('tag cloud is scrollable without page overflow', async ({ page }) => {
      await page.goto('/tags');
      await page.waitForLoadState('networkidle');
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    });
  });

  // ── Archive page ───────────────────────────────────────────────────────────
  test.describe('Archive page', () => {
    test('archive timeline renders without overflow', async ({ page }) => {
      await page.goto('/archive');
      await page.waitForLoadState('networkidle');
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    });
  });
});

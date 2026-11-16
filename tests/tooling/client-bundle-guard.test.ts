import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

/**
 * Bytes that every page would download again if they crept back in. Each
 * case names what it cost and where the reasoning lives.
 */
// Search.tsx (in the navbar on every page) may import SearchPanel only
// dynamically, and its types; a value import of the panel or what only the
// panel needs would put the whole results UI back on every page.
const PANEL_ONLY = ['@/components/SearchPanel', '@/components/SearchResults', '@/hooks/usePagefind', '@/lib/search-utils'];
const staticValueImports = (source: string) =>
  [...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);

describe('client bundle guards', () => {
  test('tailwind-merge stays out: cn() is clsx-only', () => {
    // It cost 8.6KB gzip on most pages for a single class conflict; see the
    // doc comment in src/lib/cn.ts before reaching for it again.
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps)).not.toContain('tailwind-merge');
  });

  test.each(['src/components/Search.tsx', 'src/components/Navbar.tsx'])(
    '%s loads the search panel only on demand',
    (file) => {
      const source = fs.readFileSync(file, 'utf8');
      expect(staticValueImports(source).filter((spec) => PANEL_ONLY.includes(spec))).toEqual([]);
      if (file.endsWith('Search.tsx')) expect(source).toContain("import('@/components/SearchPanel')");
    },
  );

  test('slide decks load their interactive runtime only on demand', () => {
    // Client components imported by MarkdownRenderer share one chunk per
    // route, so a static import would ship the runtime to every article
    // page; only pages that render a deck should fetch it (docs/SLIDES.md).
    const deck = fs.readFileSync('src/components/SlideDeck.tsx', 'utf8');
    expect(deck).not.toMatch(/^['"]use client['"]/m);
    const gate = fs.readFileSync('src/components/SlideDeckControls.tsx', 'utf8');
    expect(gate).toContain("import('@/components/SlideDeckRuntime')");
    for (const file of ['src/components/MarkdownRenderer.tsx', 'src/components/SlideDeck.tsx', 'src/components/SlideDeckControls.tsx']) {
      expect(staticValueImports(fs.readFileSync(file, 'utf8'))).not.toContain('@/components/SlideDeckRuntime');
    }
    // A CSS import anywhere in the article module graph is linked on every
    // article page (the KaTeX lesson in CLAUDE.md).
    for (const file of ['src/components/SlideDeck.tsx', 'src/components/SlideDeckControls.tsx', 'src/components/SlideDeckRuntime.tsx']) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/^import\s+[^;]*['"][^'"]+\.css['"]/m);
    }
  });

  test('the import scan sees value imports and skips type-only ones', () => {
    expect(staticValueImports(`import SearchPanel from '@/components/SearchPanel';`)).toEqual(['@/components/SearchPanel']);
    expect(staticValueImports(`import { usePagefind } from '@/hooks/usePagefind';`)).toEqual(['@/hooks/usePagefind']);
    expect(staticValueImports(`import type { SearchPanelHandle } from '@/components/SearchPanel';`)).toEqual([]);
  });
});

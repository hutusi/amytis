import { describe, test, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { getSeriesPosts, getCollectionPosts } from '@/lib/content/series';

/**
 * Strict-build invariant: a manual series order or collection item that
 * references a slug matching nothing in the content tree must throw at
 * build time, not silently drop the post (mirrors books' missing-chapter
 * throw). Posts that exist but are unpublished (draft in production,
 * future-dated) are still skipped silently — that path is exercised by
 * the production build, not here (dev keeps drafts visible).
 *
 * Fixtures use fresh series slugs so the keyed memos compute them fresh;
 * cleanup runs in finally so an interrupted run leaves no state behind.
 */

const seriesRoot = path.join(process.cwd(), 'content', 'series');

function writeSeriesFixture(slug: string, frontmatterLines: string[]): string {
  const dir = path.join(seriesRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.md'),
    ['---', ...frontmatterLines, '---', '', 'Test fixture body.', ''].join('\n'),
    'utf8',
  );
  return dir;
}

describe('strict series/collection slug resolution', () => {
  test('manual series order throws on a slug that matches no post', () => {
    const slug = '__test-manual-missing__';
    const dir = writeSeriesFixture(slug, [
      'title: "Manual Missing Fixture"',
      'date: "2026-01-01"',
      'sort: "manual"',
      'posts: ["__test-no-such-post__"]',
    ]);

    try {
      expect(() => getSeriesPosts(slug)).toThrow(/lists post "__test-no-such-post__"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('collection throws on an item that matches no post', () => {
    const slug = '__test-collection-missing__';
    const dir = writeSeriesFixture(slug, [
      'type: collection',
      'title: "Collection Missing Fixture"',
      'date: "2026-01-01"',
      'items:',
      '  - post: __test-no-such-post__',
    ]);

    try {
      expect(() => getCollectionPosts(slug)).toThrow(/lists item "__test-no-such-post__"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('collection throws on a qualified series/slug item that matches no post', () => {
    const slug = '__test-collection-qualified__';
    const dir = writeSeriesFixture(slug, [
      'type: collection',
      'title: "Collection Qualified Fixture"',
      'date: "2026-01-01"',
      'items:',
      '  - post: no-such-series/__test-no-such-post__',
    ]);

    try {
      expect(() => getCollectionPosts(slug)).toThrow(/lists item "no-such-series\/__test-no-such-post__"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

/**
 * Next.js REPLACES a parent's `alternates` / `twitter` objects instead of
 * merging them, so a route that hand-builds `alternates: { … }` silently
 * drops the site's RSS/Atom autodiscovery links. Routes go through
 * `withSiteAlternates()` / `buildArticleMetadata()` (or
 * `buildRedirectMetadata()` for redirect stubs) from src/lib/metadata.ts.
 */

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

const routeFiles = walk('src/app').filter((f) => !f.endsWith('sitemap.ts'));

describe('metadata helper guard', () => {
  test('no route hand-builds an alternates object', () => {
    const offenders = routeFiles.filter((f) => /alternates:\s*\{/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  test('every route that renders a RedirectPage marks it with buildRedirectMetadata', () => {
    const offenders = routeFiles.filter((f) => {
      const src = fs.readFileSync(f, 'utf8');
      return src.includes('<RedirectPage') && !src.includes('buildRedirectMetadata(');
    });
    expect(offenders).toEqual([]);
  });
});

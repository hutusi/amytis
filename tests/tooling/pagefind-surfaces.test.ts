import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

/**
 * Pagefind indexes only `data-pagefind-body` regions, and once ANY page marks
 * one, every page without a marked region is dropped from the index. These
 * are the content surfaces that must stay searchable; a new detail surface
 * belongs on this list.
 */
const SEARCHABLE_SURFACES = [
  'src/layouts/PostLayout.tsx',
  'src/layouts/SimpleLayout.tsx',
  'src/components/page-bodies/NoteDetailBody.tsx',
  'src/app/flows/[year]/[month]/[day]/page.tsx',
  'src/components/BookReadingShell.tsx',
  'src/components/page-bodies/BookLandingBody.tsx',
  'src/components/page-bodies/SeriesLandingBody.tsx',
];

describe('Pagefind index scope', () => {
  test.each(SEARCHABLE_SURFACES)('%s marks its indexed region and title', (file) => {
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toContain('data-pagefind-body');
  });

  test('surface titles come from their h1', () => {
    for (const file of [...SEARCHABLE_SURFACES.filter((f) => !f.endsWith('SimpleLayout.tsx')), 'src/components/SimpleLayoutHeader.tsx']) {
      expect(fs.readFileSync(file, 'utf8')).toMatch(/<h1 data-pagefind-meta="title"/);
    }
  });

  test('redirect stubs are excluded', () => {
    expect(fs.readFileSync('src/components/RedirectPage.tsx', 'utf8')).toContain('data-pagefind-ignore="all"');
  });
});

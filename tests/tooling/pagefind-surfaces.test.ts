import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';
import { SEARCH_TYPE_FILTER, type ResultType } from '@/lib/search-utils';

/**
 * Pagefind indexes only `data-pagefind-body` regions, and once ANY page marks
 * one, every page without a marked region is dropped from the index. These
 * are the content surfaces that must stay searchable; a new detail surface
 * belongs on this list.
 */
const SURFACE_TYPES: Record<string, ResultType> = {
  'src/layouts/PostLayout.tsx': 'Post',
  'src/layouts/SimpleLayout.tsx': 'Post',
  'src/components/page-bodies/NoteDetailBody.tsx': 'Note',
  'src/app/flows/[year]/[month]/[day]/page.tsx': 'Flow',
  'src/components/BookReadingShell.tsx': 'Book',
  'src/components/page-bodies/BookLandingBody.tsx': 'Book',
  'src/components/page-bodies/SeriesLandingBody.tsx': 'Post',
};
const SEARCHABLE_SURFACES = Object.keys(SURFACE_TYPES);

describe('Pagefind index scope', () => {
  test.each(SEARCHABLE_SURFACES)('%s marks its indexed region and title', (file) => {
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toContain('data-pagefind-body');
  });

  // The search tabs count hits per `type` filter value and search within one,
  // so a surface without exactly one type would count only under All.
  test.each(SEARCHABLE_SURFACES)('%s tags its pages with one search type', (file) => {
    const src = fs.readFileSync(file, 'utf8');
    const types = [...src.matchAll(/data-pagefind-filter['"]?(?:=|:\s*)['"]type:(\w+)['"]/g)].map((m) => m[1]);
    expect(types).toEqual([SURFACE_TYPES[file]]);
    expect(SEARCH_TYPE_FILTER).toBe('type');
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

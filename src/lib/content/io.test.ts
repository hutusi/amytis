import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { parseSlugAndDate, assertSafeSeriesSlug, isMarkdownFilename, isRstFilename } from './io';

describe('content/io', () => {
  test('every fs.readFileSync in src/lib/content/ goes through readUtf8File', () => {
    // readUtf8File carries the /* turbopackIgnore: true */ annotation that
    // keeps Turbopack from mis-bundling content reads. A bare
    // fs.readFileSync anywhere else in the content layer loses it silently.
    const contentDir = path.join(process.cwd(), 'src', 'lib', 'content');
    const offenders: string[] = [];
    for (const name of fs.readdirSync(contentDir)) {
      if (!name.endsWith('.ts') || name.endsWith('.test.ts') || name === 'io.ts') continue;
      const source = fs.readFileSync(/* turbopackIgnore: true */ path.join(contentDir, name), 'utf8');
      if (/fs\.readFileSync/.test(source)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('parseSlugAndDate splits date-prefixed file names', () => {
    expect(parseSlugAndDate('2026-01-03-hello-world')).toEqual({
      dateFromFileName: '2026-01-03',
      slug: 'hello-world',
    });
    expect(parseSlugAndDate('no-date-prefix')).toEqual({ slug: 'no-date-prefix' });
  });

  test('filename format detection', () => {
    expect(isMarkdownFilename('a.md')).toBe(true);
    expect(isMarkdownFilename('a.mdx')).toBe(true);
    expect(isMarkdownFilename('a.rst')).toBe(false);
    expect(isRstFilename('a.rst')).toBe(true);
    expect(isRstFilename('a.md')).toBe(false);
  });

  test('assertSafeSeriesSlug rejects traversal attempts', () => {
    expect(() => assertSafeSeriesSlug('..')).toThrow();
    expect(() => assertSafeSeriesSlug('a/b')).toThrow();
    expect(() => assertSafeSeriesSlug('/abs')).toThrow();
    expect(() => assertSafeSeriesSlug('')).toThrow();
    expect(() => assertSafeSeriesSlug('valid-series')).not.toThrow();
  });
});

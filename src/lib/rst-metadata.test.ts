import { describe, expect, test } from 'bun:test';
import { normalizeRstMetadata, normalizeRstMetadataField, RstParseError, type RstMetadata } from './rst-metadata';

describe('rst-metadata', () => {
  test('normalizes a python-style metadata record (typed JSON values)', () => {
    const metadata = normalizeRstMetadata({
      date: '2026-04-07',
      tags: ['rst', 'docs'],
      featured: false,
      redirectFrom: ['/series/old-slug'],
      coverImage: './images/cover.png',
      customField: 'ignored',
    });

    expect(metadata).toEqual({
      date: '2026-04-07',
      tags: ['rst', 'docs'],
      featured: false,
      redirectFrom: ['/series/old-slug'],
      coverImage: './images/cover.png',
    });
  });

  test('normalizes js-fallback-style metadata (raw docinfo strings)', () => {
    const metadata: RstMetadata = {};
    normalizeRstMetadataField(metadata, 'Date', '2026-04-07');
    normalizeRstMetadataField(metadata, 'Tags', 'rst, docs');
    normalizeRstMetadataField(metadata, 'Featured', 'false');
    normalizeRstMetadataField(metadata, 'RedirectFrom', '/series/old-slug');
    normalizeRstMetadataField(metadata, 'CoverImage', './images/cover.png');
    normalizeRstMetadataField(metadata, 'Version', '1.0'); // unsupported → skipped

    expect(metadata).toEqual({
      date: '2026-04-07',
      tags: ['rst', 'docs'],
      featured: false,
      redirectFrom: ['/series/old-slug'],
      coverImage: './images/cover.png',
    });
  });

  test('string and typed inputs normalize identically', () => {
    const fromStrings: RstMetadata = {};
    normalizeRstMetadataField(fromStrings, 'draft', 'true');
    normalizeRstMetadataField(fromStrings, 'authors', 'Ada, Grace');

    expect(fromStrings).toEqual(normalizeRstMetadata({ draft: true, authors: ['Ada', 'Grace'] }));
  });

  test.each([
    ['2022-3-17', '2022-03-17'],
    ['2022-3-7', '2022-03-07'],
  ])('normalizes legacy non-zero-padded dates (%s)', (input, expected) => {
    const metadata = normalizeRstMetadata({ date: input });
    expect(metadata.date).toBe(expected);
  });

  test('rejects malformed supported metadata', () => {
    expect(() => normalizeRstMetadata({ draft: 'maybe' })).toThrow(RstParseError);
    expect(() => normalizeRstMetadata({ date: '2026-16-01' })).toThrow(RstParseError);
    expect(() => normalizeRstMetadata({ date: '2026-02-30' })).toThrow(RstParseError);
    expect(() => normalizeRstMetadata({ type: 'post' })).toThrow(RstParseError);
    expect(() => normalizeRstMetadata({ sort: 'alphabetical' })).toThrow(RstParseError);
  });

  test('empty csv strings produce empty arrays', () => {
    const metadata: RstMetadata = {};
    normalizeRstMetadataField(metadata, 'tags', '  ');
    expect(metadata.tags).toEqual([]);
  });
});

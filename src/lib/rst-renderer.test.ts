import { describe, expect, test } from 'bun:test';
import { normalizePythonRstMetadata, validatePythonRstResult } from './rst-renderer';
import { RstParseError } from './rst';

describe('rst-renderer bridge', () => {
  test('normalizes python metadata using the existing rst rules', () => {
    const metadata = normalizePythonRstMetadata({
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

  test('rejects malformed supported metadata from python output', () => {
    expect(() => normalizePythonRstMetadata({ draft: 'maybe' })).toThrow(RstParseError);
    expect(() => normalizePythonRstMetadata({ date: '2026-16-01' })).toThrow(RstParseError);
    expect(() => normalizePythonRstMetadata({ type: 'post' })).toThrow(RstParseError);
  });

  test('validates the expected python renderer result shape', () => {
    expect(() => validatePythonRstResult({
      title: 'Title',
      html: '<p>Body</p>',
      text: 'Body',
      headings: [{ id: 'body', text: 'Body', level: 2 }],
      metadata: {},
      assets: [{ original: './a.png', resolved: '/posts/x/a.png', exists: true }],
      warnings: [],
    }, 'content/series/example/index.rst')).not.toThrow();

    expect(() => validatePythonRstResult({
      title: '',
      html: '<p>Body</p>',
      text: 'Body',
      headings: [],
      metadata: {},
    }, 'broken.rst')).toThrow(RstParseError);
  });
});

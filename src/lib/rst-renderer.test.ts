import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { normalizePythonRstMetadata, renderRstFile, validatePythonRstResult } from './rst-renderer';
import { RstParseError } from './rst';

const hasLocalDocutils = existsSync(path.join(process.cwd(), '.venv-rst', 'bin', 'python'));
const fixtureTest = hasLocalDocutils ? test : test.skip;

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

  fixtureTest('renders a real legacy rST page with rewritten figure asset URLs', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/关于队列模型.rst',
      'posts/关于队列模型'
    );

    expect(doc.title).toBe('关于队列模型');
    expect(doc.headings).toEqual([{ id: 'section-1', text: '关于队列模型', level: 2 }]);
    expect(doc.assets).toEqual([
      {
        original: '_static/fsm_vs_queue.svg',
        resolved: '/posts/关于队列模型/_static/fsm_vs_queue.svg',
        exists: true,
      },
      {
        original: '_static/para_queue_model.svg',
        resolved: '/posts/关于队列模型/_static/para_queue_model.svg',
        exists: true,
      },
    ]);
    expect(doc.html).toContain('/posts/关于队列模型/_static/fsm_vs_queue.svg');
    expect(doc.html).toContain('/posts/关于队列模型/_static/para_queue_model.svg');
  });

  fixtureTest('derives excerpt and text from body content instead of docinfo', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/关于队列模型.rst',
      'posts/关于队列模型'
    );

    expect(doc.text.startsWith('关于队列模型')).toBe(true);
    expect(doc.text.includes('Kenneth Lee 版权所有 2024')).toBe(false);
    expect(doc.text.includes('\n\n0.2\n\n')).toBe(false);
    expect(doc.excerpt.startsWith('关于队列模型')).toBe(true);
  });
});

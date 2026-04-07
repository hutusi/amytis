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

  fixtureTest('rewrites same-series :doc: links to site URLs', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/从香农熵谈设计文档写作.rst',
      'posts/从香农熵谈设计文档写作'
    );

    expect(doc.html).toContain('href="/软件构架设计/开发视图"');
    expect(doc.html).not.toContain('system-message');
    expect(doc.text.includes('No role entry for "doc"')).toBe(false);
    expect(doc.warnings).toEqual([]);
  });

  fixtureTest('falls back cleanly for unresolved external-style :doc: targets', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/无名概念的深入探讨.rst',
      'posts/无名概念的深入探讨'
    );

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain('<span class="docutils literal">道具体是指什么</span>');
    expect(doc.html).toContain('href="/软件构架设计/弟子规：美国军方禁止在C语言程序中使用malloc"');
    expect(doc.warnings.length).toBe(2);
    expect(doc.warnings[0]).toContain('../道德经直译/道具体是指什么');
    expect(doc.warnings[1]).toContain('../道德经直译/无名');
  });

  fixtureTest('renders real code blocks through docutils with pygments classes', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/大型软件架构设计.rst',
      'posts/大型软件架构设计'
    );

    expect(doc.warnings).toEqual([]);
    expect(doc.html).toContain('<pre class="code python literal-block">');
    expect(doc.html).toContain('<span class="keyword">def</span>');
    expect(doc.html).toContain('<span class="name function">search</span>');
    expect(doc.text).toContain('def search(key, strings):');
  });

  fixtureTest('renders unsupported legacy roles as inline text instead of system-message blocks', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/为什么很多人看书学不会架构设计.rst',
      'posts/为什么很多人看书学不会架构设计'
    );

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain('<span class="dtag">架构设计定义</span>');
    expect(doc.warnings).toContain('Unsupported interpreted text role ":dtag:" rendered as plain inline text.');
  });

  fixtureTest('does not include footnote bodies in extracted plain text', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/把什么放入架构设计.rst',
      'posts/把什么放入架构设计'
    );

    expect(doc.html).toContain('class="footnote-list brackets"');
    expect(doc.text).not.toContain('我这里说争论纯粹是指技术上的真理探讨');
    expect(doc.text).not.toContain('关于这一点，可以参考这里：计算进化史');
    expect(doc.excerpt).not.toContain('我这里说争论纯粹是指技术上的真理探讨');
  });

  fixtureTest('renders legacy :ref: roles as internal links instead of system-message blocks', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/对一个设计评审意见的深入探讨.rst',
      'posts/对一个设计评审意见的深入探讨'
    );

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain('href="#s-extension"');
    expect(doc.text.includes(':ref:`s_extension`')).toBe(false);
  });

  fixtureTest('renders legacy :numref: roles as readable inline text instead of system-message blocks', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/逻辑如水.rst',
      'posts/逻辑如水'
    );

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain('<span class="numref">图：模拟的特征</span>');
    expect(doc.html).toContain('<span class="numref">图：模拟特征的数字化过程</span>');
    expect(doc.warnings).toContain('Unsupported interpreted text role ":numref:" rendered as plain inline text.');
  });

  fixtureTest('renders legacy :math: roles as MathML without leaking raw inline syntax', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/逻辑闭包.rst',
      'posts/逻辑闭包'
    );

    expect(doc.html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML">');
    expect(doc.html).toContain('<mi>H</mi>');
    expect(doc.html).toContain('<msub>');
    expect(doc.text.includes(':math:`H=-\\sum_{i=0}^n\\ P_ilogP_i`')).toBe(false);
  });
});

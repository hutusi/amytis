import { existsSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  getPythonRendererInvocationCountForTests,
  getRstRendererDiskCachePathForTests,
  getPythonCommandSpecForRstRenderer,
  normalizePythonRstMetadata,
  resetRstRendererCachesForTests,
  resetPythonCommandSpecForTests,
  renderRstFile,
  validatePythonRstResult,
} from './rst-renderer';
import { RstParseError } from './rst';
import { getPostUrl } from './urls';

const localDocutilsPython = path.join(process.cwd(), '.venv-rst', 'bin', 'python');
const hasLocalDocutils = existsSync(localDocutilsPython);
const fixtureTest = hasLocalDocutils ? test : test.skip;
const previousPython = process.env.AMYTIS_RST_PYTHON;

beforeAll(() => {
  resetPythonCommandSpecForTests();
  resetRstRendererCachesForTests();
  if (hasLocalDocutils && previousPython === undefined) {
    process.env.AMYTIS_RST_PYTHON = localDocutilsPython;
  }
});

afterAll(() => {
  if (previousPython === undefined) {
    delete process.env.AMYTIS_RST_PYTHON;
  } else {
    process.env.AMYTIS_RST_PYTHON = previousPython;
  }
  rmSync(path.join(process.cwd(), '.cache', 'rst-renderer'), { recursive: true, force: true });
  resetRstRendererCachesForTests();
  resetPythonCommandSpecForTests();
});

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

  test.each([
    ['2022-3-17', '2022-03-17'],
    ['2022-3-7', '2022-03-07'],
  ])('normalizes legacy non-zero-padded dates from python output (%s)', (input, expected) => {
    const metadata = normalizePythonRstMetadata({ date: input });
    expect(metadata.date).toBe(expected);
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

  test('prefers the configured python runtime when provided', () => {
    const previousPython = process.env.AMYTIS_RST_PYTHON;
    process.env.AMYTIS_RST_PYTHON = '/tmp/custom-python';
    resetPythonCommandSpecForTests();

    try {
      expect(getPythonCommandSpecForRstRenderer()).toEqual({
        executable: '/tmp/custom-python',
        args: [],
        cacheKey: '/tmp/custom-python',
      });
    } finally {
      if (previousPython === undefined) {
        delete process.env.AMYTIS_RST_PYTHON;
      } else {
        process.env.AMYTIS_RST_PYTHON = previousPython;
      }
      resetPythonCommandSpecForTests();
    }
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

  fixtureTest('persists rendered rst output to disk cache and reloads it without rerendering', () => {
    const filePath = 'content/series/软件构架设计/关于队列模型.rst';
    const cachePath = getRstRendererDiskCachePathForTests(filePath);

    rmSync(cachePath, { force: true });
    resetRstRendererCachesForTests();

    const first = renderRstFile(filePath, 'posts/关于队列模型');
    expect(existsSync(cachePath)).toBe(true);
    const cacheMtime = statSync(cachePath).mtimeMs;
    const invocationCount = getPythonRendererInvocationCountForTests();

    resetRstRendererCachesForTests();
    const second = renderRstFile(filePath, 'posts/关于队列模型');

    expect(second).toEqual(first);
    expect(getPythonRendererInvocationCountForTests()).toBe(0);
    expect(statSync(cachePath).mtimeMs).toBe(cacheMtime);
    expect(invocationCount).toBeGreaterThan(0);
  });

  fixtureTest('preserves series index metadata fields from docutils output', () => {
    const doc = renderRstFile(
      'content/series/rst-legacy/index.rst',
      'posts/rst-legacy'
    );

    expect(doc.metadata.excerpt).toBe('Legacy notes imported from reStructuredText.');
    expect(doc.metadata.sort).toBe('manual');
    expect(doc.metadata.posts).toEqual(['getting-started', 'deeper-notes']);
    expect(doc.metadata.authors).toEqual(['John Hu']);
  });

  fixtureTest('derives text from body content without auto-generating an excerpt', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/关于队列模型.rst',
      'posts/关于队列模型'
    );

    expect(doc.text.startsWith('关于队列模型')).toBe(true);
    expect(doc.text.includes('Kenneth Lee 版权所有 2024')).toBe(false);
    expect(doc.text.includes('\n\n0.2\n\n')).toBe(false);
    expect(doc.excerpt).toBe('');
  });

  fixtureTest('does not render docinfo or comments at the top of post HTML', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/逻辑闭包.rst',
      'posts/逻辑闭包'
    );

    expect(doc.metadata.authors).toEqual(['Kenneth Lee']);
    expect(doc.html).not.toContain('<dl class="docinfo');
    expect(doc.html).not.toContain('版权所有');
    expect(doc.html).toContain('<section id="section-1">');
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

  fixtureTest('resolves cross-series :doc: targets when the target content exists locally', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/无名概念的深入探讨.rst',
      'posts/无名概念的深入探讨'
    );

    const daoConcreteUrl = getPostUrl({ series: '道德经直译', slug: '道具体是指什么' });
    const daoNamelessUrl = getPostUrl({ series: '道德经直译', slug: '无名' });
    const discipleRulesUrl = getPostUrl({ series: '软件构架设计', slug: '弟子规：美国军方禁止在C语言程序中使用malloc' });

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain(`href="${daoConcreteUrl}"`);
    expect(doc.html).toContain(`href="${daoNamelessUrl}"`);
    expect(doc.html).toContain(`href="${discipleRulesUrl}"`);
    expect(doc.warnings).toEqual([]);
  });

  fixtureTest('resolves cross-series :doc: links when legacy content omits a boundary before the role', () => {
    const doc = renderRstFile(
      'content/series/花朵的温室/读史的方法.rst',
      'posts/读史的方法'
    );

    const targetUrl = getPostUrl({ series: '道德经直译', slug: '温故而知新' });

    expect(doc.html).toContain(`href="${targetUrl}"`);
    expect(doc.html).not.toContain(':doc:<cite>');
    expect(doc.html).not.toContain('<span class="docutils literal">温故而知新</span>');
    expect(doc.warnings).toEqual([]);
  });

  fixtureTest('does not leak :doc: role resolution across sequential renders in one process', () => {
    renderRstFile(
      'content/series/花朵的温室/读史的方法.rst',
      'posts/读史的方法'
    );

    const doc = renderRstFile(
      'content/series/软件构架设计/什么是架构设计2023.rst',
      'posts/什么是架构设计2023'
    );
    const targetUrl = getPostUrl({ series: '软件构架设计', slug: '什么是软件架构' });

    expect(doc.html).toContain(`href="${targetUrl}"`);
    expect(doc.html).not.toContain('<span class="docutils literal">什么是软件架构</span>');
    expect(doc.warnings).toEqual([
      'Unsupported interpreted text role ":dtag:" rendered as plain inline text.',
    ]);
  });

  fixtureTest('resolves same-series :doc: targets whose rst filenames contain dots', () => {
    const doc = renderRstFile(
      'content/series/道德经直译/德信.rst',
      'posts/德信'
    );

    const targetUrl = getPostUrl({ series: '道德经直译', slug: '02.不尚贤' });

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain(`href="${targetUrl}"`);
    expect(doc.warnings).toEqual([]);
  });

  fixtureTest('resolves version-like :doc: targets whose rst filenames contain dots', () => {
    const doc = renderRstFile(
      'content/series/Linux主线内核跟踪/6.5.rst',
      'posts/6.5'
    );

    const targetUrl = getPostUrl({ series: 'Linux主线内核跟踪', slug: '6.2' });

    expect(doc.html).toContain(`href="${targetUrl}"`);
    expect(doc.warnings).toEqual([]);
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
    expect(doc.excerpt).toBe('');
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

  fixtureTest('resolves legacy :numref: roles to figure anchors when labels exist', () => {
    const doc = renderRstFile(
      'content/series/软件构架设计/逻辑如水.rst',
      'posts/逻辑如水'
    );

    expect(doc.html).not.toContain('system-message');
    expect(doc.html).toContain('href="#target-1"');
    expect(doc.html).toContain('href="#target-2"');
    expect(doc.html).toContain('class="reference external numref"');
    expect(doc.warnings).not.toContain('Unsupported interpreted text role ":numref:" rendered as plain inline text.');
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

import { describe, expect, test } from 'bun:test';
import { parseRstDocument, rstToMarkdown, RstParseError } from './rst';

describe('rst utils', () => {
  test('parses title, metadata, headings, and markdown conversion', () => {
    const doc = parseRstDocument([
      'Rst Title',
      '=========',
      '',
      ':date: 2026-01-01',
      ':tags: rst, migration',
      ':draft: false',
      '',
      'Section',
      '-------',
      '',
      'Paragraph with `Link <https://example.com>`_.',
    ].join('\n'));

    expect(doc.title).toBe('Rst Title');
    expect(doc.metadata.date).toBe('2026-01-01');
    expect(doc.metadata.tags).toEqual(['rst', 'migration']);
    expect(doc.metadata.draft).toBe(false);
    expect(doc.markdownBody).toContain('### Section');
    expect(doc.markdownBody).toContain('[Link](https://example.com)');
    expect(doc.headings).toEqual([{ id: 'section', text: 'Section', level: 3 }]);
  });

  test('converts code blocks and image directives', () => {
    const markdown = rstToMarkdown([
      '.. code-block:: js',
      '',
      '  console.log("hi");',
      '',
      '.. image:: ./images/test.svg',
      '   :alt: Test image',
    ].join('\n'));

    expect(markdown).toContain('```js');
    expect(markdown).toContain('console.log("hi");');
    expect(markdown).toContain('![Test image](./images/test.svg)');
  });

  test('propagates :linenos:, :emphasize-lines:, and :caption: into the fence info string', () => {
    const markdown = rstToMarkdown([
      '.. code-block:: python',
      '   :linenos:',
      '   :emphasize-lines: 1,3-5',
      '   :caption: app.py',
      '',
      '  def fib(n):',
      '      if n < 2:',
      '          return n',
      '      return fib(n - 1) + fib(n - 2)',
    ].join('\n'));

    expect(markdown).toContain('```python title="app.py" linenos {1,3-5}');
    expect(markdown).toContain('def fib(n):');
  });

  test(':language: option overrides the directive language', () => {
    const markdown = rstToMarkdown([
      '.. code-block::',
      '   :language: rust',
      '',
      '  fn main() {}',
    ].join('\n'));

    expect(markdown).toContain('```rust');
    expect(markdown).toContain('fn main() {}');
  });

  test('converts figure directives the same way as image directives', () => {
    const bare = rstToMarkdown('.. figure:: _static/redis.svg');
    expect(bare).toContain('![](_static/redis.svg)');

    const withAlt = rstToMarkdown([
      '.. figure:: ./images/diagram.svg',
      '   :alt: A diagram',
    ].join('\n'));
    expect(withAlt).toContain('![A diagram](./images/diagram.svg)');
  });

  test('renders .. note:: as a markdown blockquote with a bold label', () => {
    const markdown = rstToMarkdown([
      '.. note::',
      '',
      '   Keep this as prose.',
    ].join('\n'));

    expect(markdown).toContain('> **Note**');
    expect(markdown).toContain('> Keep this as prose.');
    expect(markdown).not.toContain('.. note::');
    expect(markdown).not.toContain('```');
  });

  test('renders all admonition kinds and preserves inline rST + blank lines', () => {
    const warning = rstToMarkdown([
      '.. WARNING::',
      '',
      '   First line with ``code``.',
      '',
      '   Second paragraph.',
    ].join('\n'));

    expect(warning).toContain('> **Warning**');
    expect(warning).toContain('> First line with `code`.');
    expect(warning).toContain('> Second paragraph.');
    expect(warning.split('\n').filter((line) => line === '>').length).toBeGreaterThanOrEqual(2);

    for (const kind of ['tip', 'caution', 'attention', 'important', 'hint', 'danger', 'error']) {
      const md = rstToMarkdown(`.. ${kind}::\n\n   body`);
      const label = kind.charAt(0).toUpperCase() + kind.slice(1);
      expect(md).toContain(`> **${label}**`);
      expect(md).toContain('> body');
    }
  });

  test('passes unknown directives through as plain text', () => {
    const markdown = rstToMarkdown([
      '.. unknownthing::',
      '',
      '   should not be swallowed',
    ].join('\n'));

    expect(markdown).toContain('.. unknownthing::');
    expect(markdown).not.toContain('> **Unknownthing**');
  });

  test('handles single-line admonitions and inline body with indented continuation', () => {
    const singleLine = rstToMarkdown('.. note:: Quick reminder.');
    expect(singleLine).toContain('> **Note**');
    expect(singleLine).toContain('> Quick reminder.');
    expect(singleLine).not.toContain('.. note::');

    const withContinuation = rstToMarkdown([
      '.. note:: 特别要说明的是，本文的内容不涉及任何真实的设计',
      '   示例，和任何真正的商用秘密无关。',
    ].join('\n'));
    expect(withContinuation).toContain('> **Note**');
    expect(withContinuation).toContain('> 特别要说明的是，本文的内容不涉及任何真实的设计');
    expect(withContinuation).toContain('> 示例，和任何真正的商用秘密无关。');
    expect(withContinuation).not.toContain('.. note::');

    const withParagraphBreak = rstToMarkdown([
      '.. note:: First paragraph.',
      '',
      '   Second paragraph.',
    ].join('\n'));
    const lines = withParagraphBreak.split('\n');
    const firstIdx = lines.findIndex((l) => l === '> First paragraph.');
    const secondIdx = lines.findIndex((l) => l === '> Second paragraph.');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(lines.slice(firstIdx + 1, secondIdx)).toContain('>');
  });

  test('treats .. cnote:: as a custom admonition with :caption: support', () => {
    const withCaption = rstToMarkdown([
      '.. cnote::',
      '   :caption: 说明',
      '',
      '   Body content here.',
    ].join('\n'));

    expect(withCaption).toContain('> **说明**');
    expect(withCaption).toContain('> Body content here.');
    expect(withCaption).not.toContain(':caption:');
    expect(withCaption).not.toContain('> **Cnote**');

    const withoutCaption = rstToMarkdown([
      '.. cnote::',
      '',
      '   Default label fallback.',
    ].join('\n'));

    expect(withoutCaption).toContain('> **Cnote**');
    expect(withoutCaption).toContain('> Default label fallback.');
  });

  test('renders line blocks (| prefixed lines) as a blockquote with hard breaks', () => {
    const md = rstToMarkdown([
      'Intro paragraph.',
      '',
      '  | First poetic line.',
      '  | Second poetic line.',
      '  | Third with ``code``.',
      '',
      'Trailing paragraph.',
    ].join('\n'));

    expect(md).toContain('> First poetic line.  ');
    expect(md).toContain('> Second poetic line.  ');
    expect(md).toContain('> Third with `code`.');
    expect(md).not.toContain('| First');
    const lines = md.split('\n');
    const last = lines.findIndex((l) => l.startsWith('> Third'));
    expect(last).toBeGreaterThan(-1);
    expect(lines[last].endsWith('  ')).toBe(false);
  });

  test('renders :doc: cross-references and works alongside escaped whitespace', () => {
    const md = rstToMarkdown([
      '前面提到的\\ :doc:`AI编程中人的作用`\\ 这件事。',
      '',
      'See :doc:`Label <some/path>` for details.',
    ].join('\n'));

    expect(md).toContain('前面提到的[AI编程中人的作用](AI编程中人的作用)这件事。');
    expect(md).toContain('[Label](some/path)');
    expect(md).not.toContain(':doc:');
    expect(md).not.toContain('\\ ');
  });

  test('renders :ref: and :numref: roles as anchor links', () => {
    const md = rstToMarkdown([
      'See :ref:`s_extension` for details.',
      '',
      'Look at :ref:`扩展机制 <s_extension>`.',
      '',
      'Per :numref:`图%s <图：架构图>` above.',
      '',
      'Bare :numref:`图：架构图` works too.',
    ].join('\n'));

    expect(md).toContain('[s_extension](#s_extension)');
    expect(md).toContain('[扩展机制](#s_extension)');
    expect(md).toContain('[图](#图架构图)');
    expect(md).toContain('[图：架构图](#图架构图)');
  });

  test('suppresses .. toctree:: directive and its child list from rendered body', () => {
    const markdown = rstToMarkdown([
      'Intro paragraph.',
      '',
      '.. toctree::',
      '   :maxdepth: 2',
      '',
      '   first-child',
      '   second-child',
      '',
      'Trailing paragraph.',
    ].join('\n'));

    expect(markdown).toContain('Intro paragraph.');
    expect(markdown).toContain('Trailing paragraph.');
    expect(markdown).not.toContain('toctree');
    expect(markdown).not.toContain('first-child');
    expect(markdown).not.toContain('second-child');
    expect(markdown).not.toContain(':maxdepth:');
  });

  test('normalizes rST escaped whitespace inline', () => {
    const doc = parseRstDocument([
      'Title',
      '=====',
      '',
      '前面提到的\\ ``code``\\ 这件事。',
    ].join('\n'));

    expect(doc.markdownBody).toContain('前面提到的`code`这件事。');
    expect(doc.markdownBody).not.toContain('\\ ');
  });

  test('ignores unknown metadata fields and rejects malformed supported values', () => {
    const ignored = parseRstDocument([
      'Title',
      '=====',
      '',
      ':custom-field: keep legacy metadata around',
      '',
      'Body',
    ].join('\n'));

    expect(ignored.metadata).toEqual({});

    expect(() => parseRstDocument([
      'Title',
      '=====',
      '',
      ':draft: maybe',
      '',
      'Body',
    ].join('\n'))).toThrow(RstParseError);

    expect(() => parseRstDocument([
      'Title',
      '=====',
      '',
      ':date: 2021-16-15',
      '',
      'Body',
    ].join('\n'))).toThrow(RstParseError);
  });

  test('accepts legacy non-zero-padded dates and normalizes them', () => {
    const doc = parseRstDocument([
      'Title',
      '=====',
      '',
      ':date: 2022-3-17',
      '',
      'Body',
    ].join('\n'));

    expect(doc.metadata.date).toBe('2022-03-17');
  });

  test('accepts leading comments and metadata before the document title', () => {
    const doc = parseRstDocument([
      '.. Kenneth Lee 版权所有 2018-2020',
      '',
      ':Authors: Kenneth Lee',
      ':Version: 1.0',
      '',
      '从香农熵谈设计文档写作',
      '************************',
      '',
      '正文。',
    ].join('\n'));

    expect(doc.title).toBe('从香农熵谈设计文档写作');
    expect(doc.metadata.authors).toEqual(['Kenneth Lee']);
    expect(doc.body).toBe('正文。');
  });

  test('does not auto-generate excerpts when rST metadata omits them', () => {
    const doc = parseRstDocument([
      'Title',
      '=====',
      '',
      'Paragraph with `Link <https://example.com>`_.',
    ].join('\n'));

    expect(doc.excerpt).toBe('');
  });

  test('preserves explicit excerpts from rST metadata', () => {
    const doc = parseRstDocument([
      'Title',
      '=====',
      '',
      ':excerpt: Paragraph with `Link <https://example.com>`_.',
      '',
      'Body.',
    ].join('\n'));

    expect(doc.excerpt).toBe('Paragraph with `Link <https://example.com>`_.');
  });
});

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

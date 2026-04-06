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
});

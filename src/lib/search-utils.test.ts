import { describe, expect, test } from 'bun:test';
import { getResultType, getDateFromUrl, cleanTitle, stripMarkdown } from './search-utils';

// ─── getResultType ────────────────────────────────────────────────────────────

describe('getResultType', () => {
  test('returns Flow for flow URLs', () => {
    expect(getResultType('/flows/2026/01/15/')).toBe('Flow');
  });

  test('returns Flow for any path containing /flows/', () => {
    expect(getResultType('/flows/2024/12/31/')).toBe('Flow');
  });

  test('returns Book for book chapter URLs', () => {
    expect(getResultType('/books/my-book/chapter-1/')).toBe('Book');
  });

  test('returns Book for book index URLs', () => {
    expect(getResultType('/books/my-book/')).toBe('Book');
  });

  test('returns Post for post URLs', () => {
    expect(getResultType('/posts/my-post/')).toBe('Post');
  });

  test('returns Post for root static pages', () => {
    expect(getResultType('/about/')).toBe('Post');
  });

  test('returns Post for paginated post pages', () => {
    expect(getResultType('/posts/page/2/')).toBe('Post');
  });
});

// ─── getDateFromUrl ───────────────────────────────────────────────────────────

describe('getDateFromUrl', () => {
  test('extracts YYYY-MM-DD from a flow URL', () => {
    expect(getDateFromUrl('/flows/2026/01/15/')).toBe('2026-01-15');
  });

  test('pads single-digit month and day correctly', () => {
    expect(getDateFromUrl('/flows/2024/03/07/')).toBe('2024-03-07');
  });

  test('returns empty string for post URLs', () => {
    expect(getDateFromUrl('/posts/my-post/')).toBe('');
  });

  test('returns empty string for book URLs', () => {
    expect(getDateFromUrl('/books/my-book/chapter/')).toBe('');
  });

  test('returns empty string when flow URL has no trailing slash', () => {
    // Pagefind always returns URLs with trailing slash; guard against edge case
    expect(getDateFromUrl('/flows/2024/12/31')).toBe('');
  });

  test('returns empty string for the root path', () => {
    expect(getDateFromUrl('/')).toBe('');
  });
});

// ─── cleanTitle ───────────────────────────────────────────────────────────────

describe('cleanTitle', () => {
  test('strips " | Site Name" suffix', () => {
    expect(cleanTitle('My Post | My Site')).toBe('My Post');
  });

  test('returns the title unchanged when there is no suffix', () => {
    expect(cleanTitle('My Post')).toBe('My Post');
  });

  test('strips only the last " | " occurrence (keeps earlier pipes)', () => {
    expect(cleanTitle('Part A | Part B | Site')).toBe('Part A | Part B');
  });

  test('handles an empty string', () => {
    expect(cleanTitle('')).toBe('');
  });

  test('handles a title that is only a site suffix', () => {
    expect(cleanTitle(' | Site')).toBe('');
  });
});

// ─── stripMarkdown ────────────────────────────────────────────────────────────

describe('stripMarkdown', () => {
  test('strips fenced code blocks', () => {
    const input = 'Hello\n```js\nconst x = 1;\n```\nWorld';
    expect(stripMarkdown(input)).toBe('Hello World');
  });

  test('strips inline code', () => {
    expect(stripMarkdown('Use `npm install` to install')).toBe('Use to install');
  });

  test('strips image syntax', () => {
    expect(stripMarkdown('![alt text](image.png) after')).toBe('after');
  });

  test('converts links to their visible text', () => {
    expect(stripMarkdown('See [the docs](https://example.com) here')).toBe('See the docs here');
  });

  test('strips HTML and JSX tags', () => {
    expect(stripMarkdown('<div class="foo">content</div>')).toBe('content');
  });

  test('strips ATX heading markers (# through ######)', () => {
    expect(stripMarkdown('## Introduction')).toBe('Introduction');
    expect(stripMarkdown('###### Deep heading')).toBe('Deep heading');
  });

  test('strips bold and italic with asterisks', () => {
    expect(stripMarkdown('**bold** and *italic* text')).toBe('bold and italic text');
  });

  test('strips bold and italic with underscores', () => {
    expect(stripMarkdown('__bold__ and _italic_ text')).toBe('bold and italic text');
  });

  test('strips GFM strikethrough markers', () => {
    expect(stripMarkdown('~~deleted~~ and ~~removed~~')).toBe('deleted and removed');
  });

  test('strips unordered list markers', () => {
    expect(stripMarkdown('- item one\n- item two')).toBe('item one item two');
  });

  test('strips blockquote markers', () => {
    expect(stripMarkdown('> quoted text')).toBe('quoted text');
  });

  test('strips ordered list markers', () => {
    expect(stripMarkdown('1. First\n2. Second')).toBe('First Second');
  });

  test('normalizes multiple spaces and newlines to a single space', () => {
    expect(stripMarkdown('word1   word2\n\nword3')).toBe('word1 word2 word3');
  });

  test('trims leading and trailing whitespace', () => {
    expect(stripMarkdown('  hello world  ')).toBe('hello world');
  });

  test('caps output at 2000 characters', () => {
    const long = 'a'.repeat(3000);
    expect(stripMarkdown(long).length).toBe(2000);
  });

  test('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  test('handles mixed markdown in one passage', () => {
    const input = '## Title\n\n**Bold** and [link](http://example.com).\n\n- item\n\n> quote';
    expect(stripMarkdown(input)).toBe('Title Bold and link. item quote');
  });
});

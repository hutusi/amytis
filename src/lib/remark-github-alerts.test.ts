import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Blockquote } from 'mdast';
import remarkGithubAlerts from './remark-github-alerts';

function parse(markdown: string): Root {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubAlerts)
    .runSync(unified().use(remarkParse).parse(markdown)) as Root;
}

function findBlockquote(tree: Root): Blockquote | undefined {
  return tree.children.find((n): n is Blockquote => n.type === 'blockquote');
}

describe('remarkGithubAlerts', () => {
  test('transforms [!NOTE] blockquote into a github-alert hast element', () => {
    const tree = parse('> [!NOTE]\n> body content');
    const bq = findBlockquote(tree);
    const data = bq?.data as { hName?: string; hProperties?: Record<string, unknown> } | undefined;
    expect(data?.hName).toBe('github-alert');
    expect(data?.hProperties?.['data-alert-type']).toBe('note');
  });

  test.each(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])(
    'matches [!%s] case-sensitively (uppercase) and lowercases the type',
    (typeUpper) => {
      const tree = parse(`> [!${typeUpper}]\n> body`);
      const bq = findBlockquote(tree);
      const data = bq?.data as { hProperties?: Record<string, unknown> } | undefined;
      expect(data?.hProperties?.['data-alert-type']).toBe(typeUpper.toLowerCase());
    },
  );

  test('matches lowercase [!note] too (GitHub is case-insensitive)', () => {
    const tree = parse('> [!note]\n> body');
    const bq = findBlockquote(tree);
    const data = bq?.data as { hProperties?: Record<string, unknown> } | undefined;
    expect(data?.hProperties?.['data-alert-type']).toBe('note');
  });

  test('does not transform [!UNKNOWN] blockquotes — they stay as plain blockquotes', () => {
    const tree = parse('> [!UNKNOWN]\n> body');
    const bq = findBlockquote(tree);
    expect(bq?.data).toBeUndefined();
  });

  test('does not transform plain blockquotes without a marker', () => {
    const tree = parse('> just a quote\n> with two lines');
    const bq = findBlockquote(tree);
    expect(bq?.data).toBeUndefined();
  });

  test('strips the marker token from the body content', () => {
    const tree = parse('> [!NOTE]\n> the surviving body');
    const bq = findBlockquote(tree);
    // After the plugin runs, the marker should be gone from the first text node.
    const first = bq?.children[0];
    if (first?.type !== 'paragraph') throw new Error('expected paragraph');
    const text = first.children[0];
    if (text?.type !== 'text') throw new Error('expected text');
    expect(text.value).not.toMatch(/\[!NOTE\]/);
    expect(text.value).toContain('the surviving body');
  });

  test('handles inline content on the same line as the marker', () => {
    // GitHub's spec technically wants [!TYPE] on its own line, but some authors
    // write `> [!NOTE] body inline`. We accept it.
    const tree = parse('> [!NOTE] inline body');
    const bq = findBlockquote(tree);
    const data = bq?.data as { hProperties?: Record<string, unknown> } | undefined;
    expect(data?.hProperties?.['data-alert-type']).toBe('note');
    const first = bq?.children[0];
    if (first?.type !== 'paragraph') throw new Error('expected paragraph');
    const text = first.children[0];
    if (text?.type !== 'text') throw new Error('expected text');
    expect(text.value).toContain('inline body');
  });
});

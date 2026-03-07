import { describe, test, expect } from 'bun:test';
import remarkWikilinks from './remark-wikilinks';
import type { Root, Paragraph } from 'mdast';
import type { SlugRegistryEntry } from './markdown';

function makeTree(text: string): Root {
  return {
    type: 'root',
    children: [{
      type: 'paragraph',
      children: [{ type: 'text', value: text }],
    } as Paragraph],
  };
}

function getChildren(tree: Root) {
  return (tree.children[0] as Paragraph).children;
}

const registry = new Map<string, SlugRegistryEntry>([
  ['my-note',      { url: '/notes/my-note',           type: 'note', title: 'My Note' }],
  ['another-post', { url: '/posts/another-post',      type: 'post', title: 'Another Post' }],
]);

describe('remarkWikilinks', () => {
  test('resolved link uses registry title as display text', () => {
    const tree = makeTree('[[my-note]]');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const [node] = getChildren(tree);
    expect(node.type).toBe('html');
    expect((node as { type: string; value: string }).value).toContain('>My Note</a>');
    expect((node as { type: string; value: string }).value).toContain('href="/notes/my-note"');
    expect((node as { type: string; value: string }).value).toContain('wikilink--resolved');
    expect((node as { type: string; value: string }).value).toContain('wikilink--note');
  });

  test('explicit label overrides registry title', () => {
    const tree = makeTree('[[my-note|Custom Label]]');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const [node] = getChildren(tree);
    expect((node as { type: string; value: string }).value).toContain('>Custom Label</a>');
    expect((node as { type: string; value: string }).value).not.toContain('>My Note</a>');
  });

  test('broken link renders as span using slug as display text', () => {
    const tree = makeTree('[[missing-slug]]');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const [node] = getChildren(tree);
    expect(node.type).toBe('html');
    expect((node as { type: string; value: string }).value).toContain('wikilink--broken');
    expect((node as { type: string; value: string }).value).toContain('>missing-slug<');
  });

  test('preserves surrounding text nodes', () => {
    const tree = makeTree('Before [[my-note]] after.');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const children = getChildren(tree);
    expect(children[0]).toMatchObject({ type: 'text', value: 'Before ' });
    expect(children[2]).toMatchObject({ type: 'text', value: ' after.' });
  });

  test('resolves multiple wikilinks in one text node', () => {
    const tree = makeTree('[[my-note]] and [[another-post]]');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const htmlNodes = getChildren(tree).filter(n => n.type === 'html');
    expect(htmlNodes).toHaveLength(2);
    expect((htmlNodes[0] as { type: string; value: string }).value).toContain('>My Note</a>');
    expect((htmlNodes[1] as { type: string; value: string }).value).toContain('>Another Post</a>');
  });

  test('text without wikilinks is unchanged', () => {
    const tree = makeTree('No links here.');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ type: 'text', value: 'No links here.' });
  });

  test('post type wikilink gets wikilink--post class', () => {
    const tree = makeTree('[[another-post]]');
    remarkWikilinks({ slugRegistry: registry })(tree);
    const [node] = getChildren(tree);
    expect((node as { type: string; value: string }).value).toContain('wikilink--post');
    expect((node as { type: string; value: string }).value).toContain('>Another Post</a>');
  });
});

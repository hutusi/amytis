import { visit } from 'unist-util-visit';
import { slug } from 'github-slugger';
import type { ElementContent, Root } from 'hast';

const HEADING_TAG_RE = /^h[1-6]$/;

function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textContent).join('');
  return '';
}

/**
 * Ids for headings that reach the HAST without one: headings written as raw
 * HTML (`<h2>Setup</h2>` inside Markdown). Markdown headings already carry
 * the TOC's ids from remarkHeadingIds. This pass first collects every id in
 * the document, then gives each remaining heading a slug that collides with
 * none of them, so `## Setup` and a later `<h2>Setup</h2>` get `setup` and
 * `setup-1` rather than two `setup`s. (rehype-slug can't do that: its fresh
 * slugger never sees the ids assigned in the remark phase.)
 */
export default function rehypeRawHeadingIds(options: { prefix?: string } = {}) {
  const prefix = options.prefix ?? '';
  return (tree: Root) => {
    const taken = new Set<string>();
    visit(tree, 'element', (node) => {
      const id = node.properties?.id;
      if (typeof id === 'string' && id) taken.add(id);
    });
    visit(tree, 'element', (node) => {
      if (!HEADING_TAG_RE.test(node.tagName) || node.properties?.id) return;
      const base = slug(node.children.map(textContent).join(''));
      if (!base) return;
      let id = `${prefix}${base}`;
      for (let n = 1; taken.has(id); n++) id = `${prefix}${base}-${n}`;
      taken.add(id);
      node.properties = { ...node.properties, id };
    });
  };
}

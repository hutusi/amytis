import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

/**
 * mdast-util-to-hast preserves a fenced code block's meta string under
 * `node.data.meta`, but react-markdown v10 strips `data` before invoking
 * component overrides — so the meta becomes invisible at render time.
 * This tiny rehype pass copies it to a real `data-meta` HTML attribute
 * that survives the round trip and is reachable as `props['data-meta']`.
 */
export default function rehypeFenceMeta() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'code') return;
      const meta = (node.data as { meta?: string } | undefined)?.meta;
      if (typeof meta === 'string' && meta.length > 0) {
        node.properties = node.properties ?? {};
        node.properties['data-meta'] = meta;
      }
    });
  };
}

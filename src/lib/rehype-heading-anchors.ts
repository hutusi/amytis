import { SKIP, visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

export const HEADING_ANCHOR_CLASS = 'heading-anchor';

const ANCHORED_HEADINGS = new Set(['h2', 'h3', 'h4']);

function classList(node: Element): string[] {
  const value: unknown = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === 'string' ? value.split(/\s+/) : [];
}

function firstElementChild(node: Element): Element | undefined {
  return node.children.find((child): child is Element => child.type === 'element');
}

/**
 * A "#" link at the end of each h2–h4, pointing at the heading's own id, so
 * a reader can link straight to a section. The link is empty: CSS draws the
 * "#" (::before), which keeps it out of copied text and the search index,
 * and aria-label names it for screen readers.
 *
 * docutils puts the id on the <section> around an rST heading, not on the
 * heading, so a heading without an id borrows its section's when it is that
 * section's first element. Skipped: visually hidden headings (the GFM
 * footnotes label), headings inside a link or <summary>, and headings that
 * already carry an anchor.
 */
export default function rehypeHeadingAnchors(options: { label: string }) {
  return (tree: Root) => {
    visit(tree, 'element', (node, _index, parent) => {
      if (node.tagName === 'a' || node.tagName === 'summary') return SKIP;
      if (!ANCHORED_HEADINGS.has(node.tagName)) return;
      if (classList(node).includes('sr-only')) return SKIP;

      const hasAnchor = node.children.some(
        (child) => child.type === 'element' && classList(child).includes(HEADING_ANCHOR_CLASS),
      );
      if (hasAnchor) return SKIP;

      let id = node.properties?.id;
      if (!id && parent?.type === 'element' && parent.tagName === 'section' && firstElementChild(parent) === node) {
        id = parent.properties?.id;
      }
      if (typeof id !== 'string' || !id) return SKIP;

      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: { className: [HEADING_ANCHOR_CLASS], href: `#${id}`, ariaLabel: options.label },
        children: [],
      });
      return SKIP;
    });
  };
}

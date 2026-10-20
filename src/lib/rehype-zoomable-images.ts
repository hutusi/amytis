import { SKIP, visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

function hasClass(node: Element, name: string): boolean {
  const value: unknown = node.properties?.className;
  if (Array.isArray(value)) return value.map(String).includes(name);
  return typeof value === 'string' && value.split(/\s+/).includes(name);
}

/**
 * Marks content images `data-zoomable="true"` for the ImageZoom lightbox.
 * Not marked: images inside a link (the click follows the link), anything
 * inside a Mermaid diagram, and images with an inline `style` (raw-HTML
 * badges and icons, which Markdown `![]()` images never carry).
 */
export default function rehypeZoomableImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'a' || hasClass(node, 'mermaid')) return SKIP;
      if (node.tagName !== 'img' || node.properties?.style) return;
      node.properties = { ...node.properties, dataZoomable: 'true' };
    });
  };
}

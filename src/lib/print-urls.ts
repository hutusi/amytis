import { visit } from 'unist-util-visit';
import type { ElementContent, Root } from 'hast';
import { isExternalUrl } from '@/lib/urls';

function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textContent).join('');
  return '';
}

const bare = (value: string) => value.trim().replace(/^(https?:)?\/\//i, '').replace(/\/+$/, '');

/**
 * Whether a link should print its address after its text. Only external
 * links: an internal path means nothing on paper, and wikilinks already
 * print as [[...]]. Not when the text already is the address (GFM autolinks,
 * pasted URLs), and not for image links, which have no text to annotate.
 */
export function shouldPrintLinkUrl(href: string | undefined, text: string, isImageLink = false): boolean {
  if (!href || isImageLink || !isExternalUrl(href)) return false;
  return bare(text) !== bare(href);
}

/** Marks such links `data-print-url="true"`; the print stylesheet appends the href. */
export default function rehypePrintLinkUrls() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const href = typeof node.properties?.href === 'string' ? node.properties.href : undefined;
      const text = node.children.map(textContent).join('');
      // Image-only: a link with an image AND a label still prints its address.
      const isImageLink = !text.trim() && node.children.some((child) => child.type === 'element' && child.tagName === 'img');
      if (shouldPrintLinkUrl(href, text, isImageLink)) {
        node.properties = { ...node.properties, dataPrintUrl: 'true' };
      }
    });
  };
}

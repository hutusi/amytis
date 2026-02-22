import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';
import type { SlugRegistryEntry } from './markdown';

interface WikilinksOptions {
  slugRegistry: Map<string, SlugRegistryEntry>;
}

export default function remarkWikilinks({ slugRegistry }: WikilinksOptions) {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes('[[')) return;

      // Create fresh regex each time to avoid lastIndex issue with 'g' flag
      const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
      if (!WIKILINK.test(node.value)) return;
      WIKILINK.lastIndex = 0;

      const newNodes: (Text | { type: 'html'; value: string })[] = [];
      let last = 0;
      let match: RegExpExecArray | null;

      while ((match = WIKILINK.exec(node.value)) !== null) {
        if (match.index > last) {
          newNodes.push({ type: 'text', value: node.value.slice(last, match.index) });
        }

        const slug = match[1].trim();
        const display = match[2]?.trim() || slug;
        const entry = slugRegistry.get(slug);

        if (entry) {
          newNodes.push({
            type: 'html',
            value: `<a href="${entry.url}" class="wikilink wikilink--resolved wikilink--${entry.type}">${display}</a>`,
          });
        } else {
          newNodes.push({
            type: 'html',
            value: `<span class="wikilink wikilink--broken" title="[[${slug}]] not found">${display}</span>`,
          });
        }

        last = match.index + match[0].length;
      }

      if (last < node.value.length) {
        newNodes.push({ type: 'text', value: node.value.slice(last) });
      }

      if (newNodes.length > 1 || (newNodes.length === 1 && newNodes[0].type !== 'text')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (parent.children as any[]).splice(index, 1, ...newNodes);
        return index + newNodes.length; // skip inserted nodes
      }
    });
  };
}

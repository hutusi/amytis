import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import { parseFenceMeta } from './shiki';

interface ContainerDirective {
  type: 'containerDirective';
  name: string;
  children: Array<Code | { type: string }>;
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

let counter = 0;
function nextGroupId(): string {
  counter += 1;
  return `cg${counter.toString(36)}`;
}

/**
 * Transforms `:::code-group ... :::` container directives into a custom hast
 * element <code-group data-labels="[...]" data-group-id="..."> whose children
 * are the original fenced code blocks (still processed by the normal `code`
 * override and Shiki pipeline). The component override for `code-group` is
 * <CodeGroup>, which renders the radio+label tabs HTML.
 *
 * Labels come from the Docusaurus-style `[label]` token at the start of each
 * fence's meta (e.g. ```bash [npm]). Falls back to the language name when
 * absent, then to "Tab N" when both are missing.
 */
export default function remarkCodeGroup() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      const directive = node as unknown as ContainerDirective;
      if (directive.name !== 'code-group') return;

      const labels: string[] = [];
      let tabIndex = 0;
      for (const child of directive.children) {
        if (child.type !== 'code') continue;
        const code = child as Code;
        const parsed = parseFenceMeta(code.meta ?? undefined);
        tabIndex += 1;
        labels.push(parsed.tabLabel ?? code.lang ?? `Tab ${tabIndex}`);
      }

      directive.data = directive.data ?? {};
      directive.data.hName = 'code-group';
      directive.data.hProperties = {
        'data-labels': JSON.stringify(labels),
        'data-group-id': nextGroupId(),
      };
    });
  };
}

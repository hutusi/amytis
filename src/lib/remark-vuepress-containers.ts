import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

const CONTAINER_OPENER_RE = /^:::[ \t]+([a-zA-Z][\w-]*)(?:[ \t]+([^\n]+))?[ \t]*$/;
const FENCE_OPEN_RE = /^[ \t]*(`{3,}|~{3,})/;

function normalizeContainerLine(line: string): string {
  return line.replace(
    CONTAINER_OPENER_RE,
    (_match, name: string, label: string | undefined) =>
      label ? `:::${name}[${label.trim()}]` : `:::${name}`,
  );
}

/**
 * Pre-process VuePress's relaxed container opener (`::: name [optional title]`)
 * into remark-directive's canonical form (`:::name[title]`). The Markdown spec
 * variant remark-directive recognizes is space-less; the dmla source — and
 * VuePress in general — uses a space-after-colons style with an inline title.
 *
 * Skips fenced code blocks (`` ``` `` / `~~~`) so a documentation example that
 * shows VuePress container syntax verbatim doesn't get rewritten as if it were
 * the syntax itself. The fence tracker is character-type-aware: a `~~~` fence
 * isn't closed by `` ``` `` and vice-versa, matching CommonMark.
 *
 * Runs as a string-level pass before the AST is built, so the existing
 * `:::code-group` usage already in this repo (no space) is unaffected.
 */
export function normalizeVuepressContainerSyntax(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let openFence: string | null = null;

  for (const line of lines) {
    if (openFence === null) {
      const openMatch = line.match(FENCE_OPEN_RE);
      if (openMatch) {
        openFence = openMatch[1];
        out.push(line);
        continue;
      }
      out.push(normalizeContainerLine(line));
    } else {
      // A closing fence is one with the same character type and at least as
      // many characters as the opener, optionally indented, with nothing after.
      const closeRe = new RegExp(`^[ \\t]*${openFence[0]}{${openFence.length},}\\s*$`);
      if (closeRe.test(line)) openFence = null;
      out.push(line);
    }
  }
  return out.join('\n');
}

// VuePress container names → GitHub-flavored alert types. Maps the four
// container types the dmla source uses (note/tip/warning/danger). `info` and
// `caution` are accepted as VuePress synonyms; `danger` rewrites to GitHub's
// `caution` since GitHub doesn't have a `danger` variant.
const CONTAINER_TO_ALERT: Record<string, string> = {
  note: 'note',
  info: 'note',
  tip: 'tip',
  important: 'important',
  warning: 'warning',
  caution: 'caution',
  danger: 'caution',
};

interface DirectiveLike {
  type: string;
  name?: string;
  attributes?: Record<string, string | undefined> | null;
  children?: unknown[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

interface DirectiveLabelNode {
  type: 'paragraph';
  data?: { directiveLabel?: boolean };
  children: Array<{ type: string; value?: string }>;
}

/**
 * Transforms VuePress-style container directives (`:::note`, `:::tip`,
 * `:::warning`, `:::danger`, `:::info`) into the same custom hast element
 * (`<github-alert data-alert-type="..." data-alert-title="...">`) that
 * `remark-github-alerts` emits. Keeping a single component for both syntaxes
 * means the renderer doesn't need to learn a second callout shape.
 *
 * `remark-directive` must run before this plugin so the `containerDirective`
 * nodes exist in the tree.
 *
 * A custom title (e.g. `:::tip 智慧的疆界`) is preserved on the
 * `data-alert-title` attribute. The remark-directive parser surfaces the
 * label as the first child paragraph with `data.directiveLabel === true`.
 */
export default function remarkVuepressContainers() {
  return (tree: Root) => {
    visit(tree, (node: unknown) => {
      const directive = node as DirectiveLike;
      if (directive.type !== 'containerDirective') return;
      const name = directive.name?.toLowerCase();
      if (!name || !(name in CONTAINER_TO_ALERT)) return;

      // Extract an optional title from the first child paragraph marked as
      // the directive label. (remark-directive puts `data.directiveLabel: true`
      // on the synthetic paragraph it builds from text following the directive
      // name on the opening line.)
      let title: string | undefined;
      if (directive.children && directive.children.length > 0) {
        const first = directive.children[0] as DirectiveLabelNode;
        if (first?.type === 'paragraph' && first.data?.directiveLabel) {
          title = first.children
            .filter(c => c.type === 'text')
            .map(c => c.value ?? '')
            .join('')
            .trim() || undefined;
          directive.children.shift();
        }
      }

      directive.data = directive.data ?? {};
      directive.data.hName = 'github-alert';
      const hProperties: Record<string, unknown> = {
        'data-alert-type': CONTAINER_TO_ALERT[name],
      };
      if (title) hProperties['data-alert-title'] = title;
      directive.data.hProperties = hProperties;
    });
  };
}

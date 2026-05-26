import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';

const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
type AlertType = (typeof ALERT_TYPES)[number];

// Match `[!TYPE]` (case-insensitive per GitHub) at the start of the first text
// node, optionally followed by inline content on the same line.
const MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i;

/**
 * Transforms `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` /
 * `> [!CAUTION]` blockquotes (GitHub-flavored alerts) into a custom hast
 * element `<github-alert data-alert-type="note">` whose children are the
 * remaining blockquote content. `remark-gfm` v4 does not include this
 * transform — alerts pass through as plain blockquotes without this plugin.
 *
 * The component override for `github-alert` is `<GithubAlert>`, which renders
 * the styled callout with an icon, title, and body.
 */
export default function remarkGithubAlerts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      if (node.children.length === 0) return;
      const firstBlock = node.children[0];
      if (firstBlock.type !== 'paragraph') return;
      const paragraph = firstBlock as Paragraph;
      if (paragraph.children.length === 0) return;
      const firstText = paragraph.children[0];
      if (firstText.type !== 'text') return;

      const text = firstText as Text;
      const match = text.value.match(MARKER_RE);
      if (!match) return;

      const type = match[1].toLowerCase() as AlertType;
      // Strip the marker token from the first text node. If the rest of that
      // text node was just the marker (now empty), shift it out AND drop any
      // immediately-following soft-break so the body doesn't start with a
      // blank line.
      const trailing = text.value.slice(match[0].length).replace(/^\n+/, '');
      if (trailing) {
        text.value = trailing;
      } else {
        paragraph.children.shift();
        if (paragraph.children[0]?.type === 'break') {
          paragraph.children.shift();
        }
        // If the first paragraph is now entirely empty, drop it altogether.
        if (paragraph.children.length === 0) {
          node.children.shift();
        }
      }

      node.data = node.data ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node.data as any).hName = 'github-alert';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node.data as any).hProperties = { 'data-alert-type': type };
    });
  };
}

export { ALERT_TYPES };
export type { AlertType };

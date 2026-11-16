import { SKIP, visit } from 'unist-util-visit';
import type { Root } from 'hast';

/**
 * Fails the build when an id written in raw HTML is also a slide id:
 * `<h2 id="slides-2">` above a two-slide deck would ship two elements with
 * that id, and `#slides-2` would land on the heading instead of the slide.
 *
 * remarkSlideDeck already rejects collisions with Markdown heading ids,
 * with the line number. Raw HTML is parsed only by rehype-raw, so its ids
 * are checked here, after it: real `id` attributes only (not `data-id`, not
 * id-like text in another attribute or a comment), with character
 * references decoded. Raw headings without an id are already safe:
 * rehypeRawHeadingIds gives them one that avoids every id in the tree.
 */
export default function rehypeSlideDeckIds() {
  return (tree: Root) => {
    const slideDecks = new Map<string, string>();
    const otherTags = new Map<string, string>();

    visit(tree, 'element', (node) => {
      if (node.tagName === 'slide-deck') {
        // camelCased after the rehype-raw round-trip.
        const title = node.properties.dataTitle ?? node.properties['data-title'];
        for (const slide of node.children) {
          if (slide.type === 'element' && typeof slide.properties.id === 'string') {
            slideDecks.set(slide.properties.id, typeof title === 'string' ? title : '');
          }
        }
        return SKIP;
      }
      const id = node.properties.id;
      if (typeof id === 'string' && id) otherTags.set(id, node.tagName);
    });

    for (const [id, title] of slideDecks) {
      const tagName = otherTags.get(id);
      if (tagName) {
        throw new Error(
          `Slide deck${title ? ` "${title}"` : ''}: slide id "${id}" is already used on this page, ` +
          `by a <${tagName}> in raw HTML. Give the deck its own {#id}.`,
        );
      }
    }
  };
}

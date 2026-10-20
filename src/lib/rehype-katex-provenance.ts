import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

/**
 * Which `.katex` / `.katex-display` spans rehype-katex itself generated, as
 * opposed to raw HTML an author wrote with the same class. MarkdownRenderer
 * serializes generated formulas to one HTML string (dangerouslySetInnerHTML)
 * for payload size; doing that to an authored span would carry attributes
 * like `onerror="…"` into the page, where normal React rendering drops
 * string event handlers. Membership is tracked by node identity, so nothing
 * in the content can forge it.
 */
const generatedKatexSpans = new WeakSet<Element>();

const AUTHORED_KEY = 'amytisAuthoredKatexSpans';

/** The part of unified's VFile these plugins use (vfile isn't a direct dependency). */
interface FileWithData {
  data: Record<string, unknown>;
}

function isKatexSpan(node: Element): boolean {
  if (node.tagName !== 'span') return false;
  const className = node.properties?.className;
  const classes = Array.isArray(className) ? className.map(String) : String(className ?? '').split(/\s+/);
  return classes.includes('katex') || classes.includes('katex-display');
}

/** Runs immediately BEFORE rehype-katex: remembers the katex-classed spans that already exist (authored). */
export function rehypeKatexBefore() {
  return (tree: Root, file: FileWithData) => {
    const authored = new WeakSet<Element>();
    visit(tree, 'element', (node: Element) => {
      if (isKatexSpan(node)) authored.add(node);
    });
    file.data[AUTHORED_KEY] = authored;
  };
}

/** Runs immediately AFTER rehype-katex: marks every katex span it created. */
export function rehypeKatexAfter() {
  return (tree: Root, file: FileWithData) => {
    const authored = (file.data[AUTHORED_KEY] as WeakSet<Element> | undefined) ?? new WeakSet<Element>();
    visit(tree, 'element', (node: Element) => {
      if (isKatexSpan(node) && !authored.has(node)) generatedKatexSpans.add(node);
    });
  };
}

/** True only for spans rehype-katex generated in this render. */
export function isGeneratedKatexSpan(node: unknown): boolean {
  return typeof node === 'object' && node !== null && generatedKatexSpans.has(node as Element);
}

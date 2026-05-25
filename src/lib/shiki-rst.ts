import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { visit } from 'unist-util-visit';
import { toHtml } from 'hast-util-to-html';
import type { Element, Root, RootContent } from 'hast';
import { expandLineRanges, highlightToHast } from './shiki';

interface AmytisCodeMarker {
  element: Element;
  code: string;
  language: string;
  highlightLines: number[];
  showLineNumbers: boolean;
  title: string | undefined;
}

function getAttr(node: Element, name: string): string | undefined {
  const value = node.properties?.[name];
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.join(' ');
  return String(value);
}

function isAmytisCodeMarker(node: Element): boolean {
  return node.tagName === 'pre' && node.properties != null && 'dataAmytisCode' in node.properties;
}

function extractCode(element: Element): string {
  // The marker shape is <pre data-amytis-code><code>...</code></pre>
  const codeChild = element.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code',
  );
  if (!codeChild) return '';
  let buffer = '';
  for (const child of codeChild.children) {
    if (child.type === 'text') buffer += child.value;
  }
  return buffer;
}

function readMarker(element: Element): AmytisCodeMarker {
  const code = extractCode(element);
  const language = getAttr(element, 'dataLanguage') ?? '';
  const highlightLinesAttr = getAttr(element, 'dataHighlightLines');
  const highlightLines = highlightLinesAttr ? expandLineRanges(highlightLinesAttr) : [];
  const showLineNumbers = (getAttr(element, 'dataLineNumbers') ?? '').toLowerCase() === 'true';
  const titleAttr = getAttr(element, 'dataTitle');
  const title = titleAttr && titleAttr.trim().length > 0 ? titleAttr : undefined;

  return { element, code, language, highlightLines, showLineNumbers, title };
}

/**
 * Walks rendered rST HTML for opaque <pre data-amytis-code> markers (emitted by
 * scripts/render-rst.py for every literal_block) and replaces each with Shiki's
 * highlighted output. Same highlighter singleton + transformers as the MDX/Markdown
 * path, so rST and Markdown code blocks render identically.
 */
export async function applyShikiToRstHtml(html: string): Promise<string> {
  const tree = unified()
    .use(rehypeParse, { fragment: true })
    .parse(html) as Root;

  const markers: AmytisCodeMarker[] = [];
  visit(tree, 'element', (node: Element) => {
    if (isAmytisCodeMarker(node)) {
      markers.push(readMarker(node));
    }
  });

  if (markers.length === 0) {
    return html;
  }

  const highlighted = new Map<Element, RootContent[]>();
  for (const marker of markers) {
    const hast = await highlightToHast(marker.code, marker.language, {
      showLineNumbers: marker.showLineNumbers,
      highlightLines: marker.highlightLines,
      title: marker.title,
    });
    highlighted.set(marker.element, hast.children as RootContent[]);
  }

  visit(tree, 'element', (node: Element) => {
    if (!isAmytisCodeMarker(node)) return;
    const replacement = highlighted.get(node);
    if (!replacement || replacement.length === 0) return;
    // Promote the highlighted <pre> in place by mutating the marker into a wrapper.
    // We replace the marker element's tagName/properties/children with the first
    // (and only) <pre> from Shiki's output. rehype-parse strips DOCTYPEs etc.
    const first = replacement[0];
    if (first.type !== 'element') return;
    node.tagName = first.tagName;
    node.properties = first.properties ?? {};
    node.children = first.children;
  });

  return toHtml(tree);
}

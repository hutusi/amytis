import { visit } from 'unist-util-visit';
import type { Nodes, Paragraph, PhrasingContent, Root, RootContent } from 'mdast';
import { resolveContentImagePath } from './image-utils';
import { SLIDE_DECK_SLIDE } from './ui-classes';
import { autoDeckBase, isValidDeckId, slideId } from './slide-deck';

export interface RemarkSlideDeckOptions {
  /**
   * Prepended to every slide id: the flow stream's heading-id prefix, so
   * decks in different flows on one page get distinct ids.
   */
  idPrefix?: string;
  /**
   * Public asset base of the content (`posts/my-post`, `flows/2026/01/15`).
   * Relative `pdf` / `video` paths resolve against it exactly like
   * co-located images; without it they are kept as authored.
   */
  assetBase?: string;
}

interface SlidesDirective {
  type: 'containerDirective';
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  children: RootContent[];
  position?: { start: { line: number } };
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

type SlideImage = Extract<PhrasingContent, { type: 'image' | 'imageReference' }>;

const ALLOWED_ATTRIBUTES = new Set(['id', 'pdf', 'video']);
const HTML_COMMENT_RE = /^<!--[\s\S]*-->$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const HTTP_URL_RE = /^https?:\/\//i;

function isSlidesDirective(node: unknown): node is SlidesDirective {
  const candidate = node as { type?: string; name?: string };
  return candidate.type === 'containerDirective' && candidate.name === 'slides';
}

function plainText(node: Nodes): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'image') return node.alt ?? '';
  if ('children' in node) return node.children.map((child) => plainText(child as Nodes)).join('');
  return '';
}

function describe(node: Nodes): string {
  const text = plainText(node).trim() || ('value' in node && typeof node.value === 'string' ? node.value.trim() : '');
  const snippet = text.length > 40 ? `${text.slice(0, 40)}…` : text;
  return snippet ? `${node.type} "${snippet}"` : node.type;
}

/** The line a node's visible content starts on (a text node often starts with the soft break before it). */
function lineOf(node: Nodes): number | string {
  const start = node.position?.start.line;
  if (start === undefined) return '?';
  const leading = node.type === 'text' ? (/^\s*/.exec(node.value)?.[0] ?? '') : '';
  return start + (leading.match(/\n/g)?.length ?? 0);
}

function isHtmlComment(node: Nodes): boolean {
  return node.type === 'html' && HTML_COMMENT_RE.test(node.value.trim());
}

/**
 * Transforms `:::slides` container directives into a `<slide-deck>` element
 * that MarkdownRenderer maps to <SlideDeck> and the feed pipeline rewrites to
 * plain HTML. The deck lists each slide as an ordinary Markdown image, so the
 * file stays portable — other tools show a plain image list:
 *
 *   :::slides[Talk title]{#talk pdf="./talk.pdf" video="https://…"}
 *   ![Title slide](./slides/slide-01.png)
 *   ![Agenda](./slides/slide-02.png)
 *   :::
 *
 * Each image is wrapped in a `div#<stem>-<n>` (the deep-link target) and
 * tagged `data-slide=<n>` so the `img` override can render it as a slide.
 *
 * Misauthored decks fail the build instead of degrading silently: content
 * other than images (HTML comments excepted, so a slide can be commented
 * out), an empty deck, an unknown attribute, a malformed or duplicate id, a
 * slide id that collides with a heading id, a `pdf` / `video` that isn't
 * an http(s) URL or a path inside the content's folder, and an opener that
 * didn't parse as a directive at all. Ids in raw HTML exist only once
 * rehype-raw has parsed it; rehypeSlideDeckIds checks those.
 *
 * `remark-directive` must run first; `remarkHeadingIds` too, when heading
 * collisions should be caught (the on-page renderer).
 */
export default function remarkSlideDeck(options: RemarkSlideDeckOptions = {}) {
  const idPrefix = options.idPrefix ?? '';
  const { assetBase } = options;

  return (tree: Root) => {
    const decks: SlidesDirective[] = [];
    const takenIds = new Set<string>();

    visit(tree, (node) => {
      if (isSlidesDirective(node)) {
        decks.push(node);
        return;
      }
      if (node.type === 'heading') {
        const id = (node.data?.hProperties as Record<string, unknown> | undefined)?.id;
        if (typeof id === 'string' && id) takenIds.add(id);
        return;
      }
      // `:::slides My Talk {pdf=…}` is rewritten to a label by the VuePress
      // normalizer (caught below), but `:::slides {pdf=…}` or `::: slides[…]{…}`
      // isn't a directive at all and would print as literal text.
      if (node.type === 'paragraph') {
        const first = node.children[0];
        if (first?.type === 'text' && /^:::\s*slides\b/.test(first.value)) {
          throw new Error(
            `Slide deck opener on line ${node.position?.start.line ?? '?'} was not recognized: ` +
            `"${first.value.split('\n')[0]}". Write it as :::slides, :::slides[Title] or ` +
            ':::slides[Title]{pdf="./talk.pdf"}, with no space before "[" or "{".',
          );
        }
      }
    });

    if (decks.length === 0) return;

    const explicitIds = new Set<string>();
    for (const deck of decks) {
      const id = deck.attributes?.id;
      if (id) explicitIds.add(id);
    }

    let autoIndex = 0;
    const nextAutoBase = () => {
      let base = autoDeckBase(autoIndex++);
      while (explicitIds.has(base)) base = autoDeckBase(autoIndex++);
      return base;
    };

    const usedStems = new Set<string>();
    for (const deck of decks) {
      transformDeck(deck);
    }

    function transformDeck(deck: SlidesDirective) {
      const line = deck.position?.start.line;
      let title = '';
      const children = [...deck.children];
      const first = children[0] as Paragraph | undefined;
      if (first?.type === 'paragraph' && (first.data as { directiveLabel?: boolean } | undefined)?.directiveLabel) {
        title = plainText(first).replace(/\s+/g, ' ').trim();
        children.shift();
      }

      const where = `Slide deck ${title ? `"${title}" ` : ''}(line ${line ?? '?'})`;
      const fail = (message: string): never => {
        throw new Error(`${where}: ${message}`);
      };

      if (/\{[^}]*=/.test(title)) {
        fail(
          'its title contains attributes, so they were not applied. Put the title in brackets: ' +
          ':::slides[Title]{pdf="./talk.pdf"}.',
        );
      }

      const attributes = deck.attributes ?? {};
      for (const name of Object.keys(attributes)) {
        if (!ALLOWED_ATTRIBUTES.has(name)) {
          fail(`unknown attribute "${name}". A deck accepts only {#id pdf="…" video="…"}.`);
        }
      }

      const explicitId = attributes.id ?? undefined;
      if (explicitId !== undefined && !isValidDeckId(explicitId)) {
        fail(`id "${explicitId}" must start with a letter and use only letters, digits, "-" and "_".`);
      }
      const stem = `${idPrefix}${explicitId ?? nextAutoBase()}`;
      if (usedStems.has(stem)) {
        fail(`another deck on this page already uses the id "${explicitId}". Give each deck its own {#id}.`);
      }
      usedStems.add(stem);

      const pdf = resolveLink('pdf', attributes.pdf, fail);
      const video = resolveLink('video', attributes.video, fail);

      const slides: SlideImage[] = [];
      const definitions: RootContent[] = [];
      for (const child of children) {
        if (child.type === 'paragraph') {
          for (const inline of child.children) {
            if (inline.type === 'image' || inline.type === 'imageReference') {
              slides.push(inline);
            } else if (inline.type === 'break' || (inline.type === 'text' && !inline.value.trim()) || isHtmlComment(inline)) {
              continue;
            } else {
              failContent(inline);
            }
          }
        } else if (child.type === 'definition') {
          // Definitions render nothing; keep them in the tree so
          // ![alt][ref] slides still resolve.
          definitions.push(child);
        } else if (!isHtmlComment(child)) {
          failContent(child);
        }
      }

      function failContent(node: Nodes): never {
        return fail(
          `only images can go inside a deck, but line ${lineOf(node)} has ${describe(node)}. ` +
          'Put captions in the image alt text, and anything else before or after the deck.',
        );
      }

      if (slides.length === 0) {
        fail('it has no slides. List each slide as ![alt](./slides/slide-01.png) between :::slides and :::.');
      }

      const slideIds = slides.map((_, i) => slideId(stem, i + 1));
      for (const id of slideIds) {
        if (takenIds.has(id)) {
          fail(`slide id "${id}" is already used on this page (a heading or another deck). Give the deck its own {#id}.`);
        }
      }
      slideIds.forEach((id) => takenIds.add(id));

      const hProperties: Record<string, unknown> = {
        'data-base': stem,
        'data-count': String(slides.length),
      };
      if (title) hProperties['data-title'] = title;
      if (pdf) hProperties['data-pdf'] = pdf;
      if (video) hProperties['data-video'] = video;
      deck.data = { ...deck.data, hName: 'slide-deck', hProperties };

      deck.children = [
        ...slides.map((image, i): Paragraph => {
          image.data = {
            ...image.data,
            hProperties: { ...(image.data?.hProperties as Record<string, unknown> | undefined), 'data-slide': String(i + 1) },
          };
          return {
            type: 'paragraph',
            children: [image],
            data: { hName: 'div', hProperties: { id: slideIds[i], className: SLIDE_DECK_SLIDE.split(' ') } },
          };
        }),
        ...definitions,
      ];
    }

    function resolveLink(kind: 'pdf' | 'video', raw: string | null | undefined, fail: (message: string) => never): string | undefined {
      if (raw === undefined || raw === null) return undefined;
      const value = raw.trim();
      if (!value) fail(`${kind}="" is empty.`);
      if (HTTP_URL_RE.test(value)) return value;
      if (URL_SCHEME_RE.test(value) || value.startsWith('//') || value.startsWith('#')) {
        fail(`${kind}="${value}" must be an http(s) URL or a path to a file next to the content.`);
      }
      const resolved = resolveContentImagePath(value, assetBase);
      if (resolved) return resolved;
      if (assetBase || value.startsWith('/')) {
        fail(`${kind}="${value}" points outside the content's folder.`);
      }
      return value;
    }
  };
}

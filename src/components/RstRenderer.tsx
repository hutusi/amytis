import MarkdownRenderer from '@/components/MarkdownRenderer';
import { PROSE_CLASSES } from '@/lib/prose-classes';
import KatexStyles from '@/components/KatexStyles';
import type { SlugRegistryEntry } from '@/lib/content/discovery';
import { rstToMarkdown } from '@/lib/rst';
import { applyShikiToRstHtml } from '@/lib/shiki-rst';
import sanitizeHtml from 'sanitize-html';

interface RstRendererProps {
  content: string;
  html?: string;
  latex?: boolean;
  slug?: string;
  slugRegistry?: Map<string, SlugRegistryEntry>;
}

const allowedTags = [
  ...(sanitizeHtml.defaults.allowedTags ?? []),
  'section',
  'img',
  'source',
  'figure',
  'figcaption',
  'aside',
  // Tabbed code groups (CSS-only via radio + label). Without these on the
  // allowlist, the rST path drops to stacked code blocks with no tabs.
  // transformTags below restricts `input` to type="radio" only.
  'input',
  'label',
  'math',
  'annotation',
  'annotation-xml',
  'maction',
  'menclose',
  'merror',
  'mfenced',
  'mfrac',
  'mi',
  'mmultiscripts',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mprescripts',
  'mroot',
  'mrow',
  'ms',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'semantics',
];

// Shiki emits inline `style="--shiki-light:#...; --shiki-dark:#..."` CSS vars on
// every token <span> when running in dual-theme mode, plus our custom transformers
// add `data-language`, `data-line-numbers`, `data-highlighted-line`, and `data-title`
// to <pre>/<span>. Stripping any of these silently kills syntax highlighting in rST
// output while leaving Markdown unaffected — covered by RstRenderer.test.tsx.
const codeBlockAttrs = ['style', 'data-language', 'data-line', 'data-line-numbers', 'data-highlighted-line', 'data-title', 'tabindex'];

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  '*': ['id', 'class', 'title', 'lang', 'dir', 'role', 'aria-label', 'aria-hidden'],
  a: ['href', 'name', 'target', 'rel', 'id', 'class', 'title'],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'decoding', 'class', 'id'],
  source: ['src', 'srcset', 'type'],
  td: ['colspan', 'rowspan', 'align'],
  th: ['colspan', 'rowspan', 'align', 'scope'],
  ol: ['start', 'reversed', 'type'],
  li: ['value'],
  math: ['display', 'xmlns'],
  annotation: ['encoding'],
  'annotation-xml': ['encoding'],
  pre: ['class', 'style', ...codeBlockAttrs],
  code: ['class', 'style', ...codeBlockAttrs],
  span: ['class', 'style', ...codeBlockAttrs],
  div: ['class', 'style', 'data-group-id', 'data-panel', ...codeBlockAttrs],
  // Tabbed code groups: input is restricted to type=radio via transformTags.
  // Defense-in-depth: even if an unexpected attr slips in, the CSS-only tab
  // mechanism can't do anything dangerous with a stray radio button.
  input: ['type', 'name', 'id', 'checked', 'data-idx', 'aria-controls', 'tabindex', 'class'],
  label: ['for', 'class', 'role', 'aria-controls', 'tabindex', 'data-cg-icon'],
};

function sanitizeRenderedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
    transformTags: {
      // Restrict <input> to type="radio" only. Anything else gets stripped.
      // Prevents an rST author from injecting password/file/etc. inputs.
      input: (tagName, attribs) => {
        if (attribs.type !== 'radio') {
          return { tagName: 'span', attribs: {} };
        }
        return { tagName, attribs };
      },
    },
  });
}

export default async function RstRenderer({ content, html, latex = false, slug, slugRegistry }: RstRendererProps) {
  if (html) {
    // The docutils pass emits opaque <pre data-amytis-code> markers; run them through
    // Shiki here (server-side, build-time for SSG) before sanitizing.
    const highlighted = await applyShikiToRstHtml(html);
    const sanitizedHtml = sanitizeRenderedHtml(highlighted).replace(
      /<table\b([^>]*)>/g,
      '<div class="rst-table-wrapper"><table$1>'
    ).replace(/<\/table>/g, '</table></div>');

    return (
      <>
        {latex && <KatexStyles />}
        <div className="bg-background">
          <div
            className={`${PROSE_CLASSES} rst-rendered`}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      </>
    );
  }

  return (
    <MarkdownRenderer
      content={rstToMarkdown(content)}
      latex={latex}
      slug={slug}
      slugRegistry={slugRegistry}
    />
  );
}

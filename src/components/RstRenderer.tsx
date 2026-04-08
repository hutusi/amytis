import MarkdownRenderer from '@/components/MarkdownRenderer';
import KatexStyles from '@/components/KatexStyles';
import type { SlugRegistryEntry } from '@/lib/markdown';
import { rstToMarkdown } from '@/lib/rst';
import sanitizeHtml from 'sanitize-html';

interface RstRendererProps {
  content: string;
  html?: string;
  latex?: boolean;
  slug?: string;
  slugRegistry?: Map<string, SlugRegistryEntry>;
}

const proseClasses = `prose prose-lg max-w-none min-w-0 overflow-x-hidden text-foreground
      prose-headings:font-serif prose-headings:text-heading
      prose-p:text-foreground prose-p:leading-loose
      prose-strong:text-heading prose-strong:font-semibold
      prose-code:bg-muted/15 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-muted/20 prose-code:text-[0.9em] prose-code:font-medium
      prose-code:before:content-none prose-code:after:content-none
      prose-blockquote:italic
      prose-th:text-heading prose-td:text-foreground
      dark:prose-invert`;

const allowedTags = [
  ...(sanitizeHtml.defaults.allowedTags ?? []),
  'section',
  'img',
  'source',
  'figure',
  'figcaption',
  'aside',
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
  });
}

export default function RstRenderer({ content, html, latex = false, slug, slugRegistry }: RstRendererProps) {
  if (html) {
    const sanitizedHtml = sanitizeRenderedHtml(html).replace(
      /<table\b([^>]*)>/g,
      '<div class="rst-table-wrapper"><table$1>'
    ).replace(/<\/table>/g, '</table></div>');

    return (
      <>
        {latex && <KatexStyles />}
        <div className="bg-background">
          <div
            className={`${proseClasses} rst-rendered`}
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

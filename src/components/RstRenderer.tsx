import MarkdownRenderer from '@/components/MarkdownRenderer';
import KatexStyles from '@/components/KatexStyles';
import type { SlugRegistryEntry } from '@/lib/markdown';
import { rstToMarkdown } from '@/lib/rst';

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

function sanitizeRenderedHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export default function RstRenderer({ content, html, latex = false, slug, slugRegistry }: RstRendererProps) {
  if (html) {
    return (
      <>
        {latex && <KatexStyles />}
        <div className="bg-background">
          <div
            className={`${proseClasses} rst-rendered`}
            dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(html) }}
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

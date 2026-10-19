import MarkdownRenderer from '@/components/MarkdownRenderer';
import { PROSE_CLASSES } from '@/lib/prose-classes';
import type { SlugRegistryEntry } from '@/lib/content/discovery';
import { rstToMarkdown } from '@/lib/rst';
import { applyShikiToRstHtml } from '@/lib/shiki-rst';
import { sanitizeRenderedRstHtml } from '@/lib/rst-sanitize';
import KatexStyles from '@/components/KatexStyles';

interface RstRendererProps {
  content: string;
  html?: string;
  latex?: boolean;
  slug?: string;
  slugRegistry?: Map<string, SlugRegistryEntry>;
}

export default async function RstRenderer({ content, html, latex = false, slug, slugRegistry }: RstRendererProps) {
  if (html) {
    // The docutils pass emits opaque <pre data-amytis-code> markers; run them through
    // Shiki here (server-side, build-time for SSG) before sanitizing.
    const highlighted = await applyShikiToRstHtml(html);
    const sanitizedHtml = sanitizeRenderedRstHtml(highlighted).replace(
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

import MarkdownRenderer from '@/components/MarkdownRenderer';
import { PROSE_CLASSES } from '@/lib/prose-classes';
import type { SlugRegistryEntry } from '@/lib/content/discovery';
import { rstToMarkdown } from '@/lib/rst';
import { applyShikiToRstHtml } from '@/lib/shiki-rst';
import { sanitizeRenderedRstHtml } from '@/lib/rst-sanitize';
import { enhanceRstHtml } from '@/lib/rst-enhance';
import { getTranslator } from '@/lib/i18n';
import { siteConfig } from '../../site.config';
import KatexStyles from '@/components/KatexStyles';

interface RstRendererProps {
  content: string;
  html?: string;
  latex?: boolean;
  slug?: string;
  slugRegistry?: Map<string, SlugRegistryEntry>;
  /** Locale of the content, for generated labels. Defaults to the site locale. */
  locale?: string;
}

export default async function RstRenderer({ content, html, latex = false, slug, slugRegistry, locale = siteConfig.i18n.defaultLocale }: RstRendererProps) {
  if (html) {
    // The docutils pass emits opaque <pre data-amytis-code> markers; run them through
    // Shiki here (server-side, build-time for SSG) before sanitizing. The
    // page-only enhancements (heading anchors) run after the sanitizer.
    const { t } = getTranslator(locale);
    const highlighted = await applyShikiToRstHtml(html);
    const enhanced = enhanceRstHtml(sanitizeRenderedRstHtml(highlighted), { headingAnchorLabel: t('heading_anchor') });
    const sanitizedHtml = enhanced.replace(
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
      locale={locale}
    />
  );
}

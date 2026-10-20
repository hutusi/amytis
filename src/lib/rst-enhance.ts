import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeHeadingAnchors from '@/lib/rehype-heading-anchors';
import rehypeZoomableImages from '@/lib/rehype-zoomable-images';
import rehypePrintLinkUrls from '@/lib/print-urls';

export interface RstEnhanceOptions {
  /** aria-label of each heading's "#" link. */
  headingAnchorLabel: string;
}

/**
 * Page-only additions to docutils HTML: the reading features MarkdownRenderer
 * gets from its rehype plugins (heading anchors, the image-zoom and
 * print-URL markers).
 * Runs AFTER sanitizeRenderedRstHtml, on markup it has already cleaned, and
 * only adds attributes whose values come from us. That ordering is
 * deliberate: the sanitizer strips data-*, and its allowlist is shared with
 * the feeds, which must not get these additions.
 */
export function enhanceRstHtml(html: string, options: RstEnhanceOptions): string {
  return String(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHeadingAnchors, { label: options.headingAnchorLabel })
      .use(rehypeZoomableImages)
      .use(rehypePrintLinkUrls)
      .use(rehypeStringify)
      .processSync(html),
  );
}

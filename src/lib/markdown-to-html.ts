import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent } from 'hast';
import remarkGithubAlerts from './remark-github-alerts';
import remarkCodeGroup from './remark-code-group';
import remarkSlideDeck from './remark-slide-deck';
import remarkVuepressContainers, { normalizeVuepressContainerSyntax } from './remark-vuepress-containers';
import remarkWikilinks from './remark-wikilinks';
import { normalizeVuepressBlockMath } from './normalize-vuepress-math';
import rehypeAbsoluteUrls, { type AbsoluteUrlsOptions } from './rehype-absolute-urls';
import { getTranslator } from './i18n';
import { siteConfig } from '../../site.config';
import type { SlugRegistryEntry } from './content/discovery';

export interface MarkdownToHtmlOptions {
  /** Resolve `[[wikilinks]]` against this registry; leave unset to pass them through. */
  slugRegistry?: Map<string, SlugRegistryEntry>;
  /**
   * Parse `$...$` / `$$...$$` as math. Gate on the post's `latex` flag exactly
   * like the on-page renderer — enabling it unconditionally would mangle
   * ordinary dollar amounts in non-math posts.
   */
  math?: boolean;
  /**
   * Rewrite every URL to an absolute one (feed readers resolve nothing
   * relative). Runs on the HAST, so code samples are never rewritten.
   */
  absoluteUrls?: AbsoluteUrlsOptions;
  /** Content locale, for generated text (a slide deck's links). Defaults to the site locale. */
  locale?: string;
}

const ALERT_TITLES: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

/**
 * The properties key depends on whether the element survived a rehype-raw
 * round trip: hProperties keys stay verbatim (`data-alert-type`), while
 * parse5 re-parsing camelizes them (`dataAlertType`).
 */
function getDataProp(node: Element, kebab: string, camel: string): string | undefined {
  const value = node.properties?.[kebab] ?? node.properties?.[camel];
  return value == null ? undefined : String(value);
}

function element(tagName: string, properties: Element['properties'], children: ElementContent[]): Element {
  return { type: 'element', tagName, properties, children };
}

function findFirstImage(node: Element): Element | undefined {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'img') return child;
    const nested = findFirstImage(child);
    if (nested) return nested;
  }
  return undefined;
}

function labeledParagraph(label: string): ElementContent {
  return {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [
      { type: 'element', tagName: 'strong', properties: {}, children: [{ type: 'text', value: label }] },
    ],
  };
}

interface PlainComponentsOptions {
  /** The item's page, for the "view all slides" link; relative `#…` without it. */
  pageUrl?: string;
  locale: string;
}

/**
 * The site pipeline emits synthetic `<github-alert>` / `<code-group>` /
 * `<slide-deck>` elements that only exist as React component overrides. Feed
 * readers know none of them, so rewrite them into plain semantic HTML:
 * alerts become a blockquote with a bold title line, code groups become
 * sequential label + <pre> pairs, and a slide deck becomes its first slide
 * linked to the deck on the page, captioned with the title, a "View all N
 * slides" link and the talk links. Readers run no JavaScript, and forty
 * stacked slides would bury the post.
 */
function rehypePlainComponents({ pageUrl, locale }: PlainComponentsOptions) {
  const { t, tWith } = getTranslator(locale);
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'github-alert') {
        const type = (getDataProp(node, 'data-alert-type', 'dataAlertType') ?? 'note').toLowerCase();
        const title = getDataProp(node, 'data-alert-title', 'dataAlertTitle') || ALERT_TITLES[type] || 'Note';
        node.tagName = 'blockquote';
        node.properties = {};
        node.children = [labeledParagraph(title), ...node.children];
      } else if (node.tagName === 'code-group') {
        let labels: string[] = [];
        try {
          const parsed = JSON.parse(getDataProp(node, 'data-labels', 'dataLabels') ?? '[]');
          labels = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          labels = [];
        }
        const children: ElementContent[] = [];
        let tabIndex = 0;
        for (const child of node.children) {
          if (child.type === 'element' && child.tagName === 'pre') {
            const label = labels[tabIndex];
            tabIndex += 1;
            if (label) children.push(labeledParagraph(label));
          }
          children.push(child);
        }
        node.tagName = 'div';
        node.properties = {};
        node.children = children;
      } else if (node.tagName === 'slide-deck') {
        const stem = getDataProp(node, 'data-base', 'dataBase') ?? 'slides';
        const count = getDataProp(node, 'data-count', 'dataCount') ?? '';
        const title = getDataProp(node, 'data-title', 'dataTitle');
        const pdf = getDataProp(node, 'data-pdf', 'dataPdf');
        const video = getDataProp(node, 'data-video', 'dataVideo');
        // rehype-absolute-urls leaves `#…` alone, so anchor it to the page here.
        const deckHref = `${pageUrl ?? ''}#${stem}-1`;
        const first = findFirstImage(node);

        const links: Array<[string, string]> = [[deckHref, tWith('slides_view_all', { total: count })]];
        if (pdf) links.push([pdf, t('slides_pdf')]);
        if (video) links.push([video, t('slides_video')]);
        const caption: ElementContent[] = [];
        if (title) {
          caption.push(element('strong', {}, [{ type: 'text', value: title }]), element('br', {}, []));
        }
        links.forEach(([href, label], i) => {
          if (i > 0) caption.push({ type: 'text', value: ' · ' });
          caption.push(element('a', { href }, [{ type: 'text', value: label }]));
        });

        node.tagName = 'figure';
        node.properties = {};
        node.children = [
          ...(first
            ? [element('a', { href: deckHref }, [element('img', { src: first.properties.src, alt: first.properties.alt ?? '' }, [])])]
            : []),
          element('figcaption', {}, caption),
        ];
      }
    });
  };
}

/**
 * Build-time markdown → HTML string for non-React surfaces (feeds). Runs the
 * same author-facing syntax set as `MarkdownRenderer` — GFM, GitHub alerts,
 * VuePress containers, code groups, slide decks, wikilinks, math — so extended syntax
 * renders instead of leaking as literal text. Deliberately skipped: Shiki
 * (readers don't load our CSS; plain <pre><code> is correct), rehype-slug
 * (heading anchors are meaningless in a feed), and rehype-image-metadata
 * (dimension probing serves the on-page <Image> pipeline). Image paths still
 * resolve exactly as on the page when `absoluteUrls` is set: both surfaces
 * share `resolveContentImagePath`.
 *
 * Math renders through KaTeX with MathML-only output: readers never load the
 * KaTeX stylesheet, and bare MathML renders natively in modern engines.
 */
export function markdownToHtml(markdown: string, options: MarkdownToHtmlOptions = {}): string {
  const { slugRegistry, math = false, absoluteUrls, locale = siteConfig.i18n.defaultLocale } = options;

  const source = math
    ? normalizeVuepressBlockMath(normalizeVuepressContainerSyntax(markdown))
    : normalizeVuepressContainerSyntax(markdown);

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubAlerts)
    .use(remarkDirective)
    .use(remarkCodeGroup)
    .use(remarkSlideDeck, { assetBase: absoluteUrls?.imageBaseSlug })
    .use(remarkVuepressContainers);
  if (slugRegistry && slugRegistry.size > 0) {
    processor.use(remarkWikilinks, { slugRegistry });
  }
  if (math) {
    processor.use(remarkMath);
  }
  processor
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypePlainComponents, { pageUrl: absoluteUrls?.pageUrl, locale });
  if (math) {
    processor.use(rehypeKatex, {
      output: 'mathml',
      // Mirror MarkdownRenderer: CJK text in math mode is fine, everything
      // else KaTeX complains about is still worth a warning.
      strict: (code: string) => (code === 'unicodeTextInMathMode' ? 'ignore' : 'warn'),
    });
  }
  if (absoluteUrls) {
    processor.use(rehypeAbsoluteUrls, absoluteUrls);
  }

  return String(processor.use(rehypeStringify).processSync(source));
}

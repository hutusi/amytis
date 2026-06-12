import React from 'react';
import { PROSE_CLASSES } from '@/lib/prose-classes';
import ReactMarkdown, { Components, ExtraProps } from 'react-markdown';
import RssFeedWidget from '@/components/RssFeedWidget';
import Mermaid from '@/components/Mermaid';
import CodeBlock from '@/components/CodeBlock';
import CodeGroup from '@/components/CodeGroup';
import GithubAlert from '@/components/GithubAlert';
import KatexStyles from '@/components/KatexStyles';
import ExternalLinkIcon from '@/components/ExternalLinkIcon';
import ArticleCopyCleaner from '@/components/ArticleCopyCleaner';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkCodeGroup from '@/lib/remark-code-group';
import remarkGithubAlerts from '@/lib/remark-github-alerts';
import remarkVuepressContainers, { normalizeVuepressContainerSyntax } from '@/lib/remark-vuepress-containers';
import { normalizeVuepressBlockMath } from '@/lib/normalize-vuepress-math';
import remarkBookChapterLinks, { type BookChapterLinksOptions } from '@/lib/remark-book-chapter-links';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeImageMetadata from '@/lib/rehype-image-metadata';
import rehypeFenceMeta from '@/lib/rehype-fence-meta';
import { siteConfig } from '../../site.config';
import remarkWikilinks from '@/lib/remark-wikilinks';
import ExportedImage from 'next-image-export-optimizer';
import { PluggableList } from 'unified';
import type { SlugRegistryEntry } from '@/lib/content/discovery';
import { shouldBypassImageOptimization } from '@/lib/image-utils';
import { parseFenceMeta } from '@/lib/shiki';
import { isExternalUrl } from '@/lib/urls';


// Flatten an arbitrary React children tree to its text content. Used by the
// raw-HTML <mermaid> handler below — react-markdown hands us the mermaid
// source as a tree of text nodes (possibly nested through whitespace-only
// wrappers) and the Mermaid component expects a single string.
function flattenChildrenToText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenChildrenToText).join('');
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children;
    return flattenChildrenToText(children);
  }
  return '';
}

interface MarkdownRendererProps {
  content: string;
  latex?: boolean;
  slug?: string;
  slugRegistry?: Map<string, SlugRegistryEntry>;
  /**
   * Set when rendering a book chapter. Enables inter-chapter `.md` link
   * rewriting and `:::container` → GitHub Alert conversion (the latter runs
   * for everyone, but the link rewriter needs source-path context).
   */
  bookContext?: BookChapterLinksOptions;
  /**
   * Set when rendering multiple documents on one page (e.g. the flow stream)
   * to keep rehype-slug heading ids unique across documents. Note GFM footnote
   * ids come from remark-rehype, not rehype-slug, and are not prefixed.
   */
  headingIdPrefix?: string;
}

export default function MarkdownRenderer({ content, latex = false, slug, slugRegistry, bookContext, headingIdPrefix }: MarkdownRendererProps) {
  // remark-directive must precede remark-code-group AND remark-vuepress-containers
  // so they see parsed containerDirective nodes. Order vs remark-gfm doesn't matter
  // — they touch disjoint node types.
  const remarkPlugins: PluggableList = [
    remarkGfm,
    remarkGithubAlerts,
    remarkDirective,
    remarkCodeGroup,
    remarkVuepressContainers,
  ];
  if (bookContext) {
    remarkPlugins.push([remarkBookChapterLinks, bookContext]);
  }
  const cdnBaseUrl = siteConfig.images?.cdnBaseUrl ?? '';
  // rehypeFenceMeta must run BEFORE rehypeRaw — rehypeRaw round-trips through HTML
  // serialization, which drops node.data.meta (a non-HTML field). Copying meta to a
  // real data-meta attribute first lets it survive the round trip.
  const rehypePlugins: PluggableList = [
    rehypeFenceMeta,
    rehypeRaw,
    headingIdPrefix ? [rehypeSlug, { prefix: headingIdPrefix }] : rehypeSlug,
    [rehypeImageMetadata, { slug, cdnBaseUrl }],
  ];

  if (slugRegistry && slugRegistry.size > 0) {
    remarkPlugins.push([remarkWikilinks, { slugRegistry }]);
  }

  if (latex) {
    remarkPlugins.push(remarkMath);
    // Silence only KaTeX's `unicodeTextInMathMode` warnings — Chinese-language
    // books routinely write math like `$输入$` or `$h_{隐藏状态}$` and KaTeX
    // renders the CJK characters fine; the warning is pure noise (one log per
    // character per chapter view). A bare `strict: 'ignore'` would silence
    // *every* KaTeX strict check including genuinely broken math, so use a
    // predicate that targets just this transgression.
    rehypePlugins.push([rehypeKatex, {
      strict: (code: string) => (code === 'unicodeTextInMathMode' ? 'ignore' : 'warn'),
    }]);
  }

  const components: Components = {
    // Use 'p' by default, but fallback to 'div' only if children contain block elements
    // to avoid invalid HTML nesting warnings while preserving semantics.
    p: ({ children }) => {
      // Check if any child is a block-level element (like Mermaid or CodeBlock)
      // Since children is a ReactNode, we can only do a shallow check here.
      // Simple heuristic: if any child is not a string/number, it *might* be a block.
      // However, react-markdown usually nests blocks at the top level.
      return <p className="mb-4 leading-relaxed text-foreground">{children}</p>;
    },
    // Explicitly style lists to ensure contrast
    li: ({ children }) => <li className="text-foreground">{children}</li>,
    // Explicitly style blockquotes
    blockquote: ({ children }) => <blockquote className="text-foreground border-l-accent italic">{children}</blockquote>,
    // Explicitly style bold text
    strong: ({ children }) => <strong className="text-heading font-semibold">{children}</strong>,
    // Wrap tables in a scrollable container
    table: (props) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, node: _node, ...rest } = props as React.TableHTMLAttributes<HTMLTableElement> & ExtraProps;
      return (
        <div className="overflow-x-auto my-8 border border-ink/[0.07] rounded-lg">
          <table {...rest} className="min-w-full text-left text-sm">
            {children}
          </table>
        </div>
      );
    },
    // Render 'pre' as a 'div' to allow block-level children
    pre: ({ children }) => <div className="not-prose w-full min-w-0 max-w-full">{children}</div>,
    // Style links individually to avoid hover-all issue
    a: (props) => {
      const { node, className, children, href, target, rel, ...rest } = props as React.AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps;
      // Preserve wikilink classes injected by remark-wikilinks — they have their own CSS styling
      if (className?.includes('wikilink')) {
        return <a {...rest} href={href} target={target} rel={rel} className={className}>{children}</a>;
      }
      const linkClass = "text-accent no-underline hover:underline transition-colors duration-200";
      if (isExternalUrl(href)) {
        // Image-as-link (`[![alt](img)](href)`): an inline arrow after the
        // image looks like a glyph, not a hint. The HAST `node` exposes the
        // pre-override children so we can spot an `<img>` child reliably —
        // by the time react-markdown passes `children` to us, our own `img`
        // override has already replaced the raw <img> with a component.
        const hastChildren = (node && 'children' in node) ? node.children : [];
        const isImageLink = hastChildren.length === 1 && 'tagName' in hastChildren[0] && hastChildren[0].tagName === 'img';
        return (
          <a
            {...rest}
            href={href}
            target={target ?? '_blank'}
            rel={rel ?? 'noopener noreferrer'}
            className={linkClass}
          >
            {children}
            {!isImageLink && <ExternalLinkIcon />}
          </a>
        );
      }
      return <a {...rest} href={href} target={target} rel={rel} className={linkClass}>{children}</a>;
    },
    // Custom code renderer: handles 'mermaid' blocks and syntax highlighting
    code(props: React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & ExtraProps) {
      const { className, children } = props;
      // [^\s]+ rather than \w+ so fences like ```c++ or ```objective-c++ are detected
      // as `c++` / `objective-c++` and not truncated to `c` at the punctuation boundary.
      const match = /language-([^\s]+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isMultiLine = String(children).includes('\n');

      // In react-markdown v10, 'inline' prop is removed.
      // We use className presence (e.g. language-js) or newline presence to detect code blocks.
      if (match || isMultiLine) {
        if (language === 'mermaid') {
          return <Mermaid chart={String(children).replace(/\n$/, '')} />;
        }
        // react-markdown v10 strips node.data before invoking overrides, so the
        // fence meta is surfaced as a real `data-meta` attribute by rehypeFenceMeta.
        const meta = (props as unknown as Record<string, unknown>)['data-meta'];
        const parsedMeta = parseFenceMeta(typeof meta === 'string' ? meta : undefined);
        return (
          <CodeBlock
            language={language}
            title={parsedMeta.title}
            showLineNumbers={parsedMeta.showLineNumbers}
            highlightLines={parsedMeta.highlightLines}
          >
            {String(children).replace(/\n$/, '')}
          </CodeBlock>
        );
      }

      return (
        <code className={className}>
          {children}
        </code>
      );
    },
    // Ensure video elements are responsive and always show controls
    video: (props: React.ClassAttributes<HTMLVideoElement> & React.VideoHTMLAttributes<HTMLVideoElement> & ExtraProps) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { node: _node, width: _w, height: _h, className: _cls, ...rest } = props;
      return (
        <video
          {...rest}
          controls
          className="max-w-full w-full h-auto rounded-lg my-4"
        />
      );
    },
    // Wrap iframes in a 16:9 responsive container (covers YouTube, Vimeo, Bilibili, etc.)
    iframe: (props: React.ClassAttributes<HTMLIFrameElement> & React.IframeHTMLAttributes<HTMLIFrameElement> & ExtraProps) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { node: _node, width: _w, height: _h, className: _cls, ...rest } = props;
      return (
        <div className="relative w-full my-6 rounded-lg overflow-hidden aspect-video">
          <iframe
            {...rest}
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      );
    },
    // Ensure images are responsive and styled, using optimized image if dimensions exist
    // In development mode, use unoptimized images since WebP versions don't exist yet
    img: (props: React.ClassAttributes<HTMLImageElement> & React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { src, alt, width, height, node: _node, style, ...rest } = props;
      const isDev = process.env.NODE_ENV === 'development';
      const imageSrc = src as string;
      const isExternal = imageSrc?.startsWith('http') || imageSrc?.startsWith('//');

      // Author-supplied inline `style` is a strong signal the <img> came from
      // raw HTML inside the markdown (typically inline icons like social-media
      // badges) rather than from a markdown `![alt](src)`. Markdown images
      // never carry a style attribute. Preserve the author's styling and
      // skip optimization for these — wrapping a 22px icon in <ExportedImage>
      // strips the style and renders it at its natural 500px size.
      if (style) {
        // width / height were destructured out of `rest` above, so re-apply
        // them here. Mixed author markup like `<img src="..." width="120"
        // style="border-radius:4px">` should keep its explicit sizing rather
        // than render at the SVG's natural dimensions.
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={alt || ''}
            width={width}
            height={height}
            style={style}
            {...rest}
            fetchPriority="low"
          />
        );
      }

      if (!isExternal) {
        const shouldBypassOptimization = shouldBypassImageOptimization(imageSrc);
        return (
          <ExportedImage
            src={imageSrc || ''}
            alt={alt || ''}
            width={width ? Number(width) : 1200}
            height={height ? Number(height) : 900}
            className="max-w-full h-auto rounded-lg my-4"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            unoptimized={isDev || shouldBypassOptimization}
            placeholder={shouldBypassOptimization ? 'empty' : 'blur'}
            style={(!width || !height) ? { width: '100%', height: 'auto' } : undefined}
            fetchPriority="low"
          />
        );
      }
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={imageSrc} alt={alt || ''} {...rest} fetchPriority="low" className="max-w-full h-auto rounded-lg my-4" />;
    },
  };

  // Merge custom HTML elements not in the Components type (e.g. web components used in MDX,
  // and the synthetic <code-group> / <github-alert> tagNames emitted by our remark plugins).
  //
  // VuePress component pass-throughs: imported VuePress books may use Vue
  // components like <Swiper>/<Slide> (image carousel), <ClientOnly>, <HomeHero>,
  // <ChatDemo>, <GlobalTOC>. hast/React lowercases these tags, and without a
  // handler React logs "The tag <swiper> is unrecognized in this browser". Map
  // each one to a passive renderer so the warnings go away and inner content
  // (where it makes sense) still appears as a graceful degradation.
  const allComponents = {
    ...components,
    'rss-feed': () => <RssFeedWidget />,
    'code-group': CodeGroup,
    'github-alert': GithubAlert,
    swiper: ({ children }: { children?: React.ReactNode }) => <div className="my-6 space-y-4">{children}</div>,
    slide: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    clientonly: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    globaltoc: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    homehero: () => null,
    chatdemo: () => null,
    // <mermaid>...graph syntax...</mermaid> is the VuePress inline form. We
    // already handle ```mermaid fenced blocks via the `code` renderer above;
    // route the raw-HTML form to the same Mermaid component by flattening
    // the children to a string.
    mermaid: ({ children }: { children?: React.ReactNode }) => (
      <Mermaid chart={flattenChildrenToText(children).trim()} />
    ),
    // <GitHubWrapper>...</GitHubWrapper> wraps GitHub project links / cards
    // in the fenix VuePress book. Pass children through unchanged — they're
    // usually a paragraph or an <a>/<img> the author wants to display.
    githubwrapper: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    // <words type='span' chapter='/' /> is a VuePress word-count widget that
    // we can't reproduce without the upstream counter. Render nothing — the
    // surrounding prose ("全文合计 X 字") degrades to "全文合计  字".
    words: () => null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return (
    <>
    {latex && <KatexStyles />}
    <ArticleCopyCleaner>
      <div className={PROSE_CLASSES}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={allComponents}
        >
          {latex
            ? normalizeVuepressBlockMath(normalizeVuepressContainerSyntax(content))
            : normalizeVuepressContainerSyntax(content)}
        </ReactMarkdown>
      </div>
    </ArticleCopyCleaner>
    </>
  );
}

import { getPostsWithLocaleOriginals } from './content/posts';
import { getAllFlows } from './content/flows';
import { buildSlugRegistry, type SlugRegistryEntry } from './content/discovery';
import { siteConfig } from '../../site.config';
import { getPostUrl, getFlowUrl, withTrailingSlash } from './urls';
import { resolveLocaleValue } from './i18n';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { markdownToHtml } from './markdown-to-html';
import { resolveImageUrl } from './json-ld';
import rehypeAbsoluteUrls, { type AbsoluteUrlsOptions } from './rehype-absolute-urls';
import { sanitizeRenderedRstHtml } from './rst-sanitize';


export interface FeedItem {
  title: string;
  url: string;
  date: Date;
  excerpt: string;
  /** Rendered HTML content for use in content:encoded / Atom <content> */
  content: string;
  tags: string[];
  authors?: string[];
}

/** Rewrite URLs in already-rendered HTML (rST) on its HAST, never as text. */
function absolutizeHtml(html: string, options: AbsoluteUrlsOptions): string {
  return String(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeAbsoluteUrls, options)
      .use(rehypeStringify)
      .processSync(html),
  );
}

/** The fields the feed needs from a post or flow to render full content. */
interface FeedContentSource {
  content: string;
  excerpt: string;
  renderedHtml?: string;
  sourceFormat?: 'markdown' | 'rst';
  latex?: boolean;
  /** Locale tree the entry came from (posts carry it; flows are default-only). */
  locale?: string;
  /** Public-relative base that co-located images resolve against. */
  imageBaseSlug?: string;
}

const escapeHtmlText = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Item HTML for content:encoded / Atom <content>. rST posts carry their real
 * HTML in renderedHtml, sanitized with the same allowlist the on-page
 * RstRenderer applies; when the docutils renderer didn't run (renderedHtml
 * unset) fall back to the plain-text excerpt — running rST source through a
 * Markdown parser mangles directives into literal text. Markdown posts go
 * through the shared full-syntax pipeline (alerts, containers, wikilinks,
 * math).
 */
function itemContentHtml(
  post: FeedContentSource,
  pageUrl: string,
  slugRegistry: Map<string, SlugRegistryEntry>,
): string {
  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  if (post.sourceFormat === 'rst') {
    if (!post.renderedHtml) {
      // Plain-text fallback: nothing to absolutize.
      return `<p>${escapeHtmlText(post.excerpt)}</p>`;
    }
    // docutils already resolved image paths against the asset base, so the
    // CDN prefix stays off here exactly as on the page.
    return absolutizeHtml(sanitizeRenderedRstHtml(post.renderedHtml), {
      pageUrl,
      siteUrl,
      imageBaseSlug: post.imageBaseSlug,
    });
  }
  return markdownToHtml(post.content, {
    slugRegistry,
    math: post.latex,
    absoluteUrls: {
      pageUrl,
      siteUrl,
      imageBaseSlug: post.imageBaseSlug,
      cdnBaseUrl: siteConfig.images?.cdnBaseUrl ?? '',
    },
  });
}

export type FeedType = 'main' | 'posts' | 'flows' | 'all';

/**
 * Returns feed items for RSS/Atom generation.
 * - 'main': Respects `siteConfig.feed.includeFlows`
 * - 'posts': Only posts
 * - 'flows': Only flows
 * - 'all': Both posts and flows, ignoring `includeFlows`
 */
export function getFeedItems(feedType: FeedType = 'main', includeFullContent: boolean = false): FeedItem[] {
  const { maxItems, includeFlows } = siteConfig.feed;
  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');

  // Full-content HTML rendering is the expensive part, so sort and apply the
  // maxItems cut on lightweight entries first and only render the survivors.
  interface FeedEntry {
    item: FeedItem;
    source: FeedContentSource;
  }

  const getPostEntries = (): FeedEntry[] => getPostsWithLocaleOriginals().map((post) => {
    const url = withTrailingSlash(`${baseUrl}${getPostUrl(post)}`);
    return {
      item: {
        title: post.title,
        url,
        date: new Date(post.date),
        excerpt: post.excerpt,
        content: '',
        tags: post.tags || [],
        authors: post.authors,
      },
      source: post,
    };
  });

  const getFlowEntries = (): FeedEntry[] => getAllFlows().map((flow) => {
    const url = withTrailingSlash(`${baseUrl}${getFlowUrl(flow.slug)}`);
    return {
      item: {
        title: flow.title,
        url,
        date: new Date(flow.date),
        excerpt: flow.excerpt,
        content: '',
        tags: flow.tags || [],
      },
      // Flows render on the page with `flows/<date>` as their asset base.
      source: { ...flow, imageBaseSlug: `flows/${flow.slug}` },
    };
  });

  let entries: FeedEntry[];
  if (feedType === 'posts') {
    entries = getPostEntries();
  } else if (feedType === 'flows') {
    entries = getFlowEntries();
  } else if (feedType === 'all') {
    entries = [...getPostEntries(), ...getFlowEntries()];
  } else {
    // main
    entries = includeFlows ? [...getPostEntries(), ...getFlowEntries()] : getPostEntries();
  }

  // Sort descending by date
  entries.sort((a, b) => b.item.date.getTime() - a.item.date.getTime());

  const kept = maxItems > 0 ? entries.slice(0, maxItems) : entries;

  if (!includeFullContent) {
    return kept.map(({ item }) => item);
  }

  // Per-entry registry: wikilinks inside a locale-original post must resolve
  // locale-first (the registries are memoized per locale, so this stays cheap).
  return kept.map(({ item, source }) => ({
    ...item,
    content: itemContentHtml(source, item.url, buildSlugRegistry(source.locale)),
  }));
}

const escapeXml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const escapeCdata = (v: string) => v.replace(/]]>/g, ']]]]><![CDATA[>');

export function generateRssFeed(feedType: FeedType, selfUrlPath: string): Response {
  const { format, content: contentMode } = siteConfig.feed;
  if (format === 'atom') {
    return new Response('Not Found', { status: 404 });
  }

  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const useFullContent = contentMode === 'full';
  const items = getFeedItems(feedType, useFullContent);
  const contentNs = useFullContent ? ' xmlns:content="http://purl.org/rss/modules/content/"' : '';
  const siteTitle = resolveLocaleValue(siteConfig.title, siteConfig.i18n.defaultLocale);
  const lastBuildDate = items[0]?.date.toUTCString() ?? new Date().toUTCString();

  const selfUrl = `${baseUrl}${selfUrlPath}`;

  const imageXml = siteConfig.ogImage
    ? `\n    <image>\n      <url>${escapeXml(resolveImageUrl(undefined, siteConfig.ogImage, baseUrl))}</url>\n      <title>${escapeXml(siteTitle)}</title>\n      <link>${escapeXml(baseUrl)}</link>\n    </image>`
    : '';

  const rssItemsXml = items
    .map((item) => {
      const fullContentXml = useFullContent
        ? `\n          <content:encoded><![CDATA[${escapeCdata(item.content)}]]></content:encoded>`
        : '';
      const authorsXml = item.authors?.length
        ? item.authors.map((a) => `\n          <dc:creator><![CDATA[${escapeCdata(a)}]]></dc:creator>`).join('')
        : '';
      return `
        <item>
          <title><![CDATA[${escapeCdata(item.title)}]]></title>
          <link>${escapeXml(item.url)}</link>
          <guid isPermaLink="true">${escapeXml(item.url)}</guid>
          <pubDate>${item.date.toUTCString()}</pubDate>
          <description><![CDATA[${escapeCdata(item.excerpt)}]]></description>${fullContentXml}${authorsXml}
          ${item.tags.map((tag) => `<category><![CDATA[${escapeCdata(tag)}]]></category>`).join('')}
        </item>`;
    })
    .join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"${contentNs}>
  <channel>
    <title><![CDATA[${escapeCdata(siteTitle)}]]></title>
    <link>${escapeXml(baseUrl)}</link>
    <description><![CDATA[${escapeCdata(resolveLocaleValue(siteConfig.description, siteConfig.i18n.defaultLocale))}]]></description>
    <language>${siteConfig.i18n.defaultLocale}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />${imageXml}
    ${rssItemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function generateAtomFeed(feedType: FeedType, selfUrlPath: string): Response {
  const { format, content: contentMode } = siteConfig.feed;
  if (format === 'rss') {
    return new Response('Not Found', { status: 404 });
  }

  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const useFullContent = contentMode === 'full';
  const items = getFeedItems(feedType, useFullContent);
  const feedUpdated = items[0]?.date.toISOString() ?? new Date().toISOString();

  const selfUrl = `${baseUrl}${selfUrlPath}`;

  const hasAllAuthors = items.every(item => item.authors && item.authors.length > 0);
  const siteTitle = resolveLocaleValue(siteConfig.title, siteConfig.i18n.defaultLocale);
  const defaultAuthor = siteConfig.posts?.authors?.default?.[0];
  const feedAuthorName = defaultAuthor ? defaultAuthor : siteTitle;
  const feedAuthorXml = hasAllAuthors ? '' : `\n  <author><name>${escapeXml(feedAuthorName)}</name></author>`;

  const entriesXml = items
    .map((item) => {
      const contentXml = useFullContent
        ? `<content type="html"><![CDATA[${escapeCdata(item.content)}]]></content>\n    <summary><![CDATA[${escapeCdata(item.excerpt)}]]></summary>`
        : `<summary><![CDATA[${escapeCdata(item.excerpt)}]]></summary>`;
      const authorsXml = item.authors?.map((a) => `<author><name>${escapeXml(a)}</name></author>`).join('') ?? '';
      const categoriesXml = item.tags.map((tag) => `<category term="${escapeXml(tag)}" />`).join('');
      return `
  <entry>
    <title><![CDATA[${escapeCdata(item.title)}]]></title>
    <link href="${escapeXml(item.url)}" />
    <id>${escapeXml(item.url)}</id>
    <published>${item.date.toISOString()}</published>
    <updated>${item.date.toISOString()}</updated>
    ${contentXml}
    ${authorsXml}
    ${categoriesXml}
  </entry>`;
    })
    .join('');

  const atomXml = `<?xml version="1.0" encoding="UTF-8" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title><![CDATA[${escapeCdata(resolveLocaleValue(siteConfig.title, siteConfig.i18n.defaultLocale))}]]></title>
  <link href="${escapeXml(baseUrl)}" />
  <link href="${escapeXml(selfUrl)}" rel="self" type="application/atom+xml" />
  <id>${escapeXml(selfUrl)}</id>
  <updated>${feedUpdated}</updated>
  <subtitle><![CDATA[${escapeCdata(resolveLocaleValue(siteConfig.description, siteConfig.i18n.defaultLocale))}]]></subtitle>${feedAuthorXml}
${entriesXml}
</feed>`;

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

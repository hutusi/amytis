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
  /** The page URL: RSS <link>, Atom <link href>. */
  url: string;
  /**
   * The item's permanent identity: RSS <guid>, Atom <id>. The page URL
   * unless a post sets `feedId` (see `src/lib/feed-id.ts`).
   */
  id: string;
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
    locale: post.locale,
    absoluteUrls: {
      pageUrl,
      siteUrl,
      imageBaseSlug: post.imageBaseSlug,
      cdnBaseUrl: siteConfig.images?.cdnBaseUrl ?? '',
    },
  });
}

/**
 * Two items sharing a feed id look like one item to a reader, which shows
 * one and silently drops the other. Canonical URLs are unique already, so a
 * clash means a `feedId` repeats another post's or matches another item's
 * page URL: fail the build rather than ship a feed that loses a post.
 */
export function assertUniqueFeedIds(items: ReadonlyArray<Pick<FeedItem, 'id' | 'url'>>): void {
  const urlById = new Map<string, string>();
  for (const { id, url } of items) {
    const other = urlById.get(id);
    if (other !== undefined) {
      throw new Error(
        `[amytis] Feed id "${id}" is shared by ${other} and ${url}. ` +
        'Feed readers would show only one of them. Give each post a distinct feedId ' +
        '(or remove a feedId that matches another page\'s URL).'
      );
    }
    urlById.set(id, url);
  }
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

  // An item's feed id (RSS <guid>, Atom <id>) is its url unless the post
  // sets feedId, and feed ids are permanent: readers keep every id they
  // have seen and show an unknown one as a new item. Keep the canonical
  // trailing-slash form exactly; changing it re-shows every item in every
  // reader once.
  const getPostEntries = (): FeedEntry[] => getPostsWithLocaleOriginals().map((post) => {
    const url = withTrailingSlash(`${baseUrl}${getPostUrl(post)}`);
    return {
      item: {
        title: post.title,
        url,
        id: post.feedId ?? url,
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
    // Permanent feed id too; see getPostEntries. Flows are date-keyed, so
    // they take no feedId override.
    const url = withTrailingSlash(`${baseUrl}${getFlowUrl(flow.slug)}`);
    return {
      item: {
        title: flow.title,
        url,
        id: url,
        date: new Date(flow.date),
        excerpt: flow.excerpt,
        content: '',
        tags: flow.tags || [],
      },
      // Flows render on the page with `flows/<date>` as their asset base.
      source: { ...flow, imageBaseSlug: `flows/${flow.slug}` },
    };
  });

  const postEntries = getPostEntries();
  const flowEntries = getFlowEntries();
  // Over every item any feed serves, so a clash fails each feed's build,
  // not only the firehose's.
  assertUniqueFeedIds([...postEntries, ...flowEntries].map(({ item }) => item));

  let entries: FeedEntry[];
  if (feedType === 'posts') {
    entries = postEntries;
  } else if (feedType === 'flows') {
    entries = flowEntries;
  } else if (feedType === 'all') {
    entries = [...postEntries, ...flowEntries];
  } else {
    // main
    entries = includeFlows ? [...postEntries, ...flowEntries] : postEntries;
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

/**
 * Characters XML 1.0 forbids anywhere in a document, CDATA included: C0
 * controls other than tab/LF/CR, lone surrogates, and U+FFFE/U+FFFF. One of
 * them in a title, excerpt, tag or post body makes the whole feed fail to
 * parse, while the page itself renders fine, so authors never notice (a
 * stray U+0008 pasted from a terminal, a YAML "\x01" escape). Strip them:
 * they carry no visible text. Both escapers run every value through this,
 * which covers all author text in the feeds.
 */
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|\p{Cs}/gu;

export const stripXmlIllegal = (v: string) => v.replace(XML_ILLEGAL, '');

const escapeXml = (v: string) =>
  stripXmlIllegal(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const escapeCdata = (v: string) => stripXmlIllegal(v).replace(/]]>/g, ']]]]><![CDATA[>');

/**
 * One RSS <item>. The <guid> is the item's permanent id; it is a permalink
 * only while it still is the page URL (a `feedId` override is opaque).
 */
export function rssItemXml(item: FeedItem, fullContent: boolean): string {
  const fullContentXml = fullContent
    ? `\n          <content:encoded><![CDATA[${escapeCdata(item.content)}]]></content:encoded>`
    : '';
  const authorsXml = item.authors?.length
    ? item.authors.map((a) => `\n          <dc:creator><![CDATA[${escapeCdata(a)}]]></dc:creator>`).join('')
    : '';
  const isPermaLink = item.id === item.url ? 'true' : 'false';
  return `
        <item>
          <title><![CDATA[${escapeCdata(item.title)}]]></title>
          <link>${escapeXml(item.url)}</link>
          <guid isPermaLink="${isPermaLink}">${escapeXml(item.id)}</guid>
          <pubDate>${item.date.toUTCString()}</pubDate>
          <description><![CDATA[${escapeCdata(item.excerpt)}]]></description>${fullContentXml}${authorsXml}
          ${item.tags.map((tag) => `<category><![CDATA[${escapeCdata(tag)}]]></category>`).join('')}
        </item>`;
}

/** One Atom <entry>; <id> is the item's permanent id, <link> its page. */
export function atomEntryXml(item: FeedItem, fullContent: boolean): string {
  const contentXml = fullContent
    ? `<content type="html"><![CDATA[${escapeCdata(item.content)}]]></content>\n    <summary><![CDATA[${escapeCdata(item.excerpt)}]]></summary>`
    : `<summary><![CDATA[${escapeCdata(item.excerpt)}]]></summary>`;
  const authorsXml = item.authors?.map((a) => `<author><name>${escapeXml(a)}</name></author>`).join('') ?? '';
  const categoriesXml = item.tags.map((tag) => `<category term="${escapeXml(tag)}" />`).join('');
  return `
  <entry>
    <title><![CDATA[${escapeCdata(item.title)}]]></title>
    <link href="${escapeXml(item.url)}" />
    <id>${escapeXml(item.id)}</id>
    <published>${item.date.toISOString()}</published>
    <updated>${item.date.toISOString()}</updated>
    ${contentXml}
    ${authorsXml}
    ${categoriesXml}
  </entry>`;
}

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

  const rssItemsXml = items.map((item) => rssItemXml(item, useFullContent)).join('');

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

  const entriesXml = items.map((item) => atomEntryXml(item, useFullContent)).join('');

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

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { getAllPosts, getAllFlows } from './markdown';
import { siteConfig } from '../../site.config';
import { getPostUrl, getFlowUrl } from './urls';
import { resolveLocale } from './i18n';

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

function markdownToHtml(markdown: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .processSync(markdown);
  return String(result);
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

  let items: FeedItem[] = [];

  const getPostItems = () => getAllPosts().map((post) => ({
    title: post.title,
    url: `${baseUrl}${getPostUrl(post)}`,
    date: new Date(post.date),
    excerpt: post.excerpt,
    content: includeFullContent ? markdownToHtml(post.content) : '',
    tags: post.tags || [],
    authors: post.authors,
  }));

  const getFlowItems = () => getAllFlows().map((flow) => ({
    title: flow.title,
    url: `${baseUrl}${getFlowUrl(flow.slug)}`,
    date: new Date(flow.date),
    excerpt: flow.excerpt,
    content: includeFullContent ? markdownToHtml(flow.content) : '',
    tags: flow.tags || [],
  }));

  if (feedType === 'posts') {
    items = getPostItems();
  } else if (feedType === 'flows') {
    items = getFlowItems();
  } else if (feedType === 'all') {
    items = [...getPostItems(), ...getFlowItems()];
  } else {
    // main
    items = includeFlows ? [...getPostItems(), ...getFlowItems()] : getPostItems();
  }

  // Sort descending by date
  items.sort((a, b) => b.date.getTime() - a.date.getTime());

  return maxItems > 0 ? items.slice(0, maxItems) : items;
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
  const siteTitle = resolveLocale(siteConfig.title);
  const lastBuildDate = items[0]?.date.toUTCString() ?? new Date().toUTCString();

  const selfUrl = `${baseUrl}${selfUrlPath}`;

  const imageXml = siteConfig.ogImage
    ? `\n    <image>\n      <url>${escapeXml(baseUrl + siteConfig.ogImage)}</url>\n      <title>${escapeXml(siteTitle)}</title>\n      <link>${escapeXml(baseUrl)}</link>\n    </image>`
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
    <description><![CDATA[${escapeCdata(resolveLocale(siteConfig.description))}]]></description>
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
  const siteTitle = resolveLocale(siteConfig.title);
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
  <title><![CDATA[${escapeCdata(resolveLocale(siteConfig.title))}]]></title>
  <link href="${escapeXml(baseUrl)}" />
  <link href="${escapeXml(selfUrl)}" rel="self" type="application/atom+xml" />
  <id>${escapeXml(selfUrl)}</id>
  <updated>${feedUpdated}</updated>
  <subtitle><![CDATA[${escapeCdata(resolveLocale(siteConfig.description))}]]></subtitle>${feedAuthorXml}
${entriesXml}
</feed>`;

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

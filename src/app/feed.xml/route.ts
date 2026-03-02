import { siteConfig } from '../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getFeedItems } from '@/lib/feed-utils';

export const dynamic = 'force-static';

export async function GET() {
  const { content: contentMode } = siteConfig.feed;
  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const items = getFeedItems();
  const useFullContent = contentMode === 'full';
  const contentNs = useFullContent ? ' xmlns:content="http://purl.org/rss/modules/content/"' : '';

  const rssItemsXml = items
    .map((item) => {
      const fullContentXml = useFullContent
        ? `\n          <content:encoded><![CDATA[${item.content}]]></content:encoded>`
        : '';
      return `
        <item>
          <title><![CDATA[${item.title}]]></title>
          <link>${item.url}</link>
          <guid>${item.url}</guid>
          <pubDate>${item.date.toUTCString()}</pubDate>
          <description><![CDATA[${item.excerpt}]]></description>${fullContentXml}
          ${item.tags.map((tag) => `<category>${tag}</category>`).join('')}
        </item>`;
    })
    .join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"${contentNs}>
  <channel>
    <title><![CDATA[${resolveLocale(siteConfig.title)}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${resolveLocale(siteConfig.description)}]]></description>
    <language>${siteConfig.i18n.defaultLocale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${rssItemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

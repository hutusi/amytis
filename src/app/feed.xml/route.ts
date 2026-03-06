import { siteConfig } from '../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getFeedItems } from '@/lib/feed-utils';

export const dynamic = 'force-static';

const escapeXml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const escapeCdata = (v: string) => v.replace(/]]>/g, ']]]]><![CDATA[>');

export async function GET() {
  const { format, content: contentMode } = siteConfig.feed;
  if (format === 'atom') {
    return new Response('Not Found', { status: 404 });
  }

  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const items = getFeedItems();
  const useFullContent = contentMode === 'full';
  const contentNs = useFullContent ? ' xmlns:content="http://purl.org/rss/modules/content/"' : '';
  const siteTitle = resolveLocale(siteConfig.title);
  const lastBuildDate = items[0]?.date.toUTCString() ?? new Date().toUTCString();

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
    <atom:link href="${escapeXml(baseUrl)}/feed.xml" rel="self" type="application/rss+xml" />${imageXml}
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

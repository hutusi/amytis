import { getAllPosts } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getPostUrl } from '@/lib/urls';

export const dynamic = 'force-static';

export async function GET() {
  const posts = getAllPosts();
  const baseUrl = siteConfig.baseUrl;

  const rssItemsXml = posts
    .map((post) => {
      const url = `${baseUrl}${getPostUrl(post)}`;
      return `
        <item>
          <title><![CDATA[${post.title}]]></title>
          <link>${url}</link>
          <guid>${url}</guid>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          <description><![CDATA[${post.excerpt}]]></description>
          ${post.tags ? post.tags.map(tag => `<category>${tag}</category>`).join('') : ''}
        </item>`;
    })
    .join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${resolveLocale(siteConfig.title)}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${resolveLocale(siteConfig.description)}]]></description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${rssItemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}

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
  if (format === 'rss') {
    return new Response('Not Found', { status: 404 });
  }

  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const items = getFeedItems();
  const useFullContent = contentMode === 'full';

  const entriesXml = items
    .map((item) => {
      const contentXml = useFullContent
        ? `<content type="html"><![CDATA[${escapeCdata(item.content)}]]></content>`
        : `<summary><![CDATA[${escapeCdata(item.excerpt)}]]></summary>`;
      const authorsXml = item.authors?.map((a) => `<author><name>${escapeXml(a)}</name></author>`).join('') ?? '';
      const categoriesXml = item.tags.map((tag) => `<category term="${escapeXml(tag)}" />`).join('');
      return `
  <entry>
    <title><![CDATA[${escapeCdata(item.title)}]]></title>
    <link href="${escapeXml(item.url)}" />
    <id>${escapeXml(item.url)}</id>
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
  <link href="${escapeXml(baseUrl)}/feed.atom" rel="self" type="application/atom+xml" />
  <id>${escapeXml(baseUrl)}/feed.atom</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle><![CDATA[${escapeCdata(resolveLocale(siteConfig.description))}]]></subtitle>
${entriesXml}
</feed>`;

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  });
}

import { siteConfig } from '../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getFeedItems } from '@/lib/feed-utils';

export const dynamic = 'force-static';

export async function GET() {
  const { content: contentMode } = siteConfig.feed;
  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const items = getFeedItems();
  const useFullContent = contentMode === 'full';

  const entriesXml = items
    .map((item) => {
      const contentXml = useFullContent
        ? `<content type="text"><![CDATA[${item.content}]]></content>`
        : `<summary><![CDATA[${item.excerpt}]]></summary>`;
      const authorsXml = item.authors?.map((a) => `<author><name>${a}</name></author>`).join('') ?? '';
      const categoriesXml = item.tags.map((tag) => `<category term="${tag}" />`).join('');
      return `
  <entry>
    <title><![CDATA[${item.title}]]></title>
    <link href="${item.url}" />
    <id>${item.url}</id>
    <updated>${item.date.toISOString()}</updated>
    ${contentXml}
    ${authorsXml}
    ${categoriesXml}
  </entry>`;
    })
    .join('');

  const atomXml = `<?xml version="1.0" encoding="UTF-8" ?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title><![CDATA[${resolveLocale(siteConfig.title)}]]></title>
  <link href="${baseUrl}" />
  <link href="${baseUrl}/feed.atom" rel="self" type="application/atom+xml" />
  <id>${baseUrl}/feed.atom</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle><![CDATA[${resolveLocale(siteConfig.description)}]]></subtitle>
${entriesXml}
</feed>`;

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  });
}

import type { MetadataRoute } from 'next';
import { siteConfig } from '../../site.config';

export const dynamic = 'force-static';

/**
 * robots.txt: allow everything and point crawlers at the sitemap (the only
 * way they discover it without a Search Console submission).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

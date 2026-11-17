import { Metadata } from 'next';
import { siteConfig } from '../../site.config';
import HomeBody from '@/components/page-bodies/HomeBody';
import { resolveLocaleValue } from '@/lib/i18n';
import { buildWebsiteJsonLd, serializeJsonLd } from '@/lib/json-ld';
import { siteTwitterHandles } from '@/lib/metadata';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

export const metadata: Metadata = {
  title: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
  description: resolveLocaleValue(siteConfig.description, DEFAULT_LOCALE),
  openGraph: {
    title: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
    description: resolveLocaleValue(siteConfig.description, DEFAULT_LOCALE),
    siteName: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
    url: siteConfig.baseUrl,
    type: 'website',
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
    description: resolveLocaleValue(siteConfig.description, DEFAULT_LOCALE),
    ...siteTwitterHandles(),
  },
};

export default function Home() {
  const websiteJsonLd = buildWebsiteJsonLd({
    siteTitle: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
    siteUrl: siteConfig.baseUrl,
    description: resolveLocaleValue(siteConfig.description, DEFAULT_LOCALE),
    inLanguage: DEFAULT_LOCALE,
  });

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
    <HomeBody locale={DEFAULT_LOCALE} />
    </>
  );
}

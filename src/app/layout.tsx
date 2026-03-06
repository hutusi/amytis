import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import BrowserDetectionBanner from "@/components/BrowserDetectionBanner";
import { siteConfig } from "../../site.config";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getAllSeries, getAllBooks, getSeriesData } from "@/lib/markdown";
import { resolveLocale } from "@/lib/i18n";
import "./globals.css";
import "katex/dist/katex.min.css";

const inter = localFont({
  src: [
    {
      path: "../fonts/Inter-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Inter-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
});

const baskerville = localFont({
  src: [
    {
      path: "../fonts/LibreBaskerville-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/LibreBaskerville-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/LibreBaskerville-Italic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-baskerville",
});

const siteTwitterHandle = (() => {
  const url = siteConfig.social?.twitter ?? '';
  const m = url.match(/(?:twitter\.com|x\.com)\/([^/?#]+)/);
  return m ? `@${m[1]}` : undefined;
})();

// Build icon metadata with explicit MIME type so browsers correctly handle
// all formats. Without this, .ico files served via the metadata API lack
// type="image/x-icon" and may be ignored in favour of app/favicon.ico.
const faviconSrc = siteConfig.logo?.favicon || "/icon.svg";
const ext = faviconSrc.split('.').pop()?.toLowerCase();
const faviconMeta =
  ext === 'ico' ? [{ url: faviconSrc, type: 'image/x-icon', sizes: 'any' }] :
  ext === 'png' ? [{ url: faviconSrc, type: 'image/png' }] :
  ext === 'svg' ? [{ url: faviconSrc, type: 'image/svg+xml' }] :
  faviconSrc;

const feedAlternates = (() => {
  const { format } = siteConfig.feed;
  const types: Record<string, string> = {};
  if (format === 'rss' || format === 'both') types['application/rss+xml'] = '/feed.xml';
  if (format === 'atom' || format === 'both') types['application/atom+xml'] = '/feed.atom';
  return Object.keys(types).length > 0 ? { types } : undefined;
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: resolveLocale(siteConfig.title),
  description: resolveLocale(siteConfig.description),
  icons: {
    icon: faviconMeta,
  },
  ...(feedAlternates && { alternates: feedAlternates }),
  openGraph: {
    siteName: resolveLocale(siteConfig.title),
    locale: siteConfig.i18n.defaultLocale,
    type: 'website',
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary',
    site: siteTwitterHandle,
    creator: siteTwitterHandle,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const features = siteConfig.features;

  // Build series list for navbar (only when series feature is enabled)
  const seriesNavItem = siteConfig.nav.find(item => item.url === '/series');
  const featuredSeries = seriesNavItem?.dropdown;
  let seriesList: { name: string; slug: string }[] = [];
  if (features?.series?.enabled !== false) {
    const allSeries = getAllSeries();
    const seriesKeys = Object.keys(allSeries).sort();
    const filteredKeys = featuredSeries && featuredSeries.length > 0
      ? seriesKeys.filter(slug => featuredSeries.includes(slug))
      : [];
    seriesList = filteredKeys.map(slug => ({
      name: getSeriesData(slug)?.title || allSeries[slug][0]?.series || slug,
      slug,
    }));
  }

  // Build books list for navbar (only when books feature is enabled)
  const booksNavItem = siteConfig.nav.find(item => item.url === '/books');
  const featuredBookSlugs = booksNavItem?.dropdown;
  let booksList: { name: string; slug: string }[] = [];
  if (features?.books?.enabled !== false) {
    const allBooks = getAllBooks();
    booksList = featuredBookSlugs && featuredBookSlugs.length > 0
      ? allBooks
          .filter(book => featuredBookSlugs.includes(book.slug))
          .map(book => ({ name: book.title, slug: book.slug }))
      : [];
  }

  return (
    <html lang={siteConfig.i18n.defaultLocale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${baskerville.variable} font-sans min-h-screen transition-colors duration-300`}
        data-palette={siteConfig.themeColor}
        suppressHydrationWarning
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <LanguageProvider>
            <div className="selection:bg-accent/20 selection:text-accent dark:selection:bg-accent/30 dark:selection:text-accent min-h-screen flex flex-col">
              <Navbar seriesList={seriesList} booksList={booksList} />
              <main id="main-content" className="pt-16 flex-grow">
                <BrowserDetectionBanner updateUrl={siteConfig.browserCheck?.updateUrl} />
                {children}
              </main>
              <Footer />
            </div>
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
import type { Metadata, Viewport } from "next";
import { isFeatureEnabled } from '@/lib/features';
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import BrowserDetectionBanner from "@/components/BrowserDetectionBanner";
// Import from config-schema (not site.config directly) so the build-time Zod
// validation runs: the root layout renders for every page, so a malformed
// config fails the build with a readable message.
import { siteConfig } from "@/lib/config-schema";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getTwinnedPathManifest } from "@/lib/locale-routes";
import { getAllSeries, getSeriesData } from '@/lib/content/series';
import { getAllBooks } from '@/lib/content/books';
import { resolveLocaleValue } from "@/lib/i18n";
import { siteTwitterHandles, withSiteAlternates } from "@/lib/metadata";
import "./globals.css";

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

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
  display: "swap",
});

const baskerville = localFont({
  src: [
    {
      path: "../fonts/LibreBaskerville-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/LibreBaskerville-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/LibreBaskerville-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-baskerville",
  display: "swap",
  // Size-adjust the fallback against a serif. The default (Arial) gives a
  // sans fallback whose metrics and look both jump when Baskerville swaps in.
  adjustFontFallback: "Times New Roman",
});

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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
  description: resolveLocaleValue(siteConfig.description, DEFAULT_LOCALE),
  icons: {
    icon: faviconMeta,
    // iOS home-screen icon (also fetched from this conventional path when a
    // page omits the link).
    apple: '/apple-touch-icon.png',
  },
  alternates: withSiteAlternates(),
  openGraph: {
    siteName: resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE),
    locale: siteConfig.i18n.defaultLocale,
    type: 'website',
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary',
    ...siteTwitterHandles(),
  },
};

// Browser chrome (mobile address bar, PWA title bar) matches the paper
// background in each scheme; colorScheme lets form controls and scrollbars
// pick the right defaults before next-themes stamps the explicit scheme.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#292524' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Build series list for navbar (only when series feature is enabled)
  const seriesNavItem = siteConfig.nav.find(item => item.url === '/series');
  const featuredSeries = seriesNavItem?.dropdown;
  let seriesList: { name: string; slug: string }[] = [];
  if (isFeatureEnabled('series')) {
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
  if (isFeatureEnabled('books')) {
    const allBooks = getAllBooks();
    booksList = featuredBookSlugs && featuredBookSlugs.length > 0
      ? allBooks
          .filter(book => featuredBookSlugs.includes(book.slug))
          .map(book => ({ name: book.title, slug: book.slug }))
      : [];
  }

  return (
    <html lang={siteConfig.i18n.defaultLocale} data-palette={siteConfig.themeColor} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${baskerville.variable} font-sans min-h-screen transition-colors duration-300`}
        suppressHydrationWarning
      >
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-contrast focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <LanguageProvider twinnedPaths={getTwinnedPathManifest()}>
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
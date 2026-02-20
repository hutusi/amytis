import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { siteConfig } from "../../site.config";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getAllSeries, getAllBooks } from "@/lib/markdown";
import { resolveLocale } from "@/lib/i18n";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: resolveLocale(siteConfig.title),
  description: resolveLocale(siteConfig.description),
  icons: {
    icon: "/icon.svg",
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
  const featuredSeries = (seriesNavItem as { dropdown?: string[] } | undefined)?.dropdown;
  let seriesList: { name: string; slug: string }[] = [];
  if (features?.series?.enabled !== false) {
    const allSeries = getAllSeries();
    const seriesKeys = Object.keys(allSeries).sort();
    const filteredKeys = featuredSeries && featuredSeries.length > 0
      ? seriesKeys.filter(slug => featuredSeries.includes(slug))
      : seriesKeys.slice(0, 5);
    seriesList = filteredKeys.map(slug => ({
      name: allSeries[slug][0]?.series || slug,
      slug,
    }));
  }

  // Build books list for navbar (only when books feature is enabled)
  const booksNavItem = siteConfig.nav.find(item => item.url === '/books');
  const featuredBookSlugs = (booksNavItem as { dropdown?: string[] } | undefined)?.dropdown;
  let booksList: { name: string; slug: string }[] = [];
  if (features?.books?.enabled !== false) {
    const allBooks = getAllBooks();
    booksList = featuredBookSlugs && featuredBookSlugs.length > 0
      ? allBooks
          .filter(book => featuredBookSlugs.includes(book.slug))
          .map(book => ({ name: book.title, slug: book.slug }))
      : allBooks.slice(0, 5).map(book => ({ name: book.title, slug: book.slug }));
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
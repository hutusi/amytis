import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import { siteConfig } from "../../site.config";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getAllSeries } from "@/lib/markdown";
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
  title: `${siteConfig.title}`,
  description: siteConfig.description,
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allSeries = getAllSeries();
  const featuredSeries = siteConfig.series?.navbar;
  
  const seriesKeys = Object.keys(allSeries).sort();
  const filteredKeys = featuredSeries 
    ? seriesKeys.filter(slug => featuredSeries.includes(slug))
    : seriesKeys.slice(0, 5);

  const seriesList = filteredKeys.map(slug => ({
    name: allSeries[slug][0]?.series || slug,
    slug,
  }));

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${baskerville.variable} font-sans min-h-screen transition-colors duration-300`}
        data-palette={siteConfig.themeColor}
      >
        <ThemeProvider>
          <LanguageProvider>
            <div className="selection:bg-accent/20 selection:text-accent dark:selection:bg-accent/30 dark:selection:text-accent min-h-screen flex flex-col">
              <Navbar seriesList={seriesList} />
              <main className="pt-16 flex-grow">
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
import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import { siteConfig } from "../../site.config";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  title: `${siteConfig.title} | Digital Garden`,
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${baskerville.variable} font-sans min-h-screen transition-colors duration-300`}
      >
        <ThemeProvider>
          <div className="selection:bg-emerald-100 selection:text-emerald-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100">
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
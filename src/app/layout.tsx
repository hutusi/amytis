import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import Navbar from "@/components/Navbar";
import { siteConfig } from "../../amytis.config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const baskerville = Libre_Baskerville({
  weight: ["400", "700"],
  variable: "--font-baskerville",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${siteConfig.title} | Digital Garden`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${baskerville.variable} font-sans min-h-screen transition-colors duration-300`}
      >
        <div className="selection:bg-emerald-100 selection:text-emerald-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100">
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
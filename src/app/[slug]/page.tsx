import { getPageBySlug, getAllPages } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { Metadata } from 'next';
import { siteConfig } from '../../../site.config';
import { resolveLocale } from '@/lib/i18n';

/**
 * Generates the static paths for all top-level pages at build time.
 */
export async function generateStaticParams() {
  const pages = getAllPages();
  return pages.map((page) => ({
    slug: page.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const page = getPageBySlug(slug);

  if (!page) {
    return { title: 'Page Not Found' };
  }

  return {
    title: `${page.title} | ${resolveLocale(siteConfig.title)}`,
    description: page.excerpt,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const page = getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  // Determine layout based on frontmatter, defaulting to 'simple' for pages
  const layout = page.layout || 'simple';

  if (layout === 'post') {
    return <PostLayout post={page} />;
  }

  return <SimpleLayout post={page} />;
}

import { MetadataRoute } from 'next';
import { getAllPosts, getAllPages, getAllBooks, getAllFlows } from '@/lib/markdown';
import { siteConfig } from '../../site.config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const pages = getAllPages();
  const books = getAllBooks();
  const flows = getAllFlows();
  const baseUrl = siteConfig.baseUrl;

  const postUrls = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const pageUrls = pages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: page.date, // Pages might not have date, fallback? 
    // markdown.ts logic provides default date if missing.
    changeFrequency: 'yearly' as const,
    priority: 0.8,
  }));

  const bookUrls = books.flatMap((book) => [
    {
      url: `${baseUrl}/books/${book.slug}`,
      lastModified: book.date,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    ...book.chapters.map((ch) => ({
      url: `${baseUrl}/books/${book.slug}/${ch.file}`,
      lastModified: book.date,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]);

  const flowUrls = flows.map((flow) => ({
    url: `${baseUrl}/flows/${flow.slug}`,
    lastModified: flow.date,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/books`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...pageUrls,
    ...postUrls,
    ...bookUrls,
    {
      url: `${baseUrl}/flows`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    ...flowUrls,
  ];
}

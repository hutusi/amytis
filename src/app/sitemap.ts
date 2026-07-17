import { MetadataRoute } from 'next';
import { getAllPosts, getAllPages } from '@/lib/content/posts';
import { getAllFlows } from '@/lib/content/flows';
import { getAllNotes } from '@/lib/content/notes';
import { getAllBooks } from '@/lib/content/books';
import { getAllSeries } from '@/lib/content/series';
import { getAllAuthors, getAuthorSlug } from '@/lib/content/authors';
import { getAllTags } from '@/lib/content/discovery';
import { isFeatureEnabled } from '@/lib/features';
import { siteConfig } from '../../site.config';
import {
  getPostUrl,
  getBookUrl,
  getBookChapterUrl,
  getSeriesUrl,
  getSeriesListUrl,
  getNoteUrl,
  withTrailingSlash,
} from '@/lib/urls';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const pages = getAllPages();
  const baseUrl = siteConfig.baseUrl;

  // Feature-aware: the routes for a disabled feature call notFound(), so their
  // URLs must not be advertised. posts is the base surface and always present.
  const seriesEnabled = isFeatureEnabled('series');
  const booksEnabled = isFeatureEnabled('books');
  const flowEnabled = isFeatureEnabled('flow'); // gates both flows and notes

  const postUrls = posts.map((post) => ({
    url: `${baseUrl}${getPostUrl(post)}`,
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

  // Series — list page + each series detail
  const seriesEntry = getAllSeries();
  const seriesUrls = seriesEnabled
    ? Object.entries(seriesEntry).map(([slug, seriesPosts]) => ({
        url: `${baseUrl}${getSeriesUrl(slug)}`,
        lastModified: seriesPosts.reduce((latest, p) => (p.date > latest ? p.date : latest), ''),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }))
    : [];

  // Books — list page + each book and its chapters
  const bookUrls = booksEnabled
    ? getAllBooks().flatMap((book) => [
        {
          url: `${baseUrl}${getBookUrl(book.slug)}`,
          lastModified: book.date,
          changeFrequency: 'monthly' as const,
          priority: 0.8,
        },
        ...book.chapters.map((ch) => ({
          url: `${baseUrl}${getBookChapterUrl(book.slug, ch.id)}`,
          lastModified: book.date,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        })),
      ])
    : [];

  // Notes — gated with flows under the flow feature
  const noteUrls = flowEnabled
    ? getAllNotes().map((note) => ({
        url: `${baseUrl}${getNoteUrl(note.slug)}`,
        lastModified: note.date,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }))
    : [];

  // Flows — detail entries plus year/month listing pages
  const flows = flowEnabled ? getAllFlows() : [];
  const flowUrls = flows.map((flow) => ({
    url: `${baseUrl}/flows/${flow.slug}`,
    lastModified: flow.date,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const flowYears = new Set<string>();
  const flowMonths = new Set<string>();
  flows.forEach(flow => {
    const [year, month] = flow.slug.split('/');
    flowYears.add(year);
    flowMonths.add(`${year}/${month}`);
  });

  const flowYearUrls = Array.from(flowYears).map(year => ({
    url: `${baseUrl}/flows/${year}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const flowMonthUrls = Array.from(flowMonths).map(ym => ({
    url: `${baseUrl}/flows/${ym}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Authors — canonical slug URL only (no /authors index route exists)
  const authorUrls = Object.keys(getAllAuthors()).map((name) => ({
    url: `${baseUrl}/authors/${getAuthorSlug(name)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Tag detail pages. Encode the lowercased tag exactly as the Tag component's
  // href does, so special-character tags (spaces, `c#`, `a/b`) stay valid URLs.
  const tagUrls = Object.keys(getAllTags()).map((tag) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(tag.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  const entries: MetadataRoute.Sitemap = [
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
    ...(seriesEnabled
      ? [{
          url: `${baseUrl}${getSeriesListUrl()}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }]
      : []),
    ...(booksEnabled
      ? [{
          url: `${baseUrl}/books`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }]
      : []),
    ...(flowEnabled
      ? [
          {
            url: `${baseUrl}/flows`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
          },
          {
            url: `${baseUrl}/notes`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          },
        ]
      : []),
    ...pageUrls,
    ...postUrls,
    ...seriesUrls,
    ...bookUrls,
    ...noteUrls,
    ...authorUrls,
    ...tagUrls,
    ...flowYearUrls,
    ...flowMonthUrls,
    ...flowUrls,
  ];

  // Advertise the canonical trailing-slash form: with trailingSlash: true the
  // export serves /path/index.html, so the bare /path variant is a redirect
  // hop for crawlers on most static hosts.
  return entries.map((entry) => ({ ...entry, url: withTrailingSlash(entry.url) }));
}

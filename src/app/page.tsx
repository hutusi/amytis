import { getAllPosts, getAllSeries, getSeriesData, getFeaturedPosts, getFeaturedBooks, getRecentFlows } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import Hero from '@/components/Hero';
import CuratedSeriesSection, { SeriesItem } from '@/components/CuratedSeriesSection';
import FeaturedStoriesSection, { FeaturedPost } from '@/components/FeaturedStoriesSection';
import SelectedBooksSection, { BookItem } from '@/components/SelectedBooksSection';
import LatestWritingSection from '@/components/LatestWritingSection';
import RecentNotesSection, { RecentNoteItem } from '@/components/RecentNotesSection';
import { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: resolveLocale(siteConfig.title),
  description: resolveLocale(siteConfig.description),
  openGraph: {
    title: resolveLocale(siteConfig.title),
    description: resolveLocale(siteConfig.description),
    siteName: resolveLocale(siteConfig.title),
    type: 'website',
  },
};

export default function Home() {
  const allPosts = getAllPosts();
  const allSeries = getAllSeries();
  const featuredPosts = getFeaturedPosts();
  const featuredBooks = getFeaturedBooks();
  const recentFlows = getRecentFlows(siteConfig.flows?.recentCount ?? 5);

  const pageSize = siteConfig.pagination.posts;
  const posts = allPosts.slice(0, pageSize);

  const featuredConfig = siteConfig.featured || { series: { scrollThreshold: 2, maxItems: 6 }, stories: { scrollThreshold: 1, maxItems: 5 } };

  // Prepare serializable series data for the client component
  const seriesItems: SeriesItem[] = Object.keys(allSeries).map(name => {
    const seriesPosts = allSeries[name];
    const slug = name.toLowerCase().replace(/ /g, '-');
    const seriesData = getSeriesData(slug);
    return {
      name,
      title: seriesData?.title || name,
      excerpt: seriesData?.excerpt || "A growing collection of related thoughts.",
      coverImage: seriesData?.coverImage,
      url: `/series/${slug}`,
      postCount: seriesPosts.length,
      topPosts: seriesPosts.slice(0, 3).map(p => ({ slug: p.slug, title: p.title })),
    };
  });

  // Prepare serializable books data
  const bookItems: BookItem[] = featuredBooks.map(b => ({
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt,
    coverImage: b.coverImage,
    authors: b.authors,
    chapterCount: b.chapters.length,
    firstChapter: b.chapters[0]?.file,
  }));

  // Prepare serializable flow data
  const recentNoteItems: RecentNoteItem[] = recentFlows.map(f => ({
    slug: f.slug,
    date: f.date,
    title: f.title,
    excerpt: f.excerpt,
  }));

  // Prepare serializable featured posts data
  const featuredItems: FeaturedPost[] = featuredPosts.map(p => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    date: p.date,
    category: p.category,
    readingTime: p.readingTime,
    coverImage: p.coverImage,
  }));

  return (
    <div>
      <Hero
        tagline={siteConfig.hero.tagline}
        title={siteConfig.hero.title}
        subtitle={siteConfig.hero.subtitle}
      />

      <div className="layout-main pt-0 md:pt-0">
        <CuratedSeriesSection
          allSeries={seriesItems}
          maxItems={featuredConfig.series.maxItems}
          scrollThreshold={featuredConfig.series.scrollThreshold}
        />

        <SelectedBooksSection books={bookItems} />

        <FeaturedStoriesSection
          allFeatured={featuredItems}
          maxItems={featuredConfig.stories.maxItems}
          scrollThreshold={featuredConfig.stories.scrollThreshold}
        />

        <LatestWritingSection posts={posts} totalCount={allPosts.length} />

        <RecentNotesSection notes={recentNoteItems} />
      </div>
    </div>
  );
}

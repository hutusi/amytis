import type { ReactNode } from 'react';
import { getAllPosts, getAllFlows, getAllSeries, getFeaturedSeries, getSeriesData, getFeaturedPosts, getAllBooks, getFeaturedBooks, getRecentFlows } from '@/lib/markdown';
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
    url: siteConfig.baseUrl,
    type: 'website',
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary',
    title: resolveLocale(siteConfig.title),
    description: resolveLocale(siteConfig.description),
  },
};

type HomepageSection = {
  id: string;
  enabled?: boolean;
  weight: number;
  maxItems?: number;
  scrollThreshold?: number;
};

export default function Home() {
  const features = siteConfig.features;

  // Resolve ordered, enabled homepage sections from config
  const sections = ([...(siteConfig.homepage?.sections as HomepageSection[] ?? [])])
    .filter(s => s.enabled !== false)
    .sort((a, b) => a.weight - b.weight);

  const has = (id: string) => sections.some(s => s.id === id);

  // Derive per-section maxItems upfront for data loading
  const recentFlowsMax = sections.find(s => s.id === 'recent-flows')?.maxItems ?? siteConfig.flows?.recentCount ?? 5;
  const latestPostsMax = sections.find(s => s.id === 'latest-posts')?.maxItems ?? siteConfig.pagination.posts;

  // Load data only for sections that are both enabled on homepage and globally
  const allSeries = has('featured-series') && features?.series?.enabled !== false ? getFeaturedSeries() : {};
  const featuredBooks = has('featured-books') && features?.books?.enabled !== false ? getFeaturedBooks() : [];
  const recentFlows = has('recent-flows') && features?.flow?.enabled !== false
    ? getRecentFlows(recentFlowsMax)
    : [];
  const needsPosts = has('featured-posts') || has('latest-posts');
  const allPosts = needsPosts && features?.posts?.enabled !== false ? getAllPosts() : [];
  const featuredPosts = has('featured-posts') && features?.posts?.enabled !== false ? getFeaturedPosts() : [];

  const posts = allPosts.slice(0, latestPostsMax);

  // Prepare serializable data for client components
  const seriesItems: SeriesItem[] = has('featured-series') && features?.series?.enabled !== false
    ? Object.keys(allSeries).map(name => {
        const seriesPosts = allSeries[name];
        const slug = name; // name is already the series directory slug
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
      })
    : [];

  const bookItems: BookItem[] = has('featured-books') && features?.books?.enabled !== false
    ? featuredBooks.map(b => ({
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt,
        coverImage: b.coverImage,
        authors: b.authors,
        chapterCount: b.chapters.length,
        firstChapter: b.chapters[0]?.id,
      }))
    : [];

  const recentNoteItems: RecentNoteItem[] = has('recent-flows') && features?.flow?.enabled !== false
    ? recentFlows.map(f => ({
        slug: f.slug,
        date: f.date,
        excerpt: f.excerpt,
      }))
    : [];

  const featuredItems: FeaturedPost[] = has('featured-posts') && features?.posts?.enabled !== false
    ? featuredPosts.map(p => ({
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        excerpt: p.excerpt,
        date: p.date,
        category: p.category,
        readingTime: p.readingTime,
        coverImage: p.coverImage,
        series: p.series,
        pinned: p.pinned,
      }))
    : [];

  // Stats for hero navigation chips
  const heroPostCount = allPosts.length;
  const heroSeriesCount = has('hero') && features?.series?.enabled !== false ? Object.keys(getAllSeries()).length : undefined;
  const heroBookCount = has('hero') && features?.books?.enabled !== false ? getAllBooks().length : undefined;
  const heroFlowCount = has('hero') && features?.flow?.enabled !== false ? getAllFlows().length : undefined;

  const renderSection = (section: HomepageSection) => {
    switch (section.id) {
      case 'featured-series':
        if (features?.series?.enabled === false) return null;
        return (
          <CuratedSeriesSection
            key="featured-series"
            allSeries={seriesItems}
            maxItems={section.maxItems ?? 6}
            scrollThreshold={section.scrollThreshold ?? 2}
          />
        );
      case 'featured-books':
        if (features?.books?.enabled === false) return null;
        return (
          <SelectedBooksSection
            key="featured-books"
            books={bookItems}
            maxItems={section.maxItems ?? 4}
          />
        );
      case 'featured-posts':
        if (features?.posts?.enabled === false) return null;
        return (
          <FeaturedStoriesSection
            key="featured-posts"
            allFeatured={featuredItems}
            maxItems={section.maxItems ?? 4}
          />
        );
      case 'latest-posts':
        if (features?.posts?.enabled === false) return null;
        return <LatestWritingSection key="latest-posts" posts={posts} totalCount={allPosts.length} />;
      case 'recent-flows':
        if (features?.flow?.enabled === false) return null;
        return <RecentNotesSection key="recent-flows" notes={recentNoteItems} />;
      default:
        return null;
    }
  };

  // Build content sections, pairing latest-posts + recent-flows into a two-column layout
  const sectionsForContent = sections.filter(s => s.id !== 'hero');
  const latestIdx = sectionsForContent.findIndex(s => s.id === 'latest-posts');
  const flowsIdx = sectionsForContent.findIndex(s => s.id === 'recent-flows');
  const pairLatestFlows = latestIdx >= 0 && flowsIdx >= 0;

  // Show a divider after the two-column section when series follows it
  const divideBeforeSeries = pairLatestFlows
    && has('featured-series')
    && features?.series?.enabled !== false
    && seriesItems.length > 0;

  const renderList: ReactNode[] = [];
  const skippedIds = new Set<string>();

  for (const section of sectionsForContent) {
    if (skippedIds.has(section.id)) continue;

    if (pairLatestFlows && (section.id === 'latest-posts' || section.id === 'recent-flows')) {
      skippedIds.add(section.id === 'latest-posts' ? 'recent-flows' : 'latest-posts');
      const showLatest = features?.posts?.enabled !== false;
      const showFlows = features?.flow?.enabled !== false && recentNoteItems.length > 0;
      if (showLatest || showFlows) {
        renderList.push(
          <div key="latest-flows-combined" className={`grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 ${divideBeforeSeries ? 'mb-16' : 'mb-24'}`}>
            {showLatest && (
              <div className="lg:col-span-7">
                <LatestWritingSection posts={posts} totalCount={allPosts.length} />
              </div>
            )}
            {showFlows && (
              <div className="lg:col-span-5">
                <RecentNotesSection notes={recentNoteItems} />
              </div>
            )}
          </div>
        );
        if (divideBeforeSeries) {
          renderList.push(
            <div key="series-divider" className="border-t border-muted/10 mb-16" />
          );
        }
      }
    } else {
      renderList.push(renderSection(section));
    }
  }

  return (
    <div>
      {has('hero') && (
        <Hero
          tagline={siteConfig.hero.tagline}
          title={siteConfig.hero.title}
          subtitle={siteConfig.hero.subtitle}
          postCount={heroPostCount}
          seriesCount={heroSeriesCount}
          bookCount={heroBookCount}
          flowCount={heroFlowCount}
          featureNames={{
            flow:   features?.flow?.name,
            posts:  features?.posts?.name,
            series: features?.series?.name,
            books:  features?.books?.name,
          }}
        />
      )}

      <div className="layout-main pt-0 md:pt-0 [&>*:last-child]:mb-0">
        {renderList}
      </div>
    </div>
  );
}

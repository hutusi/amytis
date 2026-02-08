import { getAllPosts, getAllSeries, getSeriesData, getFeaturedPosts } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import Link from 'next/link';
import Hero from '@/components/Hero';
import PostList from '@/components/PostList';
import CuratedSeriesSection, { SeriesItem } from '@/components/CuratedSeriesSection';
import FeaturedStoriesSection, { FeaturedPost } from '@/components/FeaturedStoriesSection';

export default function Home() {
  const allPosts = getAllPosts();
  const allSeries = getAllSeries();
  const featuredPosts = getFeaturedPosts();

  const pageSize = siteConfig.pagination.posts;
  const posts = allPosts.slice(0, pageSize);

  const featuredConfig = siteConfig.featured || { series: { scrollThreshold: 2, maxItems: 6 }, stories: { scrollThreshold: 1, maxItems: 5 } };

  // Prepare serializable series data for the client component
  const seriesItems: SeriesItem[] = Object.keys(allSeries).map(name => {
    const seriesPosts = allSeries[name];
    const seriesData = getSeriesData(name.toLowerCase().replace(/ /g, '-'));
    return {
      name,
      title: seriesData?.title || name,
      excerpt: seriesData?.excerpt || "A growing collection of related thoughts.",
      coverImage: seriesData?.coverImage,
      url: `/series/${name.toLowerCase().replace(/ /g, '-')}`,
      postCount: seriesPosts.length,
      topPosts: seriesPosts.slice(0, 3).map(p => ({ slug: p.slug, title: p.title })),
    };
  });

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
        title={siteConfig.hero.title}
        subtitle={siteConfig.hero.subtitle}
      />

      <div className="layout-main pt-0 md:pt-0">
        <CuratedSeriesSection
          allSeries={seriesItems}
          maxItems={featuredConfig.series.maxItems}
          scrollThreshold={featuredConfig.series.scrollThreshold}
        />

        <FeaturedStoriesSection
          allFeatured={featuredItems}
          maxItems={featuredConfig.stories.maxItems}
          scrollThreshold={featuredConfig.stories.scrollThreshold}
        />

        {/* Latest Writing Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-serif font-bold text-heading">Latest Writing</h2>
            <Link href="/posts" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline focus:outline-none focus:text-accent">
              View All →
            </Link>
          </div>

          <PostList posts={posts} showTags={false} />

          {/* View all link */}
          {allPosts.length > pageSize && (
            <div className="mt-12 text-center">
              <Link
                href="/posts"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-muted/20 bg-muted/5 text-sm font-medium text-muted hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 no-underline"
              >
                <span>View all {allPosts.length} posts</span>
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

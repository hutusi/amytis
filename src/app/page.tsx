import { getAllPosts, getAllSeries, getSeriesData, getFeaturedPosts } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import Link from 'next/link';
import Hero from '@/components/Hero';
import HorizontalScroll from '@/components/HorizontalScroll';

export default function Home() {
  const allPosts = getAllPosts();
  const allSeries = getAllSeries();
  const featuredPosts = getFeaturedPosts();
  
  const pageSize = siteConfig.pagination.posts;
  const totalPages = Math.ceil(allPosts.length / pageSize);
  const posts = allPosts.slice(0, pageSize);

  // Get series names with configurable limits
  const seriesNames = Object.keys(allSeries).sort();
  const featuredConfig = siteConfig.featured || { series: { scrollThreshold: 2, maxItems: 6 }, stories: { scrollThreshold: 1, maxItems: 5 } };
  const displayedSeries = seriesNames.slice(0, featuredConfig.series.maxItems);
  const displayedFeatured = featuredPosts.slice(0, featuredConfig.stories.maxItems);

  return (
    <div>
      <Hero 
        title={siteConfig.hero.title} 
        subtitle={siteConfig.hero.subtitle} 
      />

      <div className="layout-main pt-0 md:pt-0">
        {/* Curated Series Section */}
        {seriesNames.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-serif font-bold text-heading">Curated Series</h2>
              <Link href="/series" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline focus:outline-none focus:text-accent">
                All Series →
              </Link>
            </div>
            <HorizontalScroll
              itemCount={displayedSeries.length}
              scrollThreshold={featuredConfig.series.scrollThreshold}
            >
              <div className={`flex gap-8 ${displayedSeries.length > featuredConfig.series.scrollThreshold ? 'pb-4' : ''}`}>
                {displayedSeries.map(name => {
                  const seriesPosts = allSeries[name];
                  const seriesData = getSeriesData(name.toLowerCase().replace(/ /g, '-'));
                  const title = seriesData?.title || name;
                  const seriesUrl = `/series/${name.toLowerCase().replace(/ /g, '-')}`;

                  return (
                    <div
                      key={name}
                      className={`card-base group flex flex-col p-0 overflow-hidden snap-start ${
                        displayedSeries.length > featuredConfig.series.scrollThreshold
                          ? 'w-[85vw] md:w-[calc(50%-1rem)] flex-shrink-0'
                          : 'flex-1'
                      }`}
                    >
                      <Link href={seriesUrl} className="relative h-56 w-full overflow-hidden bg-muted/10 block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-inset">
                        <img
                          src={seriesData?.coverImage || `https://images.unsplash.com/photo-1579783902614-a3fb39279c23?auto=format&fit=crop&w=800&q=80`}
                          alt={`${title} series cover`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                      </Link>
                      <div className="p-8 flex flex-col flex-1 relative z-10">
                        <div className="mb-4">
                          <span className="badge-accent">
                            {seriesPosts.length} Parts
                          </span>
                        </div>
                        <h3 className="mb-3 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors">
                          <Link href={seriesUrl} className="no-underline focus:outline-none focus:text-accent">
                            {title}
                          </Link>
                        </h3>
                        <p className="mb-6 text-muted font-serif italic line-clamp-2 text-base">
                          {seriesData?.excerpt || "A growing collection of related thoughts."}
                        </p>
                        <div className="mt-auto pt-6 border-t border-muted/10">
                          <div className="flex flex-col gap-2">
                            {seriesPosts.slice(0, 3).map((p, idx) => (
                              <Link
                                key={p.slug}
                                href={`/posts/${p.slug}`}
                                className="flex items-center gap-3 group/link no-underline"
                              >
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted/10 text-[10px] flex items-center justify-center font-mono text-muted group-hover/link:bg-accent/10 group-hover/link:text-accent transition-colors">
                                  {idx + 1}
                                </span>
                                <span className="text-sm text-foreground/80 group-hover/link:text-accent transition-colors truncate">
                                  {p.title}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </HorizontalScroll>
          </section>
        )}

        {/* Featured Posts Section */}
        {displayedFeatured.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-serif font-bold text-heading">Featured Stories</h2>
            </div>
            <HorizontalScroll
              itemCount={displayedFeatured.length}
              scrollThreshold={featuredConfig.stories.scrollThreshold}
            >
              <div className={`flex gap-8 ${displayedFeatured.length > featuredConfig.stories.scrollThreshold ? 'pb-4' : 'flex-col'}`}>
                {displayedFeatured.map(post => (
                  <div
                    key={post.slug}
                    className={`group snap-start ${
                      displayedFeatured.length > featuredConfig.stories.scrollThreshold
                        ? 'w-[90vw] md:w-[70vw] lg:w-[60vw] flex-shrink-0'
                        : 'w-full'
                    }`}
                  >
                    <div className={`grid grid-cols-1 ${displayedFeatured.length > featuredConfig.stories.scrollThreshold ? 'md:grid-cols-1 lg:grid-cols-12' : 'md:grid-cols-12'} gap-8 items-center`}>
                      <Link href={`/posts/${post.slug}`} className={`${displayedFeatured.length > featuredConfig.stories.scrollThreshold ? 'lg:col-span-7' : 'md:col-span-7'} relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted/10 block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background`}>
                        <img
                          src={post.coverImage || `https://images.unsplash.com/photo-1493612276216-9c59019558f7?auto=format&fit=crop&w=800&q=80`}
                          alt={`${post.title} cover image`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                      </Link>
                      <div className={`${displayedFeatured.length > featuredConfig.stories.scrollThreshold ? 'lg:col-span-5' : 'md:col-span-5'} flex flex-col justify-center`}>
                        <div className="flex items-center gap-3 text-xs font-mono text-muted mb-6">
                          <span className="text-accent uppercase tracking-wider">{post.category}</span>
                          <span>•</span>
                          <span>{post.readingTime}</span>
                        </div>
                        <h3 className="text-3xl md:text-4xl font-serif font-bold text-heading mb-6 leading-tight group-hover:text-accent transition-colors">
                          <Link href={`/posts/${post.slug}`} className="no-underline focus:outline-none focus:text-accent">
                            {post.title}
                          </Link>
                        </h3>
                        <p className="text-muted text-lg leading-relaxed mb-8 line-clamp-3">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-mono text-muted/80">
                          <span>{post.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </HorizontalScroll>
          </section>
        )}

        {/* Latest Writing Section */}
        <section>
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-serif font-bold text-heading">Latest Writing</h2>
            <Link href="/posts" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline focus:outline-none focus:text-accent">
              View All →
            </Link>
          </div>
          
          <div className="flex flex-col border-t border-muted/10">
            {posts.map(post => (
              <div key={post.slug} className="group py-8 border-b border-muted/10 flex flex-col md:flex-row gap-8 items-start transition-colors hover:bg-muted/5 -mx-4 px-4 rounded-xl">
                <div className="flex-1 flex flex-col h-full">
                  <div className="font-mono text-xs text-muted/60 mb-2">
                    {post.date}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-heading mb-3 group-hover:text-accent transition-colors leading-tight">
                    <Link href={`/posts/${post.slug}`} className="no-underline focus:outline-none focus:text-accent">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center gap-3 text-xs font-mono text-muted/70">
                    <span className="uppercase tracking-wider">{post.category}</span>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                  </div>
                </div>
                <Link href={`/posts/${post.slug}`} className="w-24 h-24 md:w-32 md:h-24 shrink-0 rounded-lg overflow-hidden bg-muted/10 block ml-4 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background">
                  <img
                    src={post.coverImage || `https://images.unsplash.com/photo-1493612276216-9c59019558f7?auto=format&fit=crop&w=800&q=80`}
                    alt={`${post.title} thumbnail`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-16 flex justify-center">
               <Link href="/posts/page/2" className="btn-secondary">
                 Older Posts →
               </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
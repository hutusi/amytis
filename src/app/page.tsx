import { getAllPosts, getAllSeries, getSeriesData } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import Link from 'next/link';
import Hero from '@/components/Hero';

export default function Home() {
  const allPosts = getAllPosts();
  const allSeries = getAllSeries();
  
  const page = 1;
  const pageSize = 9; 
  const totalPages = Math.ceil(allPosts.length / pageSize);
  const posts = allPosts.slice(0, pageSize);

  // Get series names
  const seriesNames = Object.keys(allSeries).sort();

  return (
    <div>
      <Hero 
        title={siteConfig.hero.title} 
        subtitle={siteConfig.hero.subtitle} 
      />

      <div className="layout-main pt-0 md:pt-0">
        {/* Series Section (if any) */}
        {seriesNames.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-serif font-bold text-heading">Curated Series</h2>
              <Link href="/series" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline">
                All Series →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {seriesNames.slice(0, 4).map(name => {
                const seriesPosts = allSeries[name];
                const seriesData = getSeriesData(name.toLowerCase().replace(/ /g, '-'));
                const title = seriesData?.title || name;
                const seriesUrl = `/series/${name.toLowerCase().replace(/ /g, '-')}`;
                
                              return (
                                <div key={name} className="card-base group">
                                  <div className="relative z-10">
                                    <span className="badge-accent">                        {seriesPosts.length} Articles
                      </span>
                      <h3 className="mb-4 font-serif text-3xl font-bold text-heading group-hover:text-accent transition-colors">
                        <Link href={seriesUrl} className="no-underline hover:underline transition-all">
                          {title}
                        </Link>
                      </h3>
                      <p className="mb-6 text-muted font-serif italic line-clamp-2">
                        {seriesData?.excerpt || "A growing collection of related thoughts."}
                      </p>
                      <div className="flex flex-col gap-2">
                        {seriesPosts.slice(0, 3).map(p => (
                          <Link 
                            key={p.slug} 
                            href={`/posts/${p.slug}`}
                            className="text-sm text-foreground/80 hover:text-accent hover:underline transition-colors no-underline truncate"
                          >
                            {p.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Latest Posts Grid */}
        <section>
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-serif font-bold text-heading">Latest Writing</h2>
            <Link href="/archive" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline">
              View Archive →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <PostCard key={post.slug} post={post} />
            ))}
                  </div>
          
                  {totalPages > 1 && (
                    <Pagination currentPage={page} totalPages={totalPages} />
                  )}
                  </section>
                </div>
              </div>
            );
          }
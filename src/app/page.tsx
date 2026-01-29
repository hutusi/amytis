import { getAllPosts, getAllSeries, getSeriesData } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import Link from 'next/link';

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
    <div className="layout-container">
      {/* Hero */}
      <header className="py-20 md:py-32 flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-center animate-fade-in">
           <span className="h-px w-12 bg-accent/30 mr-4"></span>
           <span className="text-xs font-sans font-bold uppercase tracking-[0.3em] text-accent/80">Digital Garden</span>
           <span className="h-px w-12 bg-accent/30 ml-4"></span>
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-heading leading-[1.1] tracking-tight mb-10 text-balance">
          {siteConfig.description}
        </h1>
        
        <p className="text-muted font-sans text-sm md:text-base max-w-xl mx-auto leading-relaxed opacity-80">
          A space for cultivating ideas, sharing technical knowledge, and exploring the art of software engineering.
        </p>
      </header>

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
                <div key={name} className="group relative overflow-hidden rounded-2xl border border-muted/20 bg-muted/5 p-8 transition-all hover:border-accent/30">
                  <div className="relative z-10">
                    <span className="mb-4 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
                      {seriesPosts.length} Articles
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
          <div className="mt-16 flex justify-center">
            <Pagination currentPage={page} totalPages={totalPages} />
          </div>
        )}
      </section>
    </div>
  );
}

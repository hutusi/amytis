import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import CoverImage from './CoverImage';

interface SeriesCatalogProps {
  posts: PostData[];
  startIndex?: number;
}

export default function SeriesCatalog({ posts, startIndex = 0 }: SeriesCatalogProps) {
  return (
    <div className="relative">
      {/* Timeline connector line */}
      <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-accent/40 via-muted/20 to-muted/10 hidden md:block" />

      <div className="space-y-6">
        {posts.map((post, index) => (
          <article key={post.slug} className="group relative">
            <Link
              href={`/posts/${post.slug}`}
              className="block no-underline"
            >
              <div className="flex gap-6 md:gap-8">
                {/* Left side: Number indicator */}
                <div className="hidden md:flex flex-col items-center">
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-muted/20 group-hover:border-accent/50 transition-colors">
                    <span className="text-sm font-mono font-bold text-muted group-hover:text-accent transition-colors">
                      {String(startIndex + index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Right side: Content card */}
                <div className="flex-1 rounded-2xl border border-muted/20 bg-muted/5 overflow-hidden transition-all duration-300 group-hover:border-accent/30 group-hover:bg-muted/10 group-hover:shadow-lg group-hover:shadow-accent/5">
                  <div className="flex flex-col sm:flex-row">
                    {/* Thumbnail */}
                    <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden bg-muted/10">
                      <CoverImage
                        src={post.coverImage}
                        title={post.title}
                        slug={post.slug}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Mobile number badge */}
                      <div className="absolute top-3 left-3 md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur border border-muted/20">
                        <span className="text-xs font-mono font-bold text-muted">
                          {String(startIndex + index + 1).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 sm:p-6 flex flex-col">
                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-muted mb-3">
                        <span>{post.date}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-accent/80">{post.readingTime}</span>
                        {post.category && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="uppercase tracking-wider">{post.category}</span>
                          </>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-serif text-xl font-bold text-heading mb-2 leading-snug group-hover:text-accent transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      {post.excerpt && (
                        <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-4">
                          {post.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="mt-auto flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted/10 text-muted/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {/* Series progress summary */}
      <div className="mt-10 pt-8 border-t border-muted/10 text-center">
        <p className="text-sm text-muted">
          <span className="font-mono text-accent">{posts.length}</span>
          {posts.length === 1 ? ' article' : ' articles'} in this series
        </p>
      </div>
    </div>
  );
}

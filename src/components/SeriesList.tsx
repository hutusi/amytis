import Link from 'next/link';
import { PostData } from '@/lib/markdown';

interface SeriesListProps {
  seriesName: string;
  posts: PostData[];
  currentSlug: string;
}

export default function SeriesList({ seriesName, posts, currentSlug }: SeriesListProps) {
  if (!posts || posts.length === 0) return null;

  const currentIndex = posts.findIndex(p => p.slug === currentSlug);
  const seriesSlug = seriesName.toLowerCase().replace(/ /g, '-');

  return (
    <div className="p-5 bg-muted/5 rounded-xl border border-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/series/${seriesSlug}`}
          className="group flex items-center gap-2 no-underline"
        >
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent">
            Series
          </span>
          <span className="text-[10px] text-muted">•</span>
          <span className="text-sm font-serif font-bold text-heading group-hover:text-accent transition-colors">
            {seriesName}
          </span>
        </Link>
        <span className="text-xs font-mono text-muted bg-muted/10 px-2 py-0.5 rounded-full">
          {currentIndex + 1}/{posts.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-accent/60 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / posts.length) * 100}%` }}
        />
      </div>

      {/* Posts list */}
      <ol className="space-y-2">
        {posts.map((post, index) => {
          const isCurrent = post.slug === currentSlug;
          const isPast = index < currentIndex;

          return (
            <li key={post.slug}>
              {isCurrent ? (
                <div className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg bg-accent/5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-mono font-bold flex items-center justify-center">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-semibold text-accent truncate">
                    {post.title}
                  </span>
                </div>
              ) : (
                <Link
                  href={`/posts/${post.slug}`}
                  className="group flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/5 no-underline transition-colors"
                >
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition-colors ${
                    isPast
                      ? 'bg-accent/20 text-accent'
                      : 'bg-muted/10 text-muted group-hover:bg-muted/20'
                  }`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-sm truncate transition-colors ${
                    isPast
                      ? 'text-foreground/70 group-hover:text-foreground'
                      : 'text-muted group-hover:text-foreground'
                  }`}>
                    {post.title}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-muted/10">
        <Link
          href={`/series/${seriesSlug}`}
          className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
        >
          View full series
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

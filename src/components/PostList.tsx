import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import CoverImage from './CoverImage';
import { getPostUrl } from '@/lib/urls';
import { t } from '@/lib/i18n';

interface PostListProps {
  posts: PostData[];
  showExcerpt?: boolean;
  showTags?: boolean;
  excerptLines?: 1 | 2;
}

export default function PostList({
  posts,
  showExcerpt = true,
  showTags = true,
  excerptLines = 2,
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        {t('no_posts')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.slug} className="group relative">
          {/* Cover link — sits above card content via z-index, tag/series links use z-10 to appear above it */}
          <Link
            href={getPostUrl(post)}
            className="absolute inset-0 z-0 rounded-2xl"
            aria-label={post.title}
          />

          {/* Content card */}
          <div className="rounded-2xl border border-muted/20 bg-muted/5 overflow-hidden transition-all duration-300 group-hover:border-accent/30 group-hover:bg-muted/10 group-hover:shadow-lg group-hover:shadow-accent/5">
            <div className="flex flex-col sm:flex-row">
              {/* Thumbnail */}
              <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden bg-muted/10">
                <CoverImage
                  src={post.coverImage}
                  title={post.title}
                  slug={post.slug}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Draft badge on mobile */}
                {post.draft && (
                  <div className="absolute top-3 left-3 text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded tracking-wider">
                    DRAFT
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 p-5 sm:p-6 flex flex-col overflow-hidden">
                {/* Meta info */}
                <div className="flex items-center gap-x-2 text-xs font-mono text-muted mb-3 overflow-hidden">
                  {post.category && (
                    <>
                      <span className="text-accent uppercase tracking-wider truncate min-w-0">{post.category}</span>
                      <span className="shrink-0">•</span>
                    </>
                  )}
                  <span className="shrink-0 whitespace-nowrap">{post.readingTime}</span>
                  <span className="shrink-0">•</span>
                  <span className="shrink-0 whitespace-nowrap">{post.date}</span>
                  {post.draft && (
                    <span className="hidden sm:inline text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded tracking-wider">
                      DRAFT
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl font-bold text-heading mb-2 leading-snug group-hover:text-accent transition-colors line-clamp-2">
                  {post.title}
                </h3>

                {/* Series indicator */}
                {post.series && post.seriesTitle && (
                  <p className="text-xs text-muted mb-2">
                    <Link
                      href={`/series/${post.series}`}
                      className="relative z-10 hover:text-accent transition-colors no-underline"
                    >
                      {t('series')}: {post.seriesTitle}
                    </Link>
                  </p>
                )}

                {/* Excerpt */}
                {showExcerpt && (post.subtitle || post.excerpt) && (
                  <p className={`text-sm text-muted leading-relaxed ${excerptLines === 1 ? 'line-clamp-1' : 'line-clamp-2 mb-4'}`}>
                    {post.subtitle || post.excerpt}
                  </p>
                )}

                {/* Tags */}
                {showTags && post.tags && post.tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map(tag => (
                      <Link
                        key={tag}
                        href={`/tags/${encodeURIComponent(tag.toLowerCase())}`}
                        className="relative z-10 text-xs px-2 py-0.5 rounded-full bg-muted/10 text-muted/70 hover:bg-accent/10 hover:text-accent transition-colors no-underline"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import CoverImage from './CoverImage';
import { getPostUrl } from '@/lib/urls';

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
        No posts found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.slug} className="group relative">
          <Link
            href={getPostUrl(post)}
            className="block no-underline"
          >
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-muted mb-3">
                    {post.category && (
                      <>
                        <span className="text-accent uppercase tracking-wider">{post.category}</span>
                        <span className="hidden sm:inline">•</span>
                      </>
                    )}
                    <span>{post.readingTime}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{post.date}</span>
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
          </Link>
        </article>
      ))}
    </div>
  );
}

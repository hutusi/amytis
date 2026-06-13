import Link from 'next/link';
import type { PostData } from '@/lib/content/types';
import CoverImage from './CoverImage';
import Tag from './Tag';
import { getPostUrl, getPostUrlInCollection } from '@/lib/urls';
import { padNumber } from '@/lib/format-utils';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { CARD_HOVER, COVER_ZOOM } from '@/lib/ui-classes';

interface SeriesCatalogProps {
  posts: PostData[];
  startIndex?: number;
  totalPosts?: number;
  collectionSlug?: string;
}

export default function SeriesCatalog({ posts, startIndex = 0, totalPosts, collectionSlug }: SeriesCatalogProps) {
  const total = totalPosts ?? posts.length;
  const postHref = (post: PostData) =>
    collectionSlug ? getPostUrlInCollection(post, collectionSlug) : getPostUrl(post);
  return (
    <div className="relative">
      {/* Timeline connector line */}
      <div className="absolute left-[19px] top-8 bottom-8 w-px bg-gradient-to-b from-accent/40 via-ink/[0.08] to-ink/[0.04] hidden md:block" />

      <div className="space-y-6">
        {posts.map((post, index) => (
          <article key={post.slug} className="group relative">
            {/* Cover link — sits above card content via z-index, tag links use z-10 to appear above it */}
            <Link
              href={postHref(post)}
              className="absolute inset-0 z-0 rounded-2xl"
              aria-label={post.title}
            />

            <div className="flex gap-6 md:gap-8">
              {/* Left side: Number indicator */}
              <div className="hidden md:flex flex-col items-center">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-ink/[0.08] group-hover:border-accent/50 transition-colors">
                  <span className="text-sm font-mono font-bold text-muted group-hover:text-accent transition-colors">
                    {padNumber(startIndex + index + 1)}
                  </span>
                </div>
              </div>

              {/* Right side: Content card */}
              <div className={cn('ink-card flex-1 overflow-hidden transition-all duration-300', CARD_HOVER)}>
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden bg-ink/[0.04]">
                    <Link href={postHref(post)} className="relative z-10 block h-full w-full" tabIndex={-1} aria-hidden>
                      <CoverImage
                        src={post.coverImage}
                        title={post.title}
                        slug={post.slug}
                        className={COVER_ZOOM}
                      />
                    </Link>
                    {/* Mobile number badge */}
                    <div className="absolute top-3 left-3 z-10 md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur border border-ink/[0.08]">
                      <span className="text-xs font-mono font-bold text-muted">
                        {padNumber(startIndex + index + 1)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 sm:p-6 flex flex-col">
                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-muted mb-3">
                      <span>{post.date}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="text-accent/80">{post.readingMinutes} {t('reading_time')}</span>
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
                          <Tag key={tag} tag={tag} variant="pill" className="relative z-10" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Series progress summary */}
      <div className="mt-10 pt-8 border-t border-ink/[0.05] text-center">
        <p className="text-sm text-muted">
          <span className="font-mono text-accent">{total}</span> {t('parts')}
        </p>
      </div>
    </div>
  );
}

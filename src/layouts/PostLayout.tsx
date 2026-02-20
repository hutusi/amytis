import Link from 'next/link';
import { getAuthorSlug, PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RelatedPosts from '@/components/RelatedPosts';
import SeriesList from '@/components/SeriesList';
import PostSidebar from '@/components/PostSidebar';
import Comments from '@/components/Comments';
import ExternalLinks from '@/components/ExternalLinks';
import Tag from '@/components/Tag';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import PostNavigation from '@/components/PostNavigation';
import AuthorCard from '@/components/AuthorCard';
import { siteConfig } from '../../site.config';
import { t } from '@/lib/i18n';

interface PostLayoutProps {
  post: PostData;
  relatedPosts?: PostData[];
  seriesPosts?: PostData[];
  seriesTitle?: string;
  prevPost?: PostData | null;
  nextPost?: PostData | null;
}

export default function PostLayout({ post, relatedPosts, seriesPosts, seriesTitle, prevPost, nextPost }: PostLayoutProps) {
  const showToc = siteConfig.toc !== false && post.toc !== false && post.headings && post.headings.length > 0;
  const hasSeries = !!(post.series && seriesPosts && seriesPosts.length > 0);
  const showSidebar = showToc || hasSeries;

  return (
    <div className={`layout-container ${showSidebar ? 'lg:max-w-7xl' : 'lg:max-w-6xl'}`}>
      <ReadingProgressBar />
      <div className={showSidebar
        ? 'grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start'
        : 'max-w-6xl mx-auto'
      }>
        {/* Left sidebar: series nav + page TOC */}
        {showSidebar && (
          <PostSidebar
            seriesSlug={hasSeries ? post.series : undefined}
            seriesTitle={hasSeries ? (seriesTitle || post.series) : undefined}
            posts={hasSeries ? seriesPosts : undefined}
            currentSlug={post.slug}
            headings={showToc ? post.headings : []}
          />
        )}

        <article className="min-w-0 max-w-3xl">
          <header className="mb-16 border-b border-muted/10 pb-12">
            {post.draft && (
              <div className="mb-4">
                <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded tracking-widest inline-block">
                  DRAFT
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-xs font-sans text-muted mb-6">
              <span className="uppercase tracking-widest font-semibold text-accent">
                {post.category}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted/30" />
              <time className="font-mono" data-pagefind-meta="date[content]">{post.date}</time>
              <span className="w-1 h-1 rounded-full bg-muted/30" />
              <span className="font-mono">{post.readingTime}</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif font-bold text-heading leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex items-center gap-2 mb-8 text-sm font-serif italic text-muted">
              <span>{t('written_by')}</span>
              <div className="flex items-center gap-1">
                {post.authors.map((author, index) => (
                  <span key={author} className="flex items-center">
                    <Link
                      href={`/authors/${getAuthorSlug(author)}`}
                      className="text-foreground hover:text-accent no-underline transition-colors duration-200"
                    >
                      {author}
                    </Link>
                    {index < post.authors.length - 1 && <span className="mr-1">,</span>}
                  </span>
                ))}
              </div>
            </div>

            {post.excerpt && (
              <p className="text-xl text-foreground font-serif italic leading-relaxed mb-8">
                {post.excerpt}
              </p>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Tag key={tag} tag={tag} variant="default" />
                ))}
              </div>
            )}
          </header>

          {hasSeries && (
            <div className="lg:hidden mb-12">
              <SeriesList seriesSlug={post.series!} seriesTitle={seriesTitle || post.series!} posts={seriesPosts!} currentSlug={post.slug} />
            </div>
          )}

          <MarkdownRenderer content={post.content} latex={post.latex} slug={post.slug} />

          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-muted/10 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mr-1">{t('tags')}</span>
              {post.tags.map((tag) => (
                <Tag key={tag} tag={tag} variant="default" />
              ))}
            </div>
          )}

          {post.externalLinks && post.externalLinks.length > 0 && (
            <ExternalLinks links={post.externalLinks} />
          )}

          <AuthorCard authors={post.authors} />

          <RelatedPosts posts={relatedPosts || []} />

          <PostNavigation prev={prevPost ?? null} next={nextPost ?? null} />

          <Comments slug={post.slug} />
        </article>
      </div>
    </div>
  );
}

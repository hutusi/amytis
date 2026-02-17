import Link from 'next/link';
import { getAuthorSlug, PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TableOfContents from '@/components/TableOfContents';
import RelatedPosts from '@/components/RelatedPosts';
import SeriesList from '@/components/SeriesList';
import SeriesSidebar from '@/components/SeriesSidebar';
import Comments from '@/components/Comments';
import ExternalLinks from '@/components/ExternalLinks';
import Tag from '@/components/Tag';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import { siteConfig } from '../../site.config';
import { t } from '@/lib/i18n';

interface PostLayoutProps {
  post: PostData;
  relatedPosts?: PostData[];
  seriesPosts?: PostData[];
  seriesTitle?: string;
}

export default function PostLayout({ post, relatedPosts, seriesPosts, seriesTitle }: PostLayoutProps) {
  const showToc = siteConfig.toc !== false && post.toc !== false && post.headings && post.headings.length > 0;
  const hasSeries = !!(post.series && seriesPosts && seriesPosts.length > 0);

  // Use a consistent 3-column grid layout if there's a sidebar (series) or TOC
  // This keeps the main content centered in the same way for all posts.
  const useWideLayout = showToc || hasSeries;
  
  const gridClass = useWideLayout
    ? 'grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_220px] gap-8 items-start'
    : 'max-w-6xl mx-auto';

  return (
    <div className={`layout-container ${useWideLayout ? 'lg:max-w-7xl' : 'lg:max-w-6xl'}`}>
      <ReadingProgressBar />
      <div className={gridClass}>
        {/* Left Column: Series Sidebar or Spacer */}
        {useWideLayout && (
          hasSeries ? (
            <SeriesSidebar
              seriesSlug={post.series!}
              seriesTitle={seriesTitle || post.series!}
              posts={seriesPosts!}
              currentSlug={post.slug}
            />
          ) : (
            <div className="hidden lg:block w-56" aria-hidden="true" />
          )
        )}

        <article className="min-w-0">
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
              <time className="font-mono">{post.date}</time>
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

          {post.externalLinks && post.externalLinks.length > 0 && (
            <ExternalLinks links={post.externalLinks} />
          )}

          <RelatedPosts posts={relatedPosts || []} />
          
          <Comments slug={post.slug} />
        </article>

        {showToc && <TableOfContents headings={post.headings} />}
      </div>
    </div>
  );
}

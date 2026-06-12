import Link from 'next/link';
import { Suspense } from 'react';
import type { BacklinkSource, SlugRegistryEntry } from '@/lib/content/discovery';
import { getAuthorSlug } from '@/lib/content/authors';
import type { PostData, CollectionContext } from '@/lib/content/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import RelatedPosts from '@/components/RelatedPosts';
import SeriesList from '@/components/SeriesList';
import PostSidebar from '@/components/PostSidebar';
import Comments from '@/components/Comments';
import { resolveCommentable } from '@/lib/comments';
import ExternalLinks from '@/components/ExternalLinks';
import Backlinks from '@/components/Backlinks';
import Tag from '@/components/Tag';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import PostNavigation from '@/components/PostNavigation';
import AuthorCard from '@/components/AuthorCard';
import ShareBar from '@/components/ShareBar';
import ImmersiveToggleButton from '@/components/ImmersiveToggleButton';
import PostReadingShell from '@/components/PostReadingShell';
import { siteConfig } from '../../site.config';
import { t } from '@/lib/i18n';
import { getPostUrl, getStaticPageUrl } from '@/lib/urls';

interface PostLayoutProps {
  post: PostData;
  relatedPosts?: PostData[];
  seriesPosts?: PostData[];
  seriesTitle?: string;
  collectionContexts?: CollectionContext[];
  prevPost?: PostData | null;
  nextPost?: PostData | null;
  backlinks?: BacklinkSource[];
  slugRegistry?: Map<string, SlugRegistryEntry>;
  commentCategory?: 'posts' | 'staticPages';
}

export default function PostLayout({ post, relatedPosts, seriesPosts, seriesTitle, collectionContexts, prevPost, nextPost, backlinks, slugRegistry, commentCategory = 'posts' }: PostLayoutProps) {
  const showToc = siteConfig.posts?.toc !== false && post.toc !== false && post.headings && post.headings.length > 0;
  const hasSeries = !!(post.series && seriesPosts && seriesPosts.length > 0);
  const hasCollections = !!(collectionContexts && collectionContexts.length > 0);
  const showSidebar = showToc || hasSeries || hasCollections;
  const isStaticPage = commentCategory === 'staticPages';
  const postUrl = isStaticPage
    ? `${siteConfig.baseUrl.replace(/\/+$/, '')}${getStaticPageUrl(post.slug)}`
    : `${siteConfig.baseUrl}${getPostUrl(post)}`;
  const commentSlug = isStaticPage ? `pages/${post.slug}` : post.slug;
  const bodyRenderer = post.sourceFormat === 'rst'
    ? <RstRenderer content={post.content} html={post.renderedHtml} latex={post.latex} slug={post.imageBaseSlug} slugRegistry={slugRegistry} />
    : <MarkdownRenderer content={post.content} latex={post.latex} slug={post.imageBaseSlug} slugRegistry={slugRegistry} />;

  // The article <header> is identical in both the normal and the immersive
  // article subtrees — extracting it as a variable lets us reference it in
  // both places (only one of the two trees ever mounts, so it renders once).
  // Includes the immersive toggle when the post is in a series.
  const articleHeader = (
    <header className="mb-16 border-b border-ink/[0.05] pb-8">
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
        <span className="w-1 h-1 rounded-full bg-ink/[0.12]" />
        <time className="font-mono" data-pagefind-meta="date[content]">{post.date}</time>
        <span className="w-1 h-1 rounded-full bg-ink/[0.12]" />
        <span className="font-mono">
          {post.wordCount.toLocaleString()} {t('words')}
        </span>
        <span className="w-1 h-1 rounded-full bg-ink/[0.12]" />
        <span className="font-mono text-muted/70">{post.readingMinutes} {t('reading_time')}</span>
        {hasSeries && (
          <span className="ml-auto">
            <ImmersiveToggleButton />
          </span>
        )}
      </div>

      <h1 className="text-4xl md:text-5xl font-serif font-bold text-heading leading-tight mb-4">
        {post.title}
      </h1>

      {post.subtitle && (
        <p className="text-xl md:text-2xl font-serif italic text-muted leading-snug mb-6">
          {post.subtitle}
        </p>
      )}

      {siteConfig.posts?.authors?.showInHeader !== false && post.authors.length > 0 && (
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
      )}

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
  );

  // Slim subtree for the immersive overlay: header + body + prev/next nav. We
  // deliberately skip AuthorCard / ShareBar / Comments / RelatedPosts here —
  // the reader is focused on long-form reading; chrome lives in normal mode.
  const overlayArticle = (
    <>
      {articleHeader}
      {bodyRenderer}
      <div className="mt-16 pt-8 border-t border-ink/[0.05]">
        <Suspense fallback={null}>
          <PostNavigation prev={prevPost ?? null} next={nextPost ?? null} currentSlug={post.slug} collectionContexts={collectionContexts} />
        </Suspense>
      </div>
    </>
  );

  return (
    <PostReadingShell
      post={post}
      seriesSlug={hasSeries ? post.series : undefined}
      seriesTitle={hasSeries ? (seriesTitle || post.series) : undefined}
      seriesPosts={hasSeries ? seriesPosts : undefined}
      collectionContexts={collectionContexts}
      overlayArticle={overlayArticle}
    >
      <div className="layout-container">
        <ReadingProgressBar />
        <div className={showSidebar
          ? 'grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start'
          : 'max-w-6xl mx-auto'
        }>
          {/* Left sidebar: series nav + page TOC */}
          {showSidebar && (
            <Suspense fallback={null}>
              <PostSidebar
                seriesSlug={hasSeries ? post.series : undefined}
                seriesTitle={hasSeries ? (seriesTitle || post.series) : undefined}
                posts={hasSeries ? seriesPosts : undefined}
                collectionContexts={collectionContexts}
                currentSlug={post.slug}
                headings={showToc ? post.headings : []}
                shareUrl={postUrl}
                shareTitle={post.title}
              />
            </Suspense>
          )}

          <article className="min-w-0 w-full max-w-3xl mx-auto overflow-x-hidden">
            {articleHeader}

            {(hasSeries || (collectionContexts && collectionContexts.length > 0)) && (
              <div className="lg:hidden mb-12">
                <Suspense fallback={null}>
                  <SeriesList seriesSlug={hasSeries ? post.series! : undefined} seriesTitle={hasSeries ? (seriesTitle || post.series!) : undefined} posts={hasSeries ? seriesPosts! : undefined} collectionContexts={collectionContexts} currentSlug={post.slug} />
                </Suspense>
              </div>
            )}

            {bodyRenderer}

            {siteConfig.posts?.authors?.showAuthorCard !== false && (
              <AuthorCard authors={post.authors} />
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-12 border-t border-ink/[0.07] flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mr-1">{t('tags')}</span>
                {post.tags.map((tag) => (
                  <Tag key={tag} tag={tag} variant="default" />
                ))}
              </div>
            )}

            <Backlinks backlinks={backlinks ?? []} />

            <ShareBar
              url={postUrl}
              title={post.title}
              className={showSidebar ? 'mt-8 lg:hidden' : 'mt-8'}
            />

            {resolveCommentable(post.commentable, commentCategory) && (
              <Comments slug={commentSlug} postUrl={postUrl} />
            )}

            {post.externalLinks && post.externalLinks.length > 0 && (
              <ExternalLinks links={post.externalLinks} />
            )}

            <Suspense fallback={null}>
              <PostNavigation prev={prevPost ?? null} next={nextPost ?? null} currentSlug={post.slug} collectionContexts={collectionContexts} />
            </Suspense>

            <RelatedPosts posts={relatedPosts || []} />
          </article>
        </div>
      </div>
    </PostReadingShell>
  );
}

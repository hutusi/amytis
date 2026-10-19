import { Suspense } from 'react';
import type { PostData } from '@/lib/content/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import SimpleLayoutHeader from '@/components/SimpleLayoutHeader';
import PostSidebar, { PostSidebarView } from '@/components/PostSidebar';
import Comments from '@/components/Comments';
import { TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';
import { resolveCommentable } from '@/lib/comments';
import { getStaticPageUrl } from '@/lib/urls';

interface SimpleLayoutProps {
  post: PostData;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
}

export default function SimpleLayout({ post, titleKey, subtitleKey }: SimpleLayoutProps) {
  const showToc = siteConfig.posts?.toc !== false && post.toc !== false && post.headings?.length > 0;

  const articleContent = (
    <>
      <SimpleLayoutHeader
        title={post.title}
        excerpt={post.excerpt}
        titleKey={titleKey}
        subtitleKey={subtitleKey}
      />
      {post.sourceFormat === 'rst'
        ? <RstRenderer content={post.content} html={post.renderedHtml} latex={post.latex} slug={post.imageBaseSlug} />
        : <MarkdownRenderer content={post.content} latex={post.latex} slug={post.imageBaseSlug} />}
    </>
  );

  const showComments = resolveCommentable(post.commentable, 'staticPages');
  const pageUrl = `${siteConfig.baseUrl.replace(/\/+$/, '')}${getStaticPageUrl(post.slug)}`;
  const commentSlug = `pages/${post.slug}`;

  return (
    <div className="layout-main">
      {showToc ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
          <Suspense fallback={<PostSidebarView currentSlug={post.slug} headings={post.headings} collectionParam={null} />}>
            <PostSidebar currentSlug={post.slug} headings={post.headings} />
          </Suspense>
          <article className="min-w-0 w-full max-w-3xl overflow-x-hidden">
            {articleContent}
            {showComments && <Comments slug={commentSlug} postUrl={pageUrl} />}
          </article>
        </div>
      ) : (
        <article className="w-full max-w-3xl mx-auto overflow-x-hidden">
          {articleContent}
          {showComments && <Comments slug={commentSlug} postUrl={pageUrl} />}
        </article>
      )}
    </div>
  );
}

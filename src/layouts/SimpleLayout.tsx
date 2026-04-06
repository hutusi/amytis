import { Suspense } from 'react';
import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import SimpleLayoutHeader from '@/components/SimpleLayoutHeader';
import LocaleSwitch from '@/components/LocaleSwitch';
import PostSidebar from '@/components/PostSidebar';
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
  const defaultLocale = siteConfig.i18n.defaultLocale;
  const localeEntries = Object.entries(post.contentLocales ?? {});
  const showToc = siteConfig.posts?.toc !== false && post.toc !== false && post.headings?.length > 0;
  const localeHeadings = post.contentLocales
    ? Object.fromEntries(
        Object.entries(post.contentLocales)
          .filter(([, data]) => data.headings && data.headings.length > 0)
          .map(([locale, data]) => [locale, data.headings!])
      )
    : undefined;

  const renderContent = (content: string) => (
    post.sourceFormat === 'rst'
      ? <RstRenderer content={content} html={content === post.content ? post.renderedHtml : undefined} latex={post.latex} slug={post.imageBaseSlug} />
      : <MarkdownRenderer content={content} latex={post.latex} slug={post.imageBaseSlug} />
  );

  const articleContent = (
    <>
      <SimpleLayoutHeader
        title={post.title}
        excerpt={post.excerpt}
        titleKey={titleKey}
        subtitleKey={subtitleKey}
        contentLocales={post.contentLocales}
      />
      {localeEntries.length > 0 ? (
        <LocaleSwitch>
          <div data-locale={defaultLocale}>
            {renderContent(post.content)}
          </div>
          {localeEntries.map(([locale, data]) => (
            <div key={locale} data-locale={locale} style={{ display: 'none' }}>
              {renderContent(data.content)}
            </div>
          ))}
        </LocaleSwitch>
      ) : (
        renderContent(post.content)
      )}
    </>
  );

  const showComments = resolveCommentable(post.commentable, 'staticPages');
  const pageUrl = `${siteConfig.baseUrl.replace(/\/+$/, '')}${getStaticPageUrl(post.slug)}`;
  const commentSlug = `pages/${post.slug}`;

  return (
    <div className="layout-main">
      {showToc ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
          <Suspense fallback={null}>
            <PostSidebar currentSlug={post.slug} headings={post.headings} localeHeadings={localeHeadings} />
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

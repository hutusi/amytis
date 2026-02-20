import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import SimpleLayoutHeader from '@/components/SimpleLayoutHeader';
import LocaleSwitch from '@/components/LocaleSwitch';
import PostSidebar from '@/components/PostSidebar';
import { TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';

interface SimpleLayoutProps {
  post: PostData;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
}

export default function SimpleLayout({ post, titleKey, subtitleKey }: SimpleLayoutProps) {
  const defaultLocale = siteConfig.i18n.defaultLocale;
  const localeEntries = Object.entries(post.contentLocales ?? {});
  const showToc = siteConfig.toc !== false && post.toc !== false && post.headings?.length > 0;

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
            <MarkdownRenderer content={post.content} latex={post.latex} slug={post.slug} />
          </div>
          {localeEntries.map(([locale, data]) => (
            <div key={locale} data-locale={locale} style={{ display: 'none' }}>
              <MarkdownRenderer content={data.content} latex={post.latex} slug={post.slug} />
            </div>
          ))}
        </LocaleSwitch>
      ) : (
        <MarkdownRenderer content={post.content} latex={post.latex} slug={post.slug} />
      )}
    </>
  );

  return (
    <div className="layout-main">
      {showToc ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
          <PostSidebar currentSlug={post.slug} headings={post.headings} />
          <article className="min-w-0 max-w-3xl">
            {articleContent}
          </article>
        </div>
      ) : (
        <article className="max-w-3xl mx-auto">
          {articleContent}
        </article>
      )}
    </div>
  );
}

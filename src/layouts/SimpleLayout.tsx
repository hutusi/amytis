import { PostData } from '@/lib/markdown';
import LocalizedMarkdown from '@/components/LocalizedMarkdown';
import SimpleLayoutHeader from '@/components/SimpleLayoutHeader';
import { TranslationKey } from '@/i18n/translations';

interface SimpleLayoutProps {
  post: PostData;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
}

export default function SimpleLayout({ post, titleKey, subtitleKey }: SimpleLayoutProps) {
  return (
    <div className="layout-main">
      <article className="max-w-3xl mx-auto">
        <SimpleLayoutHeader
          title={post.title}
          excerpt={post.excerpt}
          titleKey={titleKey}
          subtitleKey={subtitleKey}
          contentLocales={post.contentLocales}
        />

        <LocalizedMarkdown content={post.content} contentLocales={post.contentLocales} latex={post.latex} slug={post.slug} />
      </article>
    </div>
  );
}

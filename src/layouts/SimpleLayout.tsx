import { PostData } from '@/lib/markdown';
import LocalizedMarkdown from '@/components/LocalizedMarkdown';
import SimpleLayoutHeader from '@/components/SimpleLayoutHeader';
import { TranslationKey } from '@/i18n/translations';

interface SimpleLayoutProps {
  post: PostData;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
  titleOverride?: string | Record<string, string>;
  subtitleOverride?: string | Record<string, string>;
}

export default function SimpleLayout({ post, titleKey, subtitleKey, titleOverride, subtitleOverride }: SimpleLayoutProps) {
  return (
    <div className="layout-main">
      <article className="max-w-3xl mx-auto">
        <SimpleLayoutHeader
          title={post.title}
          excerpt={post.excerpt}
          titleKey={titleKey}
          subtitleKey={subtitleKey}
          titleOverride={titleOverride}
          subtitleOverride={subtitleOverride}
        />

        <LocalizedMarkdown content={post.content} contentLocales={post.contentLocales} latex={post.latex} slug={post.slug} />
      </article>
    </div>
  );
}

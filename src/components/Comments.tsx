'use client';

import Giscus from '@giscus/react';
import { siteConfig } from '../../site.config';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/components/LanguageProvider';
import { getPostsBasePath } from '@/lib/urls';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';

// Maps site locale codes to Giscus-supported language codes.
// Full list: https://github.com/giscus/giscus/tree/main/locales
const GISCUS_LANG: Record<string, string> = {
  en: 'en',
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  ja: 'ja',
  ko: 'ko',
  de: 'de',
  fr: 'fr',
  es: 'es',
  pt: 'pt',
  ru: 'ru',
};

interface CommentsProps {
  slug: string;
  postUrl?: string;
}

/** A failing comment embed must not take the article down with it. */
export default function Comments(props: CommentsProps) {
  return (
    <ClientErrorBoundary label="comments">
      <CommentsEmbed {...props} />
    </ClientErrorBoundary>
  );
}

function CommentsEmbed({ slug, postUrl }: CommentsProps) {
  const { provider, giscus, disqus } = siteConfig.comments;
  const { theme, systemTheme } = useTheme();
  const { language } = useLanguage();

  const currentTheme = theme === 'system' ? systemTheme : theme;
  // Follow the active language, not just the build-time default locale.
  const giscusLang = GISCUS_LANG[language] ?? GISCUS_LANG[siteConfig.i18n.defaultLocale] ?? siteConfig.i18n.defaultLocale;

  if (provider === 'giscus' && giscus.repo) {
    return (
      <div className="mt-12 pt-12 border-t border-line">
        <Giscus
          id="comments"
          repo={giscus.repo as `${string}/${string}`}
          repoId={giscus.repoId}
          category={giscus.category}
          categoryId={giscus.categoryId}
          mapping="pathname"
          term={slug}
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={currentTheme === 'dark' ? 'transparent_dark' : 'light'}
          lang={giscusLang}
          loading="lazy"
        />
      </div>
    );
  }

  if (provider === 'disqus' && disqus.shortname) {
    return (
      <div className="mt-12 pt-12 border-t border-line">
        <div id="disqus_thread"></div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var disqus_config = function () {
                this.page.url = ${JSON.stringify(postUrl ?? `${siteConfig.baseUrl.replace(/\/+$/, '')}/${getPostsBasePath()}/${slug}`)};
                this.page.identifier = ${JSON.stringify(slug)};
              };
              (function() {
                var d = document, s = d.createElement('script');
                s.src = 'https://${disqus.shortname}.disqus.com/embed.js';
                s.setAttribute('data-timestamp', +new Date());
                (d.head || d.body).appendChild(s);
              })();
            `,
          }}
        />
        <noscript>
          Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a>
        </noscript>
      </div>
    );
  }

  return null;
}

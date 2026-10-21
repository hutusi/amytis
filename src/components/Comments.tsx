'use client';

import { useEffect } from 'react';
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
  const { language, t } = useLanguage();

  const currentTheme = theme === 'system' ? systemTheme : theme;
  // Follow the active language, not just the build-time default locale.
  const giscusLang = GISCUS_LANG[language] ?? GISCUS_LANG[siteConfig.i18n.defaultLocale] ?? siteConfig.i18n.defaultLocale;

  if (provider === 'giscus' && giscus.repo) {
    return (
      <div className="mt-12 pt-12 border-t border-line print:hidden">
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
      <div className="mt-12 pt-12 border-t border-line print:hidden">
        <DisqusThread
          shortname={disqus.shortname}
          url={postUrl ?? `${siteConfig.baseUrl.replace(/\/+$/, '')}/${getPostsBasePath()}/${slug}`}
          identifier={slug}
        />
        <noscript>
          {t('comments_noscript')} <a href="https://disqus.com/?ref_noscript">Disqus</a>
        </noscript>
      </div>
    );
  }

  return null;
}

interface DisqusPageConfig {
  page: { url: string; identifier: string };
}

declare global {
  interface Window {
    DISQUS?: { reset: (options: { reload: boolean; config: (this: DisqusPageConfig) => void }) => void };
    disqus_config?: (this: DisqusPageConfig) => void;
  }
}

/**
 * Disqus thread that also works across client-side navigations. Rendering
 * the embed as an inline <script> only worked on a full page load: React
 * never executes scripts it inserts on the client, so navigating between
 * posts left an empty thread. The effect injects embed.js once and, once
 * Disqus is loaded, swaps threads with DISQUS.reset.
 */
export function DisqusThread({ shortname, url, identifier }: { shortname: string; url: string; identifier: string }) {
  useEffect(() => {
    const config = function (this: DisqusPageConfig) {
      this.page.url = url;
      this.page.identifier = identifier;
    };
    if (window.DISQUS) {
      window.DISQUS.reset({ reload: true, config });
      return;
    }
    // embed.js reads window.disqus_config when it runs; if it is still
    // loading from an earlier page, updating the config is enough.
    window.disqus_config = config;
    const scriptId = 'disqus-embed';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://${shortname}.disqus.com/embed.js`;
    script.async = true;
    script.setAttribute('data-timestamp', String(Date.now()));
    (document.head || document.body).appendChild(script);
  }, [shortname, url, identifier]);

  return <div id="disqus_thread" />;
}

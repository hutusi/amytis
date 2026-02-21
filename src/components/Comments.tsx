'use client';

import Giscus from '@giscus/react';
import { siteConfig } from '../../site.config';
import { useTheme } from 'next-themes';

export default function Comments({ slug }: { slug: string }) {
  const { provider, giscus, disqus } = siteConfig.comments;
  const { theme, systemTheme } = useTheme();
  
  const currentTheme = theme === 'system' ? systemTheme : theme;

  if (provider === 'giscus' && giscus.repo) {
    return (
      <div className="mt-12 pt-12 border-t border-muted/20">
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
          lang="en"
          loading="lazy"
        />
      </div>
    );
  }

  if (provider === 'disqus' && disqus.shortname) {
    return (
      <div className="mt-12 pt-12 border-t border-muted/20">
        <div id="disqus_thread"></div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var disqus_config = function () {
                this.page.url = '${siteConfig.baseUrl}/posts/${slug}';
                this.page.identifier = '${slug}';
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

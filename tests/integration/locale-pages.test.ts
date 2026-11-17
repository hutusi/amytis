import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderAsync } from '../../src/test-utils/render';
import { ImmersiveReadingProvider } from '../../src/components/ImmersiveReadingProvider';
import LocaleRootPage from '../../src/app/[slug]/page';
import SecondLevelPage from '../../src/app/[slug]/[postSlug]/page';
import DeepPage from '../../src/app/[slug]/[postSlug]/[...rest]/page';

// End-to-end render of the three locale route surfaces against the tracked
// zh fixtures. The provider gets the page's locale explicitly (in production
// it derives the same value from the pathname).

describe('locale route rendering', () => {
  test('/zh/ renders the locale home with zh chrome and zh posts', async () => {
    const html = await renderAsync(
      LocaleRootPage({ params: Promise.resolve({ slug: 'zh' }) }),
      { locale: 'zh' },
    );
    expect(html).toContain('最新文章'); // t('latest_writing') in zh chrome
    expect(html).toContain('中文原创示例文章'); // zh-original post listed
    expect(html).toContain('href="/zh/posts/zh-original-demo'); // locale-prefixed post link
  });

  test('/zh/about/ renders the migrated zh page body', async () => {
    const html = await renderAsync(
      SecondLevelPage({ params: Promise.resolve({ slug: 'zh', postSlug: 'about' }) }),
      { locale: 'zh' },
    );
    expect(html).toContain('关于 Amytis');
  });

  test('/zh/posts/ renders the zh posts listing', async () => {
    const html = await renderAsync(
      SecondLevelPage({ params: Promise.resolve({ slug: 'zh', postSlug: 'posts' }) }),
      { locale: 'zh' },
    );
    expect(html).toContain('静态 Next.js 博客中的 i18n：客户端切换 vs 基于 URL 的路由'); // the twin post
    expect(html).toContain('第一篇：系列内的中文文章'); // the zh series child
  });

  test('/zh/posts/<slug>/ renders the zh twin post', async () => {
    // Production wraps post pages in ImmersiveReadingProvider via [slug]/layout.tsx.
    const page = await DeepPage({ params: Promise.resolve({ slug: 'zh', postSlug: 'posts', rest: ['i18n-routing-considerations'] }) });
    const html = await renderAsync(
      createElement(ImmersiveReadingProvider, null, page),
      { locale: 'zh' },
    );
    expect(html).toContain('静态 Next.js 博客中的 i18n：客户端切换 vs 基于 URL 的路由');
    expect(html).toContain('默认语言前缀问题'); // body content from the zh tree
  });

  test('/zh/series/zh-demo-series/ renders the zh series landing', async () => {
    const html = await renderAsync(
      DeepPage({ params: Promise.resolve({ slug: 'zh', postSlug: 'series', rest: ['zh-demo-series'] }) }),
      { locale: 'zh' },
    );
    expect(html).toContain('中文示例系列');
    expect(html).toContain('第一篇：系列内的中文文章');
  });
});

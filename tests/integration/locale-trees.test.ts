import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
  classifyContentRootDir,
  contentRoot,
  getActiveContentLocales,
  legacyLocaleSuffix,
  treePathFor,
  validateLocaleTreeEntry,
} from '../../src/lib/content/io';
import {
  getAllPages,
  getAllPosts,
  getPostBySlug,
  getPostContentLocales,
  getTwinPost,
} from '../../src/lib/content/posts';
import { getAllSeries } from '../../src/lib/content/series';
import { getSeriesTitle } from '../../src/lib/content/series-metadata';
import { getPostUrl } from '../../src/lib/urls';

// Tracked zh-tree fixtures this suite relies on (see content/zh/):
// - posts/2026-02-20-i18n-routing-considerations.mdx — twin of the en post
//   with the same tree-relative path
// - posts/zh-original-demo.mdx — zh-original, no default-tree twin
// - series/zh-demo-series/{index.mdx, di-yi-pian.mdx} — zh-only series
//
// Never reference the maintainer's private (gitignored) zh content here —
// those trees exist locally but not in CI.

const EN_ZH = { locales: ['en', 'zh'], defaultLocale: 'en', enabled: true };
const ZH_DEFAULT = { locales: ['zh', 'en'], defaultLocale: 'zh', enabled: true };

describe('locale content trees', () => {
  test('getActiveContentLocales sees the zh tree', () => {
    expect(getActiveContentLocales()).toEqual(['en', 'zh']);
  });

  test('zh tree posts are discovered with locale stamping and /zh/ URLs', () => {
    const zhPosts = getAllPosts('zh');
    const slugs = zhPosts.map(p => p.slug);
    expect(slugs).toContain('zh-original-demo');
    expect(slugs).toContain('i18n-routing-considerations');
    expect(slugs).toContain('di-yi-pian');
    for (const post of zhPosts) {
      expect(post.locale).toBe('zh');
      expect(getPostUrl(post).startsWith('/zh/')).toBe(true);
    }
  });

  test('default-tree output is unchanged: no zh posts, no locale prefixes', () => {
    const defaultPosts = getAllPosts();
    expect(defaultPosts.map(p => p.slug)).not.toContain('zh-original-demo');
    for (const post of defaultPosts) {
      expect(post.locale).toBe('en');
      const url = getPostUrl(post);
      expect(url.startsWith('/zh/')).toBe(false);
      expect(url.startsWith('/en/')).toBe(false);
    }
  });

  test('twins pair by treePath across trees', () => {
    const enPost = getPostBySlug('i18n-routing-considerations');
    expect(enPost).not.toBeNull();
    expect(getPostContentLocales(enPost!)).toEqual(['en', 'zh']);

    const twin = getTwinPost(enPost!, 'zh');
    expect(twin).not.toBeNull();
    expect(twin!.title).toBe('静态 Next.js 博客中的 i18n：客户端切换 vs 基于 URL 的路由');
    expect(twin!.treePath).toBe(enPost!.treePath);
    expect(getPostUrl(twin!)).toBe(`/zh${getPostUrl(enPost!)}`);
  });

  test('zh-originals have no default-tree twin and stand alone', () => {
    const zhOriginal = getPostBySlug('zh-original-demo', 'zh');
    expect(zhOriginal).not.toBeNull();
    expect(getPostContentLocales(zhOriginal!)).toEqual(['zh']);
    expect(getTwinPost(zhOriginal!, 'en')).toBeNull();
  });

  test('zh series use the same series mechanics as the default tree', () => {
    const zhSeries = getAllSeries('zh');
    expect(Object.keys(zhSeries)).toContain('zh-demo-series');
    expect(zhSeries['zh-demo-series'].map(p => p.slug)).toEqual(['di-yi-pian']);

    expect(getSeriesTitle('zh-demo-series', 'zh')).toBe('中文示例系列');
    // Series inheritance flows into the child post from the zh index.
    expect(zhSeries['zh-demo-series'][0].seriesTitle).toBe('中文示例系列');

    // The zh-only series is invisible to the default tree.
    expect(Object.keys(getAllSeries())).not.toContain('zh-demo-series');
    expect(getSeriesTitle('zh-demo-series')).toBeUndefined();
  });

  test('zh pages migrated from sibling files are tree pages with twins', () => {
    const zhPageSlugs = getAllPages('zh').map(p => p.slug).sort();
    expect(zhPageSlugs).toEqual(['about', 'links', 'privacy']);
    for (const page of getAllPages('zh')) {
      expect(page.locale).toBe('zh');
      // Every migrated page twins its default-tree counterpart by treePath.
      expect(getAllPages().some(p => p.treePath === page.treePath)).toBe(true);
    }
  });

  test('unknown locale argument throws; configured-but-absent tree is sparse', () => {
    expect(() => getAllPosts('fr')).toThrow(/Unknown content locale "fr"/);
  });
});

describe('locale tree validation cores (pure, defaultLocale-agnostic)', () => {
  test('classifyContentRootDir routes names correctly', () => {
    expect(classifyContentRootDir('posts', EN_ZH)).toBe('content-type');
    expect(classifyContentRootDir('zh', EN_ZH)).toBe('locale');
    expect(classifyContentRootDir('images', EN_ZH)).toBe('ignored');
  });

  test('default-locale directory throws', () => {
    expect(() => classifyContentRootDir('en', EN_ZH)).toThrow(/default locale/);
    // zh-default config flips: content/zh/ is invalid, content/en/ is the locale tree.
    expect(() => classifyContentRootDir('zh', ZH_DEFAULT)).toThrow(/default locale/);
    expect(classifyContentRootDir('en', ZH_DEFAULT)).toBe('locale');
  });

  test('unknown or disabled locale directory throws', () => {
    expect(() => classifyContentRootDir('ja', EN_ZH)).toThrow(/Unknown locale directory content\/ja\//);
    expect(() => classifyContentRootDir('zh', { ...EN_ZH, enabled: false })).toThrow(/Unknown locale directory/);
  });

  test('locale tree entries: flows deferred, nesting forbidden, content types fine', () => {
    expect(() => validateLocaleTreeEntry('zh', 'flows')).toThrow(/not supported yet/);
    expect(() => validateLocaleTreeEntry('zh', 'ja')).toThrow(/cannot nest/);
    expect(() => validateLocaleTreeEntry('zh', 'posts')).not.toThrow();
    expect(() => validateLocaleTreeEntry('zh', 'books')).not.toThrow();
  });

  test('legacyLocaleSuffix flags retired sibling filenames only', () => {
    const locales = ['en', 'zh'];
    expect(legacyLocaleSuffix('about.zh.mdx', locales)).toBe('zh');
    expect(legacyLocaleSuffix('about.en.md', locales)).toBe('en');
    expect(legacyLocaleSuffix('post.zh.rst', locales)).toBe('zh');
    expect(legacyLocaleSuffix('about.mdx', locales)).toBeNull();
    expect(legacyLocaleSuffix('2026-01-12-foo.md', locales)).toBeNull();
    expect(legacyLocaleSuffix('v2.0-notes.md', locales)).toBeNull();
    expect(legacyLocaleSuffix('image.png', locales)).toBeNull();
  });

  test('treePathFor strips extensions and collapses index/README onto the folder', () => {
    expect(treePathFor(path.join(contentRoot('zh'), 'posts', 'foo.md'), 'zh')).toBe('posts/foo');
    expect(treePathFor(path.join(contentRoot('en'), 'posts', 'foo', 'index.mdx'), 'en')).toBe('posts/foo');
    expect(treePathFor(path.join(contentRoot('en'), 'series', 's', 'README.md'), 'en')).toBe('series/s');
    expect(treePathFor(path.join(contentRoot('en'), 'about.mdx'), 'en')).toBe('about');
  });
});

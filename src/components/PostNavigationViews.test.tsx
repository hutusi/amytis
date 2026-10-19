import { describe, expect, test } from 'bun:test';
import { renderAsync } from '@/test-utils/render';
import { PostNavigationView } from './PostNavigation';
import { PostSidebarView } from './PostSidebar';
import { SeriesListView } from './SeriesList';

// The Views render as the static-export Suspense fallbacks (outside any
// router), so they must produce the full default navigation on the server.
const seriesPosts = [
  { slug: 'part-1', title: 'Part One', date: '2026-01-01', series: 'demo' },
  { slug: 'part-2', title: 'Part Two', date: '2026-01-02', series: 'demo' },
  { slug: 'part-3', title: 'Part Three', date: '2026-01-03', series: 'demo' },
];
const collection = {
  slug: 'picks',
  title: 'Picks',
  posts: [seriesPosts[2], seriesPosts[1], seriesPosts[0]],
};

describe('static navigation views', () => {
  test('PostSidebarView renders the page TOC and the series list', async () => {
    const html = await renderAsync(
      <PostSidebarView
        seriesSlug="demo"
        seriesTitle="Demo Series"
        posts={seriesPosts}
        currentSlug="part-2"
        headings={[{ id: 'intro', text: 'Intro', level: 2 }]}
        collectionParam={null}
      />,
    );
    expect(html).toContain('<aside');
    expect(html).toContain('href="#intro"');
    expect(html).toContain('Demo Series');
    expect(html).toContain('Part Three');
  });

  test('PostNavigationView renders series prev/next by default', async () => {
    const html = await renderAsync(
      <PostNavigationView prev={seriesPosts[0]} next={seriesPosts[2]} currentSlug="part-2" collectionContexts={[collection]} collectionParam={null} />,
    );
    expect(html).toContain('Part One');
    expect(html).toContain('Part Three');
    expect(html).not.toContain('collection=picks');
  });

  test('PostNavigationView follows the collection order when the param selects one', async () => {
    const html = await renderAsync(
      <PostNavigationView prev={seriesPosts[0]} next={seriesPosts[2]} currentSlug="part-3" collectionContexts={[collection]} collectionParam="picks" />,
    );
    // part-3 is first in the collection: no prev, next is part-2.
    expect(html).not.toContain('Part One');
    expect(html).toContain('Part Two');
    expect(html).toContain('collection=picks');
  });

  test('SeriesListView renders the series list for mobile', async () => {
    const html = await renderAsync(
      <SeriesListView seriesSlug="demo" seriesTitle="Demo Series" posts={seriesPosts} currentSlug="part-1" collectionParam={null} />,
    );
    expect(html).toContain('data-testid="series-list"');
    expect(html).toContain('Demo Series');
  });
});

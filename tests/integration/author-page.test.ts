import { describe, expect, mock, test } from 'bun:test';
import { renderAsync } from '../../src/test-utils/render';
import AuthorPage from '../../src/app/authors/[author]/page';
import { getAllAuthors, getAuthorSlug, getPostsByAuthor } from '../../src/lib/content/authors';
import { getBooksByAuthor } from '../../src/lib/content/books';

// An author with posts in a series and a book of their own, so both sections
// have something to drop.
const author = Object.keys(getAllAuthors()).find(name =>
  getBooksByAuthor(name).length > 0 && getPostsByAuthor(name).some(p => p.series),
);

async function renderAuthor(): Promise<string> {
  return renderAsync(AuthorPage({ params: Promise.resolve({ author: getAuthorSlug(author!) }) }));
}

async function withFeaturesOff<T>(off: string[], run: () => Promise<T>): Promise<T> {
  const features = await import('@/lib/features');
  const realFeatures = { ...features };
  mock.module('@/lib/features', () => ({
    ...realFeatures,
    isFeatureEnabled: (feature: string) => !off.includes(feature) && realFeatures.isFeatureEnabled(feature as never),
  }));
  try {
    return await run();
  } finally {
    mock.module('@/lib/features', () => realFeatures);
  }
}

describe('author page', () => {
  test('lists the author\'s books and series when those features are on', async () => {
    expect(author).toBeDefined();
    const html = await renderAuthor();
    expect(html).toContain('href="/books/');
    expect(html).toContain('href="/series/');
  });

  test('links to no book or series page when the feature is off (those pages aren\'t built)', async () => {
    const html = await withFeaturesOff(['books', 'series'], renderAuthor);
    expect(html).not.toContain('href="/books/');
    expect(html).not.toContain('href="/series/');
  });
});

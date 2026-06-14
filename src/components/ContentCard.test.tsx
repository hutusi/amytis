import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import ContentCard from './ContentCard';

describe('ContentCard', () => {
  test('renders the link, badge, title, excerpt and index-size classes by default', () => {
    const html = renderToStaticMarkup(
      <ContentCard
        href="/books/my-book"
        title="My Book"
        slug="my-book"
        badge="5 chapters"
        excerpt="A fine book."
      />,
    );
    expect(html).toContain('href="/books/my-book"');
    expect(html).toContain('badge-accent');
    expect(html).toContain('5 chapters');
    expect(html).toContain('<h2');
    expect(html).toContain('My Book');
    expect(html).toContain('A fine book.');
    expect(html).toContain('h-48');
    expect(html).toContain('p-8');
    expect(html).toContain('line-clamp-3');
  });

  test('compact size uses h-40 / p-6 / h3 and the denser excerpt', () => {
    const html = renderToStaticMarkup(
      <ContentCard
        href="/series/my-series"
        title="My Series"
        slug="my-series"
        badge="3 parts"
        excerpt="A fine series."
        size="compact"
      />,
    );
    expect(html).toContain('<h3');
    expect(html).not.toContain('<h2');
    expect(html).toContain('h-40');
    expect(html).toContain('p-6');
    expect(html).toContain('line-clamp-2');
  });

  test('renders the "written by" line only when authors are provided', () => {
    const withAuthors = renderToStaticMarkup(
      <ContentCard href="/books/b" title="B" slug="b" badge="1 chapters" authors={['Ada', 'Alan']} />,
    );
    expect(withAuthors).toContain('Ada, Alan');

    const withoutAuthors = renderToStaticMarkup(
      <ContentCard href="/books/b" title="B" slug="b" badge="1 chapters" authors={[]} />,
    );
    // no stray "written by" line when the list is empty
    expect(withoutAuthors).not.toContain('Ada');
  });
});

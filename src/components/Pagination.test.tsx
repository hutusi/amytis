import { describe, expect, test } from 'bun:test';
import { renderAsync } from '@/test-utils/render';
import Pagination from './Pagination';

describe('Pagination', () => {
  test('icon-only prev/next links have accessible names; disabled arrows are hidden', async () => {
    const html = await renderAsync(<Pagination currentPage={1} totalPages={5} basePath="/posts" />);
    expect(html).toMatch(/<a[^>]*aria-label="Next"/);
    expect(html).toMatch(/<span[^>]*aria-hidden="true"/);
  });

  test('phones get a compact "Page X of Y"; the numbered strip is sm+ only', async () => {
    const html = await renderAsync(<Pagination currentPage={3} totalPages={9} basePath="/posts" />);
    expect(html).toContain('Page 3 of 9');
    expect(html).toMatch(/class="hidden sm:flex[^"]*"/);
    expect(html).toContain('href="/posts/page/2"');
  });

  test('renders nothing for a single page', async () => {
    expect(await renderAsync(<Pagination currentPage={1} totalPages={1} />)).toBe('');
  });
});

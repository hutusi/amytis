import { describe, expect, test } from 'bun:test';
import { renderAsync } from '@/test-utils/render';
import MobileToc from './MobileToc';

describe('MobileToc', () => {
  test('renders a JS-free disclosure of hash links, hidden from lg up', async () => {
    const html = await renderAsync(
      <MobileToc headings={[{ id: 'intro', text: 'Intro', level: 2 }, { id: 'detail', text: 'Detail', level: 3 }]} />,
    );
    expect(html).toMatch(/<details[^>]*class="[^"]*lg:hidden/);
    expect(html).toContain('href="#intro"');
    expect(html).toContain('href="#detail"');
    expect(html).toContain('padding-left:0.75rem');
    expect(html).toContain('data-pagefind-ignore');
    expect(html).toContain('On this page');
  });

  test('renders nothing without headings', async () => {
    expect(await renderAsync(<MobileToc headings={[]} />)).toBe('');
  });
});

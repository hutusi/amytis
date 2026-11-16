import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { markdownToHtml } from '@/lib/markdown-to-html';
import { renderAsync } from '@/test-utils/render';

const FLOW = [
  'Talk recording and a clip:',
  '',
  '<iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&autoplay=0" title="Talk" allowfullscreen></iframe>',
  '',
  '<video poster="./clip.jpg"><source src="./clip.mp4" type="video/mp4"></video>',
  '',
  '<audio src="./episode.mp3"></audio>',
].join('\n');

describe('Integration: video and audio embeds', () => {
  test('an iframe embed renders in a lazy 16:9 box', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: FLOW, slug: 'flows/2026/11/16' }));
    expect(html).toMatch(/<div class="[^"]*aspect-video[^"]*"><iframe loading="lazy" src="https:\/\/player\.bilibili\.com\/player\.html\?bvid=BV1xx411c7mD&amp;autoplay=0"/);
  });

  // The flow stream renders every entry on /flows/, so a relative path
  // left as written would resolve to /flows/clip.mp4 there.
  test('co-located media resolve to the entry folder, on its page and in the flow stream', async () => {
    for (const headingIdPrefix of [undefined, 'f-2026-11-16-']) {
      const html = await renderAsync(MarkdownRenderer({ content: FLOW, slug: 'flows/2026/11/16', headingIdPrefix }));
      expect(html).toContain('poster="/flows/2026/11/16/clip.jpg"');
      expect(html).toContain('<source src="/flows/2026/11/16/clip.mp4" type="video/mp4"/>');
      expect(html).toContain('<audio src="/flows/2026/11/16/episode.mp3"');
    }
  });

  test('feed items point co-located media at the asset base, not the page URL', () => {
    const html = markdownToHtml(FLOW, {
      absoluteUrls: { pageUrl: 'https://site.test/series-x/talk/', siteUrl: 'https://site.test', imageBaseSlug: 'posts/talk' },
    });
    expect(html).toContain('poster="https://site.test/posts/talk/clip.jpg"');
    expect(html).toContain('<source src="https://site.test/posts/talk/clip.mp4" type="video/mp4">');
    expect(html).toContain('<audio src="https://site.test/posts/talk/episode.mp3">');
    expect(html).toContain('src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&#x26;autoplay=0"');
  });
});

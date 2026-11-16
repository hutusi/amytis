import { describe, expect, spyOn, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { getFlowBySlug } from '@/lib/content/flows';
import { getPostBySlug } from '@/lib/content/posts';
import { renderAsync } from '@/test-utils/render';
import { siteConfig } from '../../site.config';

const DECK = [
  ':::slides[Building a Digital Garden]{pdf="./talk.pdf" video="https://youtu.be/abc"}',
  '![Title slide](./slides/slide-01.png)',
  '![Agenda](./slides/slide-02.png)',
  '![Thanks](./slides/slide-03.png)',
  ':::',
].join('\n');

/** The deck's horizontal track, start tag through its slides. */
function track(html: string): string {
  const start = html.indexOf('data-slide-track');
  const end = html.indexOf('<span class="sr-only"', start);
  return html.slice(start, end);
}

describe('Integration: slide decks', () => {
  test('renders one id-carrying slide wrapper per image inside a focusable region', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: DECK, slug: 'posts/talk' }));
    expect(html).toContain('data-slide-deck=""');
    expect(html).toMatch(/data-slide-track=""[^>]*tabindex="0"[^>]*role="region"[^>]*aria-label="Building a Digital Garden"/);
    expect([...html.matchAll(/<div id="(slides-\d+)"/g)].map((m) => m[1])).toEqual(['slides-1', 'slides-2', 'slides-3']);
    expect((track(html).match(/<img /g) ?? []).length).toBe(3);
    expect(track(html)).not.toContain('<p');
  });

  test('slides are lazy, unzoomable and skip the eager blur placeholder', async () => {
    const html = track(await renderAsync(MarkdownRenderer({ content: DECK, slug: 'posts/talk' })));
    const images = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
    expect(images).toHaveLength(3);
    for (const img of images) {
      expect(img).toContain('loading="lazy"');
      expect(img).toContain('data-slide=');
      expect(img).not.toContain('data-zoomable');
      expect(img).not.toContain('background-image');
    }
    // Resolved against the asset base (the optimizer variants live beside it).
    expect(images[0]).toMatch(/src="\/posts\/talk\/slides\/[^"]*slide-01/);
  });

  test('captions the title with the talk links', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: DECK, slug: 'posts/talk' }));
    const caption = html.slice(html.indexOf('<figcaption'), html.indexOf('</figcaption>'));
    expect(caption).toContain('Building a Digital Garden');
    // Resolved against the asset base, not the page URL.
    expect(caption).toMatch(/<a href="\/posts\/talk\/talk.pdf" download=""[^>]*>Download PDF<\/a>/);
    expect(caption).toMatch(/<a href="https:\/\/youtu.be\/abc"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*data-print-url="true"/);
    expect(caption).toContain('Watch the talk');
  });

  test('an untitled deck without links falls back to a generic name and no caption', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: ':::slides\n![a](a.png)\n:::', slug: 'posts/x' }));
    expect(html).toContain('aria-label="Slides"');
    expect(html).not.toContain('<figcaption');
  });

  test('localizes the generic name and link labels with the content locale', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: ':::slides{pdf="deck.pdf"}\n![a](a.png)\n:::', slug: 'zh/posts/x', locale: 'zh' }));
    expect(html).toContain('aria-label="幻灯片"');
    expect(html).toContain('下载 PDF');
  });

  test('prefixes slide ids in the flow stream and numbers later decks slides2, …', async () => {
    const content = ':::slides\n![a](a.png)\n:::\n\n:::slides\n![b](b.png)\n:::';
    const html = await renderAsync(MarkdownRenderer({ content, slug: 'flows/2026/03/03', headingIdPrefix: 'f-2026-03-03-' }));
    expect(html).toContain('id="f-2026-03-03-slides-1"');
    expect(html).toContain('id="f-2026-03-03-slides2-1"');
  });

  test('strict-build errors surface through the renderer', async () => {
    // React logs render errors before rejecting; keep the expected ones quiet.
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(renderAsync(MarkdownRenderer({ content: ':::slides[Talk]\nNot an image\n:::' })))
        .rejects.toThrow(/Slide deck "Talk".*only images can go inside a deck/);
      await expect(renderAsync(MarkdownRenderer({ content: '## Slides 1\n\n:::slides\n![a](a.png)\n:::' })))
        .rejects.toThrow(/slide id "slides-1" is already used/);
      await expect(renderAsync(MarkdownRenderer({ content: '<h2 id="slides-1">Intro</h2>\n\n:::slides\n![a](a.png)\n:::' })))
        .rejects.toThrow(/slide id "slides-1" is already used on this page, by a <h2> in raw HTML/);
    } finally {
      consoleError.mockRestore();
    }
  });

  test('the showcase demo deck renders, and every slide file exists', async () => {
    // Catches a typo in the demo without a build (check-links would only
    // report it after export).
    const post = getPostBySlug('multimedia-showcase');
    expect(post).not.toBeNull();
    const html = await renderAsync(MarkdownRenderer({ content: post!.content, slug: post!.imageBaseSlug }));
    const sources = [...track(html).matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(sources).toHaveLength(4);
    for (const src of sources) {
      expect(src.startsWith(`/${post!.imageBaseSlug}/`)).toBe(true);
      const file = path.join('content/posts/multimedia-showcase', src.slice(post!.imageBaseSlug.length + 2));
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  test('the sample folder flow renders its deck on its page and in the stream, and every slide file exists', async () => {
    const flow = getFlowBySlug('2026/03/10');
    expect(flow).not.toBeNull();
    const base = 'flows/2026/03/10';
    // As the flow's own page renders it, then as the flow stream does.
    const page = await renderAsync(MarkdownRenderer({ content: flow!.content, slug: base }));
    const stream = await renderAsync(MarkdownRenderer({ content: flow!.content, slug: base, headingIdPrefix: 'f-2026-03-10-' }));
    expect(page).toContain('id="slides-4"');
    expect(stream).toContain('id="f-2026-03-10-slides-4"');
    const sources = [...track(page).matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(sources).toHaveLength(4);
    for (const src of sources) {
      expect(src.startsWith(`/${base}/`)).toBe(true);
      expect(fs.existsSync(path.join('content', src))).toBe(true);
    }
  });

  test('CDN slides reserve their box before loading: 16:9 for a full URL, the measured size via cdnBaseUrl', async () => {
    const external = await renderAsync(MarkdownRenderer({
      content: ':::slides\n![One](https://cdn.example.com/talk/slide-01.png)\n:::',
      slug: 'flows/2026/03/10',
    }));
    expect(track(external)).toMatch(/<img src="https:\/\/cdn\.example\.com\/talk\/slide-01\.png"[^>]* width="1600" height="900"/);

    // cdnBaseUrl rewrites a local slide to the CDN; its size is still read
    // from the copied file under public/.
    const dir = path.join('public', 'posts', 'zz-cdn-slide-test');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'slide.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"></svg>');
    const images = siteConfig.images as { cdnBaseUrl?: string };
    const previous = images.cdnBaseUrl;
    images.cdnBaseUrl = 'https://cdn.example.com';
    try {
      const rewritten = await renderAsync(MarkdownRenderer({ content: ':::slides\n![One](./slide.svg)\n:::', slug: 'posts/zz-cdn-slide-test' }));
      expect(track(rewritten)).toMatch(/<img src="https:\/\/cdn\.example\.com\/posts\/zz-cdn-slide-test\/slide\.svg"[^>]* width="1200" height="900"/);
    } finally {
      images.cdnBaseUrl = previous;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the server HTML has no controls: the deck works as a plain scroller without JavaScript', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: DECK, slug: 'posts/talk' }));
    expect(html).not.toContain('<button');
  });
});

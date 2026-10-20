import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import { renderAsync } from '@/test-utils/render';
import { markdownToHtml } from '@/lib/markdown-to-html';
import { getFeedItems } from '@/lib/feed-utils';

const MD = '## Getting Started\n\nBody.\n\n### Install\n\nMore.\n\n#### Deep\n\n##### Too deep\n';

/** An empty heading anchor to `#id`, attributes in any order. */
const anchorTo = (id: string, label = 'Link to this section') =>
  new RegExp(`<a (?=[^>]*href="#${id}")(?=[^>]*class="heading-anchor")(?=[^>]*aria-label="${label}")[^>]*></a>`);

describe('heading anchors on the page', () => {
  test('Markdown h2–h4 get an empty "#" link to their own id', async () => {
    const html = await renderAsync(<MarkdownRenderer content={MD} />);
    for (const id of ['getting-started', 'install', 'deep']) expect(html).toMatch(anchorTo(id));
    expect(html).not.toContain('href="#too-deep"');
  });

  test('the label follows the content locale', async () => {
    const html = await renderAsync(<MarkdownRenderer content={MD} locale="zh" />);
    expect(html).toMatch(anchorTo('getting-started', '本节链接'));
  });

  test('the flow stream opts out', async () => {
    const html = await renderAsync(<MarkdownRenderer content={MD} headingIdPrefix="f-x-" headingAnchors={false} />);
    expect(html).toContain('id="f-x-getting-started"');
    expect(html).not.toContain('heading-anchor');
  });

  test('footnotes keep their hidden label heading bare', async () => {
    const html = await renderAsync(<MarkdownRenderer content={'Text[^1].\n\n[^1]: Note.\n'} />);
    expect(html).toMatch(/<h2 class="sr-only" id="footnote-label">[^<]*<\/h2>/);
  });

  test('docutils rST borrows each section id, after sanitizing', async () => {
    const html = await renderAsync(
      <RstRenderer
        content=""
        html={'<section id="intro"><h2>Intro</h2><p>x</p><section id="sub"><h3>Sub <a href="javascript:alert(1)">bad</a></h3></section></section>'}
        locale="zh"
      />,
    );
    expect(html).toMatch(new RegExp(`<h2>Intro${anchorTo('intro', '本节链接').source}</h2>`));
    expect(html).toMatch(anchorTo('sub', '本节链接'));
    expect(html).not.toContain('javascript:');
  });

  test('rST without docutils renders through Markdown and gets anchors too', async () => {
    const html = await renderAsync(<RstRenderer content={'Overview\n--------\n\nText.\n'} />);
    expect(html).toContain('class="heading-anchor"');
  });
});

describe('page-only markup never reaches feeds', () => {
  test('markdownToHtml leaves headings and images bare', () => {
    const html = markdownToHtml(`${MD}\n![photo](/images/photo.jpg)\n`);
    expect(html).not.toContain('heading-anchor');
    expect(html).not.toContain('data-zoomable');
  });

  test('no full-content feed item carries anchors or zoom markers, Markdown or rST', () => {
    const items = getFeedItems('all', true);
    expect(items.length).toBeGreaterThan(0);
    const leaked = items.filter((item) => item.content.includes('heading-anchor') || item.content.includes('data-zoomable'));
    expect(leaked.map((item) => item.url)).toEqual([]);
  });
});

import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeZoomableImages from './rehype-zoomable-images';

const run = (html: string) =>
  String(unified().use(rehypeParse, { fragment: true }).use(rehypeZoomableImages).use(rehypeStringify).processSync(html));

describe('rehypeZoomableImages', () => {
  test('marks content images, including figures', () => {
    expect(run('<p><img src="/a.png" alt="A"></p>')).toBe('<p><img src="/a.png" alt="A" data-zoomable="true"></p>');
    expect(run('<figure><img src="/b.png"><figcaption>B</figcaption></figure>')).toContain('data-zoomable="true"');
  });

  test('leaves linked images, diagrams and styled icons alone', () => {
    expect(run('<a href="https://x.dev"><img src="/a.png"></a>')).not.toContain('data-zoomable');
    expect(run('<div class="mermaid"><svg><foreignObject><img src="/a.png"></foreignObject></svg></div>')).not.toContain('data-zoomable');
    expect(run('<img src="/badge.svg" style="height:20px">')).not.toContain('data-zoomable');
  });
});

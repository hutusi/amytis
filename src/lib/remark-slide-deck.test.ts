import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkHeadingIds } from './text-metrics';
import remarkSlideDeck, { type RemarkSlideDeckOptions } from './remark-slide-deck';
import { normalizeVuepressContainerSyntax } from './remark-vuepress-containers';
import { SLIDE_DECK_SLIDE } from './ui-classes';

function toHtml(markdown: string, options: RemarkSlideDeckOptions = {}): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkHeadingIds, { prefix: options.idPrefix })
      .use(remarkDirective)
      .use(remarkSlideDeck, options)
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(normalizeVuepressContainerSyntax(markdown)),
  );
}

const DECK = [
  ':::slides[Building a *Digital* Garden]{pdf="./talk.pdf" video="https://youtu.be/abc"}',
  '![Title slide](./slides/slide-01.png)',
  '![Agenda](./slides/slide-02.png)',
  ':::',
].join('\n');

describe('remarkSlideDeck', () => {
  test('turns a deck into a slide-deck element with one wrapper per slide', () => {
    const html = toHtml(DECK, { assetBase: 'posts/talk' });
    expect(html).toContain(
      '<slide-deck data-base="slides" data-count="2" data-title="Building a Digital Garden" ' +
      'data-pdf="/posts/talk/talk.pdf" data-video="https://youtu.be/abc">',
    );
    expect(html).toContain(
      `<div id="slides-1" class="${SLIDE_DECK_SLIDE}"><img src="./slides/slide-01.png" alt="Title slide" data-slide="1"></div>`,
    );
    expect(html).toContain('<div id="slides-2"');
    expect(html).toContain('data-slide="2"');
    expect(html).not.toContain('<p>');
    expect(html).not.toContain(':::');
  });

  test('accepts slides on one line, across soft breaks and in separate paragraphs', () => {
    const html = toHtml(':::slides\n![a](a.png) ![b](b.png)\n![c](c.png)  \n![d](d.png)\n\n![e](e.png)\n:::');
    expect(html).toContain('data-count="5"');
    expect(html).toContain('id="slides-5"');
  });

  test('accepts reference images and keeps their definitions', () => {
    const html = toHtml(':::slides\n![Intro][intro]\n\n[intro]: ./slides/intro.png\n:::');
    expect(html).toContain('<img src="./slides/intro.png" alt="Intro" data-slide="1">');
  });

  test('drops commented-out slides', () => {
    const html = toHtml(':::slides\n![a](a.png)\n<!-- ![b](b.png) -->\n\n<!-- ![c](c.png) -->\n![d](d.png)\n:::');
    expect(html).toContain('data-count="2"');
    expect(html).not.toContain('b.png');
    expect(html).not.toContain('c.png');
  });

  test('numbers automatic decks slides, slides2, … and skips explicit ids', () => {
    const html = toHtml([
      ':::slides\n![a](a.png)\n:::',
      ':::slides{#slides2}\n![b](b.png)\n:::',
      ':::slides\n![c](c.png)\n:::',
      ':::slides{#talk}\n![d](d.png)\n:::',
    ].join('\n\n'));
    expect(html).toContain('id="slides-1"');
    expect(html).toContain('id="slides2-1"');
    expect(html).toContain('id="slides3-1"');
    expect(html).toContain('id="talk-1"');
  });

  test('prefixes ids for the flow stream', () => {
    const html = toHtml(':::slides\n![a](a.png)\n:::', { idPrefix: 'f-2026-03-03-' });
    expect(html).toContain('data-base="f-2026-03-03-slides"');
    expect(html).toContain('id="f-2026-03-03-slides-1"');
  });

  test('resolves pdf paths like co-located images and keeps URLs', () => {
    expect(toHtml(':::slides{pdf="files/deck.pdf"}\n![a](a.png)\n:::', { assetBase: 'flows/2026/01/15' }))
      .toContain('data-pdf="/flows/2026/01/15/files/deck.pdf"');
    expect(toHtml(':::slides{pdf="/downloads/deck.pdf"}\n![a](a.png)\n:::', { assetBase: 'posts/x' }))
      .toContain('data-pdf="/downloads/deck.pdf"');
    expect(toHtml(':::slides{pdf="https://cdn.example.com/deck.pdf"}\n![a](a.png)\n:::', { assetBase: 'posts/x' }))
      .toContain('data-pdf="https://cdn.example.com/deck.pdf"');
    // Without an asset base (no page context) a relative path is kept as written.
    expect(toHtml(':::slides{pdf="./deck.pdf"}\n![a](a.png)\n:::')).toContain('data-pdf="./deck.pdf"');
  });

  test('leaves unrelated directives alone', () => {
    const html = toHtml(':::note\nbody\n:::');
    expect(html).not.toContain('slide-deck');
  });

  describe('fails the build on misauthored decks', () => {
    test.each([
      ['an empty deck', ':::slides[Talk]\n:::', /"Talk" \(line 1\): it has no slides/],
      ['text', ':::slides\n![a](a.png)\nA caption\n:::', /only images can go inside a deck, but line 3 has text "A caption"/],
      ['a heading', ':::slides\n## Part 1\n![a](a.png)\n:::', /has heading "Part 1"/],
      ['a list', ':::slides\n- ![a](a.png)\n:::', /has list/],
      ['code', ':::slides\n```\nx\n```\n:::', /has code/],
      ['raw HTML', ':::slides\n<img src="a.png">\n:::', /has html "<img src="a.png">"/],
      ['a linked image', ':::slides\n[![a](a.png)](https://example.com)\n:::', /has link/],
      ['an unknown attribute', ':::slides{.wide}\n![a](a.png)\n:::', /unknown attribute "class"/],
      ['a malformed id', ':::slides{#2026}\n![a](a.png)\n:::', /id "2026" must start with a letter/],
      ['a duplicate id', ':::slides{#talk}\n![a](a.png)\n:::\n\n:::slides{#talk}\n![b](b.png)\n:::', /already uses the id "talk"/],
      ['a non-http video', ':::slides{video="javascript:alert(1)"}\n![a](a.png)\n:::', /video="javascript:alert\(1\)" must be an http\(s\) URL/],
      ['an empty pdf', ':::slides{pdf=""}\n![a](a.png)\n:::', /pdf="" is empty/],
      ['attributes in a bare title', ':::slides My Talk {pdf="./talk.pdf"}\n![a](a.png)\n:::', /Put the title in brackets/],
      ['an unparsed opener', ':::slides {pdf="./talk.pdf"}\n![a](a.png)\n:::', /opener on line 1 was not recognized/],
    ])('%s', (_label, markdown, error) => {
      expect(() => toHtml(markdown, { assetBase: 'posts/x' })).toThrow(error);
    });

    test('a pdf that escapes the content folder', () => {
      expect(() => toHtml(':::slides{pdf="../other/talk.pdf"}\n![a](a.png)\n:::', { assetBase: 'posts/x' }))
        .toThrow(/points outside the content's folder/);
    });

    test('a slide id that collides with a heading id', () => {
      expect(() => toHtml('## Slides 2\n\n:::slides\n![a](a.png)\n![b](b.png)\n:::'))
        .toThrow(/slide id "slides-2" is already used on this page/);
      // An explicit deck id avoids it.
      expect(toHtml('## Slides 2\n\n:::slides{#talk}\n![a](a.png)\n![b](b.png)\n:::')).toContain('id="talk-2"');
    });

    test('a slide id that collides with an id written in raw HTML', () => {
      expect(() => toHtml('<h2 id="slides-2">Overview</h2>\n\n:::slides\n![a](a.png)\n![b](b.png)\n:::'))
        .toThrow(/slide id "slides-2" is already used on this page/);
      expect(() => toHtml("Jump <span ID='slides-1'>here</span>.\n\n:::slides\n![a](a.png)\n:::"))
        .toThrow(/slide id "slides-1" is already used/);
      // Look-alikes are not ids: another attribute, a commented-out tag.
      expect(toHtml('<div data-id="slides-1"></div>\n\n<!-- <h2 id="slides-1"> -->\n\n:::slides\n![a](a.png)\n:::'))
        .toContain('id="slides-1"');
    });

    test('a plain "Slides" heading does not collide: the deck itself carries no id', () => {
      expect(toHtml('## Slides\n\n:::slides\n![a](a.png)\n:::')).toContain('<h2 id="slides">');
    });
  });
});

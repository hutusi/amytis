import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkSlideDeck from './remark-slide-deck';
import rehypeSlideDeckIds from './rehype-slide-deck-ids';

function toHtml(markdown: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkSlideDeck)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlideDeckIds)
      .use(rehypeStringify)
      .processSync(markdown),
  );
}

const TWO_SLIDES = ':::slides[Talk]\n![a](a.png)\n![b](b.png)\n:::';

describe('rehypeSlideDeckIds', () => {
  test('rejects a raw-HTML id that is also a slide id', () => {
    expect(() => toHtml(`<h2 id="slides-2">Overview</h2>\n\n${TWO_SLIDES}`))
      .toThrow('Slide deck "Talk": slide id "slides-2" is already used on this page, by a <h2> in raw HTML');
    // Inline HTML, any case.
    expect(() => toHtml(`Jump <span ID='slides-1'>here</span>.\n\n${TWO_SLIDES}`)).toThrow(/by a <span>/);
  });

  test('compares ids as the browser reads them, with references decoded', () => {
    expect(() => toHtml(`<h2 id="slides&#45;2">Overview</h2>\n\n${TWO_SLIDES}`)).toThrow(/slide id "slides-2"/);
  });

  test('look-alikes are not ids', () => {
    const html = toHtml([
      '<div data-id="slides-1"></div>',
      `<div title=' id="slides-1"'></div>`,
      '<!-- <h2 id="slides-2"> -->',
      '',
      TWO_SLIDES,
    ].join('\n'));
    expect(html).toContain('id="slides-1"');
    expect(html).toContain('id="slides-2"');
  });

  test('pages without decks, or with unrelated ids, pass', () => {
    expect(toHtml('<h2 id="slides-2">Overview</h2>')).toContain('<h2 id="slides-2">');
    expect(toHtml(`<h2 id="intro">Intro</h2>\n\n${TWO_SLIDES}`)).toContain('id="slides-2"');
  });
});

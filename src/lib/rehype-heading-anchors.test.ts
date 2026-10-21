import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeHeadingAnchors from './rehype-heading-anchors';

const run = (html: string) =>
  String(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeHeadingAnchors, { label: 'Link to this section' })
      .use(rehypeStringify)
      .processSync(html),
  );

const anchor = (id: string) => `<a class="heading-anchor" href="#${id}" aria-label="Link to this section"></a>`;

describe('rehypeHeadingAnchors', () => {
  test('appends an empty, labelled link to h2–h4 only', () => {
    const out = run('<h1 id="t">T</h1><h2 id="a">A</h2><h3 id="b">B</h3><h4 id="c">C</h4><h5 id="d">D</h5>');
    expect(out).toBe(`<h1 id="t">T</h1><h2 id="a">A${anchor('a')}</h2><h3 id="b">B${anchor('b')}</h3><h4 id="c">C${anchor('c')}</h4><h5 id="d">D</h5>`);
  });

  test("borrows the id of the docutils <section> it opens", () => {
    expect(run('<section id="intro"><h2>Intro</h2><p>x</p></section>'))
      .toBe(`<section id="intro"><h2>Intro${anchor('intro')}</h2><p>x</p></section>`);
    // Not the section's first element: the id belongs to something else.
    expect(run('<section id="s"><p>x</p><h2>Later</h2></section>')).not.toContain('heading-anchor');
  });

  test('skips headings with no id, hidden headings, and headings in links or summaries', () => {
    expect(run('<h2>No id</h2>')).not.toContain('heading-anchor');
    expect(run('<h2 class="sr-only" id="footnote-label">Footnotes</h2>')).not.toContain('heading-anchor');
    expect(run('<a href="/x"><h2 id="in-link">Card</h2></a>')).not.toContain('heading-anchor');
    expect(run('<details><summary><h3 id="s">More</h3></summary></details>')).not.toContain('heading-anchor');
  });

  test('is idempotent', () => {
    const once = run('<h2 id="a">A</h2>');
    expect(run(once)).toBe(once);
  });
});

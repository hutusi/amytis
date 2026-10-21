import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

const css = fs.readFileSync('src/app/globals.css', 'utf8');
const rule = (selector: string) => {
  const start = css.search(new RegExp(`(^|\\n)${selector} \\{`));
  if (start === -1) throw new Error(`no ${selector} rule`);
  return css.slice(start, css.indexOf('}', start));
};

describe('page-level overflow and anchor offsets', () => {
  test('body clips horizontal overflow without becoming a scroll container', () => {
    // overflow-x: hidden on html/body turned body into a non-scrolling scroll
    // container, and every position: sticky sidebar scrolled away.
    expect(rule('body')).toContain('overflow-x: clip');
    expect(rule('html')).not.toContain('overflow');
  });

  test('anchor offset lives in one place', () => {
    expect(rule('html')).not.toContain('scroll-padding-top');
    expect(rule('\\[id\\]')).toContain('scroll-margin-top: 5rem');
    expect(fs.readFileSync('src/lib/scroll-utils.ts', 'utf8')).toContain('HEADING_OFFSET_PX = 80');
  });
});

describe('immersive reading hides floating chrome', () => {
  test('the back-to-top button is hidden with the navbar and footer', () => {
    // The window doesn't scroll while the reader is open, so the button
    // would sit there doing nothing.
    expect(css).toMatch(/\[data-immersive="true"\] \[data-back-to-top="true"\][^{]*\{\n  display: none;/);
  });
});

describe('heading anchors', () => {
  test('the "#" is drawn by CSS, hidden until hover or focus, faint on touch', () => {
    // The link itself is empty so the glyph stays out of copied text and the
    // search index; without this rule the anchor would be invisible.
    expect(rule('\\.heading-anchor::before')).toContain('content: "#"');
    expect(rule('\\.heading-anchor')).toContain('opacity: 0');
    expect(css).toMatch(/h2:hover > \.heading-anchor,\nh3:hover > \.heading-anchor,\nh4:hover > \.heading-anchor,\n\.heading-anchor:focus-visible \{\n  opacity: 1;/);
    expect(css).toMatch(/@media \(hover: none\) \{\n  \.heading-anchor \{\n    opacity: 0\.4;/);
  });

  test("rST link styling doesn't recolor them", () => {
    const rstLinkRules = css.match(/\.rst-rendered a\[href\][^{]*\{/g) ?? [];
    expect(rstLinkRules.length).toBeGreaterThan(0);
    for (const selector of rstLinkRules) {
      for (const part of selector.replace('{', '').split(',')) expect(part).toContain(':not(.heading-anchor)');
    }
  });
});

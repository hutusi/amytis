import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

const css = fs.readFileSync('src/app/globals.css', 'utf8');

/** Every rule's selector or at-rule prelude, with the preludes enclosing it. */
function rules(source: string): { prelude: string; within: string[] }[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { prelude: string; within: string[] }[] = [];
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const prelude = text.slice(start, i).trim();
      out.push({ prelude, within: [...stack] });
      stack.push(prelude);
      start = i + 1;
    } else if (c === '}') {
      stack.pop();
      start = i + 1;
    } else if (c === ';') {
      start = i + 1;
    }
  }
  return out;
}

const DARK_ONLY = /(^|[\s,(>~+])(html)?\.dark\b|\[data-reading-theme="dark"\]/;
/** `html:not(.dark)` is the light theme's selector, not a dark one. */
const isDarkOnly = (prelude: string) => DARK_ONLY.test(prelude.replace(/:not\(\.dark\)/g, ''));

describe('print always gets the light theme', () => {
  test('every dark-only rule sits inside @media screen', () => {
    const dark = rules(css).filter((r) => isDarkOnly(r.prelude) && !r.prelude.startsWith('@'));
    // Sanity: the scan sees the token block, the palettes, Shiki and alerts.
    expect(dark.length).toBeGreaterThan(10);
    const unguarded = dark.filter((r) => !r.within.some((p) => p === '@media screen')).map((r) => r.prelude);
    expect(unguarded).toEqual([]);
  });

  test('the dark: variant is screen-only too', () => {
    const variant = rules(css).find((r) => r.prelude.startsWith('&:where(.dark'));
    expect(variant?.within).toEqual(['@custom-variant dark', '@media screen']);
  });
});

describe('print stylesheet', () => {
  const printBlock = css.slice(css.indexOf('@media print {\n  :root {'));

  test('exists, last, and forces a light color scheme', () => {
    expect(printBlock.length).toBeGreaterThan(0);
    expect(printBlock).toMatch(/:root \{[^}]*color-scheme: light !important;/);
  });

  test('stops animations, which would print flow cards below the fold invisible', () => {
    expect(printBlock).toMatch(/\*,\n  \*::before,\n  \*::after \{\n    animation: none !important;\n    transition: none !important;/);
  });

  test('releases the scroll locks that would clip printing to one screen', () => {
    expect(printBlock).toMatch(/html,\n  body \{\n    overflow: visible !important;/);
  });

  test('hides the chrome hooks and prints code in its light theme', () => {
    for (const hook of ['data-site-nav', 'data-site-footer', 'data-reading-progress']) {
      expect(printBlock).toContain(`[${hook}="true"]`);
    }
    expect(printBlock).toMatch(/\.shiki,\n  \.shiki span \{\n    color: var\(--shiki-light, var\(--foreground\)\) !important;/);
    expect(printBlock).toContain('white-space: pre-wrap;');
  });

  test('external links print their address', () => {
    expect(printBlock).toMatch(/\[data-print-url="true"\]::after \{\n    content: " \(" attr\(href\) "\)";/);
  });
});

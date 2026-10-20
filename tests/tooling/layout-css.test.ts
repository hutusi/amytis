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

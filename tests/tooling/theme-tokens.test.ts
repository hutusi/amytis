import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

const css = fs.readFileSync('src/app/globals.css', 'utf8');
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const PALETTES = ['blue', 'rose', 'amber'];

describe('theme palettes', () => {
  test('data-palette sits on <html>, where next-themes puts .dark', () => {
    expect(layout).toMatch(/<html[^>]*data-palette=\{siteConfig\.themeColor\}/);
    expect(layout).not.toMatch(/<body[^>]*data-palette/);
  });

  test.each(PALETTES)('the %s palette has light and dark (incl. overlay) variants', (palette) => {
    expect(css).toContain(`[data-palette="${palette}"] {`);
    expect(css).toContain(`[data-palette="${palette}"].dark,\n[data-palette="${palette}"] .dark {`);
  });

  test('no dark palette rule requires .dark and data-palette on the same element only', () => {
    expect(css).not.toContain('.dark[data-palette=');
  });
});

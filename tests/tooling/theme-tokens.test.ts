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

// ─── WCAG contrast of the color tokens ───────────────────────────────────────

/** Custom properties declared in the first rule whose selector starts with `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no rule for ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = tokens(':root');
const dark = tokens('.dark');
const themes = [
  { name: 'light', base: light, accent: light['--accent'] },
  { name: 'dark', base: { ...light, ...dark }, accent: dark['--accent'] },
  ...PALETTES.flatMap((p) => [
    { name: `${p} light`, base: light, accent: tokens(`[data-palette="${p}"]`)['--accent'] },
    { name: `${p} dark`, base: { ...light, ...dark }, accent: tokens(`[data-palette="${p}"].dark,\n[data-palette="${p}"] .dark`)['--accent'] },
  ]),
];

describe('theme contrast (WCAG AA, 4.5:1 for text)', () => {
  test.each(themes)('$name: accent text on the background', ({ base, accent }) => {
    expect(contrast(accent, base['--background'])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(themes)('$name: accent-contrast text on an accent fill', ({ base, accent }) => {
    expect(contrast(base['--accent-contrast'], accent)).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    { name: 'light', base: light },
    { name: 'dark', base: { ...light, ...dark } },
  ])('$name: muted and body text on the background', ({ base }) => {
    expect(contrast(base['--muted'], base['--background'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(base['--foreground'], base['--background'])).toBeGreaterThanOrEqual(4.5);
  });
});

test('no accent fill pairs with hard-coded white text', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.tsx')) {
        fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
          if (/\bbg-accent\b(?![/-])/.test(line) && /\btext-white\b/.test(line)) offenders.push(`${full}:${i + 1}`);
        });
      }
    }
  };
  walk('src');
  expect(offenders).toEqual([]);
});

describe('immersive reader themes keep AA accent text on a dark site', () => {
  // Light and sepia readers are light surfaces even when the site is dark,
  // so they must not inherit dark mode's bright accent.
  test.each(['light', 'sepia'])('%s reader: accent and accent-contrast for every palette', (theme) => {
    const reader = tokens(`[data-reader-overlay="true"][data-reading-theme="${theme}"]`);
    const accents = [
      reader['--accent'],
      ...PALETTES.map((p) => tokens(`[data-palette="${p}"] [data-reader-overlay="true"][data-reading-theme="${theme}"]`)['--accent']),
    ];
    for (const accent of accents) {
      expect(contrast(accent, reader['--background'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(reader['--accent-contrast'], accent)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

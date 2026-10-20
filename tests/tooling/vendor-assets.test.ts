import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { copyKatexAssets, KATEX_VERSION } from '../../scripts/copy-vendor-assets';
import { KATEX_STYLESHEET_HREF } from '../../src/components/KatexStyles';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe('vendored KaTeX assets', () => {
  const target = copyKatexAssets();

  test('the stylesheet URL KatexStyles links to is the copied file', () => {
    expect(KATEX_STYLESHEET_HREF).toBe(`/vendor/katex/${KATEX_VERSION}/katex.min.css`);
    expect(fs.existsSync(path.join('public', KATEX_STYLESHEET_HREF))).toBe(true);
    expect(path.relative('public', path.join(target, 'katex.min.css'))).toBe(KATEX_STYLESHEET_HREF.slice(1));
  });

  test('every url() in the copied stylesheet resolves to a copied font', () => {
    const css = fs.readFileSync(path.join(target, 'katex.min.css'), 'utf8');
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ''));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(fs.existsSync(path.join(target, url))).toBe(true);
    }
  });

  test('no module imports katex.min.css (it would ship on every article page)', () => {
    const cssImport = /^\s*(?:import\s+(?:[^'"]*from\s+)?|@import\s+(?:url\()?)['"][^'"]*katex[^'"]*\.css['"]/m;
    const offenders = walk('src').filter((f) => /\.(ts|tsx|css)$/.test(f) && cssImport.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

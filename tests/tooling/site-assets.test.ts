import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'bun:test';
import { assertSiteAssetsExist } from '../../scripts/copy-assets';
import { siteConfig } from '../../site.config';
import { siteConfig as exampleConfig } from '../../site.config.example';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-site-assets-'));
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.mkdirSync(path.join(root, 'src', 'app'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'og.png'), '');
fs.writeFileSync(path.join(root, 'src', 'app', 'favicon.ico'), '');

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('assertSiteAssetsExist', () => {
  test('passes when every site-relative asset exists', () => {
    expect(() => assertSiteAssetsExist({ ogImage: '/og.png', logo: { src: '', favicon: '/favicon.ico' } }, root)).not.toThrow();
  });

  test('throws naming each missing asset', () => {
    expect(() => assertSiteAssetsExist({ ogImage: '/missing.png', logo: { src: '/logo.svg' } }, root))
      .toThrow(/ogImage: "\/missing\.png"[\s\S]*logo\.src: "\/logo\.svg"/);
  });

  test('only the favicon may come from the app directory', () => {
    expect(() => assertSiteAssetsExist({ ogImage: '/favicon.ico' }, root)).toThrow(/ogImage/);
  });

  test('ignores absolute and protocol-relative URLs and query strings', () => {
    expect(() => assertSiteAssetsExist({ ogImage: 'https://cdn.test/og.png', logo: { src: '//cdn.test/l.svg' } }, root)).not.toThrow();
    expect(() => assertSiteAssetsExist({ ogImage: '/og.png?v=2' }, root)).not.toThrow();
  });

  test("this repo's site config and the shipped example reference only existing assets", () => {
    expect(() => assertSiteAssetsExist(siteConfig)).not.toThrow();
    expect(() => assertSiteAssetsExist(exampleConfig)).not.toThrow();
  });

  test('the apple touch icon the root layout links to exists', () => {
    const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
    const href = layout.match(/apple:\s*'([^']+)'/)?.[1];
    expect(href).toBe('/apple-touch-icon.png');
    expect(fs.existsSync(path.join('public', href!.slice(1)))).toBe(true);
  });
});

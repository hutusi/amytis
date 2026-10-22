import fs from 'node:fs';
import { afterEach, describe, expect, test } from 'bun:test';
import { OG_ACCENTS, renderOgCard, titleFontSize } from '@/lib/og-card';

/** PNG signature plus the IHDR width and height. */
async function pngInfo(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const view = new DataView(bytes.buffer);
  return {
    signature: Buffer.from(bytes.subarray(0, 8)).toString('hex'),
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('share card rendering', () => {
  test.each([
    ['an English card', { locale: 'en', title: 'Code Block Features Showcase', date: '2026-05-25', authors: ['Amytis Team'] }],
    ['a Chinese card', { locale: 'zh', title: '中文原创示例文章', kicker: '数字花园', authors: ['John Hu'] }],
  ])('renders %s as a 1200×630 PNG', async (_label, card) => {
    const response = renderOgCard(card);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(await pngInfo(response)).toEqual({ signature: '89504e470d0a1a0a', width: 1200, height: 630 });
  });

  test('bundled fonts cover Latin and common Chinese, so rendering never downloads a font', async () => {
    // next/og fetches any glyph its fonts lack from Google Fonts. Its own
    // wasm loads through fetch() of a data: URL, which passes through.
    const fetched: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith('data:')) return realFetch(input, init);
      fetched.push(url);
      throw new Error('no network in tests');
    }) as typeof fetch;
    await renderOgCard({
      locale: 'zh',
      title: 'Mixed 中英文标题：从 Pages Router 迁移到 App Router，“引号”与《书名》',
      kicker: '笔记 · Notes',
      date: '2026-10-21',
      authors: ['胡同', 'Alice'],
    }).arrayBuffer();
    expect(fetched).toEqual([]);
  });
});

describe('titleFontSize', () => {
  test('shrinks with visual length, counting CJK characters as full width', () => {
    expect(titleFontSize('Short title')).toBe(72);
    expect(titleFontSize('A'.repeat(60))).toBe(60);
    expect(titleFontSize('A'.repeat(120))).toBe(52);
    expect(titleFontSize('中'.repeat(20))).toBe(72);
    expect(titleFontSize('中'.repeat(40))).toBe(60);
    expect(titleFontSize('中'.repeat(60))).toBe(52);
  });
});

describe('palette accents', () => {
  test('match the light-theme --accent of each palette in globals.css', () => {
    const css = fs.readFileSync('src/app/globals.css', 'utf8');
    const accentIn = (selector: string) => {
      const start = css.indexOf(`${selector} {`);
      expect(start).toBeGreaterThanOrEqual(0);
      return css.slice(start).match(/--accent:\s*(#[0-9a-f]{6})/i)?.[1];
    };
    expect(OG_ACCENTS.default).toBe(accentIn(':root') as string);
    for (const palette of ['blue', 'rose', 'amber'] as const) {
      expect(OG_ACCENTS[palette]).toBe(accentIn(`[data-palette="${palette}"]`) as string);
    }
  });
});

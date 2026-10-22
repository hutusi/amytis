import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

/**
 * Share cards render through next/og (Satori), which reads only ttf, otf and
 * woff. A woff2 here fails at build time; a missing CJK font silently sends
 * every Chinese glyph to Google Fonts during the build. See
 * scripts/build-og-fonts.py.
 */
const FONTS = [
  ['LibreBaskerville-Bold.ttf', 'truetype'],
  ['Inter-Regular.ttf', 'truetype'],
  ['Inter-Bold.ttf', 'truetype'],
  ['NotoSerifSC-Bold.otf', 'opentype'],
] as const;

function signature(file: string): string {
  const head = fs.readFileSync(`src/fonts/og/${file}`).subarray(0, 4);
  if (head.equals(Buffer.from([0, 1, 0, 0]))) return 'truetype';
  return head.toString('latin1') === 'OTTO' ? 'opentype' : head.toString('latin1');
}

describe('share-card fonts', () => {
  test.each(FONTS)('%s is %s, not woff2', (file, kind) => {
    expect(signature(file)).toBe(kind);
  });

  test('the CJK font is the subset, not the 12MB upstream file', () => {
    const { size } = fs.statSync('src/fonts/og/NotoSerifSC-Bold.otf');
    expect(size).toBeGreaterThan(1_000_000);
    expect(size).toBeLessThan(4_000_000);
  });

  test('ships its license', () => {
    expect(fs.readFileSync('src/fonts/og/OFL.txt', 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });
});

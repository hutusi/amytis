import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

/**
 * Bytes that every page would download again if they crept back in. Each
 * case names what it cost and where the reasoning lives.
 */
describe('client bundle guards', () => {
  test('tailwind-merge stays out: cn() is clsx-only', () => {
    // It cost 8.6KB gzip on most pages for a single class conflict; see the
    // doc comment in src/lib/cn.ts before reaching for it again.
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps)).not.toContain('tailwind-merge');
  });
});

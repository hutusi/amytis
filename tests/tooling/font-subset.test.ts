import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

// Body text renders in Inter and every page preloads both weights, so the
// shipped files are subsets from scripts/subset-inter.py (~36 KB each). The
// full upstream files are ~112 KB; dropping them back in would silently add
// ~150 KB to every first visit. Re-run the script instead.
const SUBSET_BUDGET_BYTES = 48 * 1024;
const fontsDir = path.join(import.meta.dir, '..', '..', 'src', 'fonts');

describe('Inter font files', () => {
  for (const weight of ['Regular', 'Bold']) {
    test(`Inter-${weight}.woff2 is the subset build`, () => {
      const bytes = fs.readFileSync(path.join(fontsDir, `Inter-${weight}.woff2`));
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2');
      expect(bytes.length).toBeLessThan(SUBSET_BUDGET_BYTES);
    });
  }
});

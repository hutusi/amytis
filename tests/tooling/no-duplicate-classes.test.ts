import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

/**
 * Anti-regression guard for the styling de-duplication. The class strings
 * below were centralized into primitives (src/components/ui/*), class
 * constants (src/lib/ui-classes.ts), or globals.css `@layer components`
 * utilities. This test fails if any literal reappears in a `.tsx` file
 * outside its single definition site — which would silently un-do the dedup.
 *
 * Class constants live in src/lib/ui-classes.ts and globals.css (a `.css`
 * file), both outside the scanned `.tsx` set, so most rules allow no `.tsx`
 * at all. Mirrors the fs.readFileSync grep-guard in src/lib/content/io.test.ts.
 */

const REPO_ROOT = process.cwd();
const ROOTS = ['src/components', 'src/app'];

/** Normalized (forward-slash) repo-relative path, for stable allow-list matching. */
const relPath = (file: string): string => path.relative(REPO_ROOT, file).split(path.sep).join('/');

const RULES: Array<{ label: string; pattern: RegExp; allow: string[] }> = [
  {
    label: 'meta-label base — use <MetaLabel> or metaLabel()',
    pattern: /text-\[10px\] font-sans font-bold uppercase tracking-widest/,
    allow: [],
  },
  {
    label: 'tag pill — use <Tag variant="pill">',
    pattern: /px-2 py-0\.5 rounded-full bg-ink\/\[0\.05\] text-muted\/70/,
    allow: ['src/components/Tag.tsx'],
  },
  {
    label: 'card hover — use CARD_HOVER from ui-classes',
    pattern: /group-hover:border-accent\/30 group-hover:bg-ink\/\[0\.04\]/,
    allow: [],
  },
  {
    label: 'cover zoom — use COVER_ZOOM from ui-classes',
    pattern: /object-cover transition-transform duration-(?:500|700) group-hover:scale-105/,
    allow: [],
  },
  {
    label: 'meta dot — use <MetaDot>',
    pattern: /(?:w-1 h-1|h-1 w-1) rounded-full bg-ink\/\[0\.12\]/,
    allow: ['src/components/ui/MetaDot.tsx'],
  },
  {
    label: 'section heading — use <SectionHeading>',
    pattern: /text-2xl sm:text-3xl font-serif font-bold text-heading/,
    allow: ['src/components/ui/SectionHeading.tsx'],
  },
  {
    label: 'dropdown panel — use the .dropdown-panel utility',
    pattern: /backdrop-blur-md border border-ink\/\[0\.0[67]\] rounded-xl shadow-xl/,
    allow: [],
  },
  {
    label: 'hairline divider — use the .divider-hairline utility',
    pattern: /h-px flex-1 bg-ink\/\[0\.05\]/,
    allow: [],
  },
];

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsx(full));
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

describe('design-system class de-duplication guard', () => {
  const files = ROOTS.flatMap(root => walkTsx(path.join(process.cwd(), root)));

  test('scans a non-trivial number of component/app files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const rule of RULES) {
    test(`not re-inlined: ${rule.label}`, () => {
      const offenders = files
        .filter(file => !rule.allow.includes(relPath(file)))
        .filter(file => rule.pattern.test(fs.readFileSync(/* turbopackIgnore: true */ file, 'utf8')))
        .map(relPath);
      expect(offenders).toEqual([]);
    });
  }
});

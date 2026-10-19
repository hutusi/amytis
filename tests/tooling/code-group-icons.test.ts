import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { BEGIN_MARKER, END_MARKER, GLOBALS_CSS, ICON_DIR, MAP, buildCssBlock } from '../../scripts/generate-code-group-icons';
import { resolveCodeGroupIcon } from '../../src/lib/code-group-icons';

const css = fs.readFileSync(GLOBALS_CSS, 'utf8');
const block = css.slice(css.indexOf(BEGIN_MARKER), css.indexOf(END_MARKER) + END_MARKER.length);
const keys = Object.keys(MAP);

describe('code-group icons', () => {
  test('globals.css carries exactly the generated block (rerun the generator after edits)', () => {
    expect(block).toBe(buildCssBlock(keys));
  });

  test('icons are files referenced by url(), never data URIs in the global stylesheet', () => {
    expect(css).not.toContain('data:image/svg+xml');
    for (const key of keys) {
      expect(fs.existsSync(path.join(ICON_DIR, `${key}.svg`))).toBe(true);
    }
    expect(fs.readdirSync(ICON_DIR).sort()).toEqual(keys.map((k) => `${k}.svg`).sort());
  });

  test('every key the resolver can return has an icon', () => {
    const labels = ['npm', 'yarn', 'pnpm', 'bun', 'deno', 'vite', 'docker', 'node', 'react', 'vue', 'next.js', 'tailwind',
      'a.ts', 'a.js', 'a.py', 'a.rs', 'a.go', 'a.java', 'a.rb', 'a.php', 'a.c', 'a.cpp', 'a.html', 'a.css',
      'a.json', 'a.yml', 'a.md', 'a.sh', 'Dockerfile', 'package.json'];
    for (const label of labels) {
      const key = resolveCodeGroupIcon(label);
      expect(key).not.toBeNull();
      expect(keys).toContain(key!);
    }
  });
});

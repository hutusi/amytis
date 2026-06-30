import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'bun';
import { describe, expect, test } from 'bun:test';

/**
 * Repo-wide guard: every tracked text-source file must be valid UTF-8 with no
 * NUL bytes. This exists because a `.tsx` file once contained literal NUL
 * (0x00) bytes (used as a join delimiter) — which made `file`/git/grep treat
 * it as binary, so plain `grep` silently skipped it. That blind spot let a
 * codemod miss the file and every grep-based check falsely report it clean.
 *
 * Two assertions are needed, and the NUL check is the load-bearing one:
 *   - NUL is *valid* UTF-8, so a fatal TextDecoder alone would NOT catch it.
 *   - The fatal-decode adds coverage for the broader "not valid UTF-8" class.
 *
 * Mirrors the repo-wide guard in tests/tooling/no-duplicate-classes.test.ts.
 */

const REPO_ROOT = process.cwd();

// Allowlist of text-source extensions. An allowlist self-excludes tracked
// binaries (src/fonts/*.woff2|ttf, favicon.ico, content/public images) and is
// less fragile than a binary denylist against a future new binary type.
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs',
  '.css', '.md', '.mdx', '.rst',
  '.json', '.yml', '.yaml', '.py', '.svg', '.html',
]);

/** Tracked source files, via `git ls-files -z` (NUL-delimited handles CJK names). */
function trackedSourceFiles(): string[] {
  const result = spawnSync(['git', 'ls-files', '-z']);
  if (result.exitCode !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr.toString()}`);
  }
  return result.stdout
    .toString()
    .split('\0')
    .filter(Boolean)
    .filter(rel => SOURCE_EXTENSIONS.has(path.extname(rel).toLowerCase()));
}

describe('tracked source files are valid UTF-8 (no NUL / binary)', () => {
  const files = trackedSourceFiles();

  test('scans a non-trivial number of tracked source files', () => {
    // Fails loudly if `git ls-files` enumeration ever silently collapses,
    // which would otherwise make the guard below a false pass.
    expect(files.length).toBeGreaterThan(200);
  });

  test('no tracked source file contains NUL bytes or invalid UTF-8', () => {
    const offenders: string[] = [];
    for (const rel of files) {
      const bytes = fs.readFileSync(/* turbopackIgnore: true */ path.join(REPO_ROOT, rel));
      if (bytes.includes(0)) {
        offenders.push(`${rel} (contains NUL byte)`);
        continue;
      }
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        offenders.push(`${rel} (invalid UTF-8)`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

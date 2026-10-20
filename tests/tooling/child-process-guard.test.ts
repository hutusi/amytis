import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

/**
 * Turbopack traces the executable of an imported spawn / spawnSync / execFile
 * as a file. Fed a non-literal command (rst-renderer's configurable Python),
 * it traced the whole project from every route that reached the module: the
 * "Encountered unexpected file in NFT list" build warning. turbopackIgnore
 * doesn't help, so app code gets child_process via
 * process.getBuiltinModule('node:child_process') instead (see
 * src/lib/rst-renderer.ts). Scripts and tests aren't bundled; only src/ is
 * checked.
 */
const STATIC_CHILD_PROCESS = /from\s+['"](?:node:)?child_process['"]|require\(\s*['"](?:node:)?child_process['"]\s*\)/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('child_process in bundled code', () => {
  test('no src/ module imports child_process statically', () => {
    const offenders = sourceFiles(path.join(process.cwd(), 'src'))
      .filter((file) => STATIC_CHILD_PROCESS.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });

  test('the pattern catches both import forms', () => {
    expect(STATIC_CHILD_PROCESS.test(`import { spawnSync } from 'node:child_process';`)).toBe(true);
    expect(STATIC_CHILD_PROCESS.test(`const cp = require("child_process");`)).toBe(true);
    expect(STATIC_CHILD_PROCESS.test(`process.getBuiltinModule('node:child_process')`)).toBe(false);
  });
});

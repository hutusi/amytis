import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'bun';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The script writes under process.cwd(), so each test runs it in its own
// temp directory and never touches the real content/flows.
const SCRIPT = path.resolve('scripts/new-flow.ts');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-new-flow-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

function run(cwd: string, ...args: string[]) {
  const result = spawnSync(['bun', SCRIPT, ...args], { cwd });
  return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

function site(name: string): { cwd: string; month: string; day: string } {
  const cwd = path.join(root, name);
  fs.mkdirSync(cwd);
  const now = new Date();
  const month = path.join(cwd, 'content', 'flows', String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  return { cwd, month, day: String(now.getDate()).padStart(2, '0') };
}

describe('new-flow script', () => {
  test("creates today's flow as a single file", () => {
    const { cwd, month, day } = site('single');
    expect(run(cwd).code).toBe(0);
    expect(fs.readFileSync(path.join(month, `${day}.md`), 'utf8')).toContain('tags: []');
  });

  test('--folder creates DD/index.md and points at new-slides', () => {
    const { cwd, month, day } = site('folder');
    const { code, stdout } = run(cwd, '--folder');
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(month, day, 'index.md'))).toBe(true);
    expect(fs.existsSync(path.join(month, `${day}.md`))).toBe(false);
    expect(stdout).toContain(`bun run new-slides <export-folder | deck.pdf> --into ${path.relative(cwd, path.join(month, day))}/`);

    const mdx = site('folder-mdx');
    expect(run(mdx.cwd, '--folder', '--mdx').code).toBe(0);
    expect(fs.existsSync(path.join(mdx.month, mdx.day, 'index.mdx'))).toBe(true);
  });

  test("refuses a second flow for today in any form", () => {
    const fileFirst = site('file-first');
    expect(run(fileFirst.cwd).code).toBe(0);
    const folder = run(fileFirst.cwd, '--folder');
    expect(folder.code).not.toBe(0);
    expect(folder.stderr).toContain('already exists');
    expect(fs.existsSync(path.join(fileFirst.month, fileFirst.day))).toBe(false);

    const folderFirst = site('folder-first');
    expect(run(folderFirst.cwd, '--folder', '--mdx').code).toBe(0);
    expect(run(folderFirst.cwd).code).not.toBe(0);
    expect(fs.existsSync(path.join(folderFirst.month, `${folderFirst.day}.md`))).toBe(false);
  });
});

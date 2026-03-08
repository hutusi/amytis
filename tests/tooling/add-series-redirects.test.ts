import { describe, test, expect, afterAll } from 'bun:test';
import { spawnSync } from 'bun';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const SCRIPT = 'scripts/add-series-redirects.ts';
const TEST_SERIES = 'test-migration-series';
const SERIES_DIR = path.join('content', 'series', TEST_SERIES);

// Helper — write a minimal post file
function writePost(filePath: string, slug: string, extra: Record<string, unknown> = {}) {
  const data = { title: `Test ${slug}`, date: '2024-01-01', ...extra };
  fs.writeFileSync(filePath, matter.stringify('Content here.', data));
}

afterAll(() => {
  if (fs.existsSync(SERIES_DIR)) {
    fs.rmSync(SERIES_DIR, { recursive: true });
  }
});

describe('Tooling: add-series-redirects', () => {
  // --auto-paths overrides site.config.ts so canonical URL becomes /[series]/[slug],
  // which differs from the old /posts/[slug], triggering redirectFrom additions.

  test('adds redirectFrom to a flat .md series post', () => {
    fs.mkdirSync(SERIES_DIR, { recursive: true });
    const filePath = path.join(SERIES_DIR, 'flat-post.md');
    writePost(filePath, 'flat-post');

    const result = spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths']);
    expect(result.exitCode).toBe(0);

    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    expect(data.redirectFrom).toContain('/posts/flat-post');
  });

  test('adds redirectFrom to a flat .mdx series post', () => {
    fs.mkdirSync(SERIES_DIR, { recursive: true });
    const filePath = path.join(SERIES_DIR, 'flat-post.mdx');
    writePost(filePath, 'flat-post-mdx');

    spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths']);

    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    expect(data.redirectFrom).toContain('/posts/flat-post');
  });

  test('adds redirectFrom to a folder-based series post (index.md)', () => {
    const postDir = path.join(SERIES_DIR, 'folder-post');
    fs.mkdirSync(postDir, { recursive: true });
    const filePath = path.join(postDir, 'index.md');
    writePost(filePath, 'folder-post');

    spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths']);

    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    expect(data.redirectFrom).toContain('/posts/folder-post');
  });

  test('is idempotent — does not add duplicate redirectFrom entries', () => {
    fs.mkdirSync(SERIES_DIR, { recursive: true });
    const filePath = path.join(SERIES_DIR, 'idempotent-post.md');
    writePost(filePath, 'idempotent-post');

    spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths']);
    spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths']);

    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    const entries = (data.redirectFrom ?? []).filter((e: string) => e === '/posts/idempotent-post');
    expect(entries.length).toBe(1);
  });

  test('--dry-run does not modify files', () => {
    fs.mkdirSync(SERIES_DIR, { recursive: true });
    const filePath = path.join(SERIES_DIR, 'dryrun-post.md');
    writePost(filePath, 'dryrun-post');
    const originalContent = fs.readFileSync(filePath, 'utf8');

    const result = spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths', '--dry-run']);
    expect(result.exitCode).toBe(0);

    const afterContent = fs.readFileSync(filePath, 'utf8');
    expect(afterContent).toBe(originalContent);
  });

  test('--dry-run output mentions the file that would be updated', () => {
    fs.mkdirSync(SERIES_DIR, { recursive: true });
    const filePath = path.join(SERIES_DIR, 'dryrun-mention.md');
    writePost(filePath, 'dryrun-mention');

    const result = spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths', '--dry-run']);
    const output = result.stdout.toString();
    expect(output).toContain('dryrun-mention');
    expect(output).toContain('/posts/dryrun-mention');
  });

  test('skips posts whose redirectFrom already contains the old path', () => {
    fs.mkdirSync(SERIES_DIR, { recursive: true });
    const filePath = path.join(SERIES_DIR, 'already-done.md');
    writePost(filePath, 'already-done', { redirectFrom: ['/posts/already-done'] });

    const result = spawnSync(['bun', SCRIPT, TEST_SERIES, '--auto-paths']);
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('[skip]');
    expect(output).toContain('already-done');
  });
});

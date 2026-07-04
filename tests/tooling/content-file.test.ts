import { describe, test, expect, afterAll } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { isoDateStamp, extPair, ensureDir } from '../../scripts/lib/content-file';

describe('scripts/lib/content-file: isoDateStamp', () => {
  test('defaults to today in UTC, formatted YYYY-MM-DD', () => {
    expect(isoDateStamp()).toBe(new Date().toISOString().split('T')[0]);
    expect(isoDateStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('uses UTC, not local time, for an explicit date', () => {
    // 23:30 UTC stays on the 5th in UTC regardless of the host timezone.
    expect(isoDateStamp(new Date('2024-03-05T23:30:00Z'))).toBe('2024-03-05');
  });
});

describe('scripts/lib/content-file: extPair', () => {
  test('useMd=true creates .md and checks .mdx as the alternate', () => {
    expect(extPair(true)).toEqual({ ext: '.md', altExt: '.mdx' });
  });

  test('useMd=false creates .mdx and checks .md as the alternate', () => {
    expect(extPair(false)).toEqual({ ext: '.mdx', altExt: '.md' });
  });
});

describe('scripts/lib/content-file: ensureDir', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-content-file-'));

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('creates nested directories and is idempotent', () => {
    const nested = path.join(tempRoot, 'a', 'b', 'c');
    ensureDir(nested);
    expect(fs.existsSync(nested)).toBe(true);
    // Second call on an existing directory must not throw.
    ensureDir(nested);
    expect(fs.existsSync(nested)).toBe(true);
  });
});

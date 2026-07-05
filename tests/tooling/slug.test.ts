import { describe, test, expect } from 'bun:test';
import GithubSlugger from 'github-slugger';
import {
  slugifyAscii,
  slugifyCjk,
  slugifyCjkOrUntitled,
  slugifyGithub,
} from '../../scripts/lib/slug';

// The original inline implementations, copied verbatim from the scripts
// before extraction. Slugs become permanent URLs, so the shared helpers must
// reproduce these byte-for-byte. If a parity test below fails, the shared
// helper changed observable behavior — fix the helper, not the test.
const originalNewPost = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const originalNewNote = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '');
const originalImportBook = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/(^-|-$)+/g, '');
const originalImportObsidian = (t: string) => {
  const slug = t
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'untitled';
};

const SAMPLES = [
  '',
  'a',
  'Hello, World!',
  'Test Standard Post',
  'MiXeD CaSe 123',
  'A  B',
  '--Weird -- Title--',
  '...leading and trailing...',
  '!!!',
  '---',
  '中文标题',
  '我的笔记 Note',
  '2024-01-15 学习笔记',
  'テスト katakana',
  'é à ü accents',
  '#tag/sub_path',
  'one—dash–em',
  '  spaces  everywhere  ',
];

describe('scripts/lib/slug: slugifyAscii (new-post rules)', () => {
  test('lowercases and collapses punctuation/space runs to single dashes', () => {
    expect(slugifyAscii('Hello, World!')).toBe('hello-world');
    expect(slugifyAscii('MiXeD CaSe 123')).toBe('mixed-case-123');
  });

  test('trims leading/trailing dashes', () => {
    expect(slugifyAscii('--Weird -- Title--')).toBe('weird-title');
    expect(slugifyAscii('...leading and trailing...')).toBe('leading-and-trailing');
  });

  test('strips non-ASCII including CJK', () => {
    expect(slugifyAscii('你好 World')).toBe('world');
    expect(slugifyAscii('中文标题')).toBe('');
  });

  test('returns empty string when nothing survives (no fallback)', () => {
    expect(slugifyAscii('!!!')).toBe('');
    expect(slugifyAscii('')).toBe('');
  });

  test('parity with the original new-post inline slug', () => {
    for (const s of SAMPLES) {
      expect(slugifyAscii(s)).toBe(originalNewPost(s));
    }
  });
});

describe('scripts/lib/slug: slugifyCjk (new-note / import-book rules)', () => {
  test('preserves CJK Unified Ideographs (U+4E00-U+9FFF)', () => {
    expect(slugifyCjk('我的笔记 Note')).toBe('我的笔记-note');
    expect(slugifyCjk('中文标题')).toBe('中文标题');
    // Range boundaries: U+4E00 and U+9FFF kept.
    expect(slugifyCjk('一')).toBe('一');
    expect(slugifyCjk('鿿')).toBe('鿿');
  });

  test('strips non-CJK non-ASCII (katakana, accents, Ext-A ideographs)', () => {
    expect(slugifyCjk('テスト katakana')).toBe('katakana');
    expect(slugifyCjk('é à ü')).toBe('');
    // U+3400 (CJK Ext A) is outside U+4E00-U+9FFF and must be stripped.
    expect(slugifyCjk('㐀abc')).toBe('abc');
  });

  test('returns empty string when nothing survives (no fallback)', () => {
    expect(slugifyCjk('!!!')).toBe('');
  });

  test('parity with the original new-note and import-book inline slugs', () => {
    // The two originals used different edge-dash trim regexes; both must
    // agree with the shared helper (they are equivalent post-collapse).
    for (const s of SAMPLES) {
      expect(slugifyCjk(s)).toBe(originalNewNote(s));
      expect(slugifyCjk(s)).toBe(originalImportBook(s));
    }
  });
});

describe('scripts/lib/slug: slugifyCjkOrUntitled (import-obsidian rules)', () => {
  test("falls back to 'untitled' when nothing survives", () => {
    expect(slugifyCjkOrUntitled('!!!')).toBe('untitled');
    expect(slugifyCjkOrUntitled('')).toBe('untitled');
  });

  test('otherwise identical to slugifyCjk', () => {
    expect(slugifyCjkOrUntitled('My Important Note')).toBe('my-important-note');
    expect(slugifyCjkOrUntitled('我的笔记 Note')).toBe('我的笔记-note');
  });

  test('parity with the original import-obsidian slugify', () => {
    for (const s of SAMPLES) {
      expect(slugifyCjkOrUntitled(s)).toBe(originalImportObsidian(s));
    }
  });
});

describe('scripts/lib/slug: slugifyGithub (new-series rules)', () => {
  test('produces github-slugger output', () => {
    expect(slugifyGithub('Hello World!')).toBe('hello-world');
    expect(slugifyGithub('My Séries: Part 1')).toBe('my-séries-part-1');
    expect(slugifyGithub('中文 系列')).toBe('中文-系列');
  });

  test('does NOT collapse dash runs (unlike the regex variants)', () => {
    expect(slugifyGithub('  --Weird--  ')).toBe('----weird----');
  });

  test('uses a fresh slugger per call: no dedup suffix across calls', () => {
    // new-series slugs exactly one title per invocation, so repeated
    // identical inputs must return the same slug — not 'dup-1'.
    expect(slugifyGithub('Dup')).toBe('dup');
    expect(slugifyGithub('Dup')).toBe('dup');

    // Contrast: a shared GithubSlugger instance does dedup. This documents
    // why slugifyGithub deliberately creates a new instance each call.
    const shared = new GithubSlugger();
    expect(shared.slug('Dup')).toBe('dup');
    expect(shared.slug('Dup')).toBe('dup-1');
  });

  test('parity with the original new-series implementation', () => {
    for (const s of SAMPLES) {
      expect(slugifyGithub(s)).toBe(new GithubSlugger().slug(s));
    }
  });
});

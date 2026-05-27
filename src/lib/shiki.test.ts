import { describe, expect, mock, spyOn, test } from 'bun:test';
import {
  getLanguageDisplayName,
  highlightToHast,
  parseFenceMeta,
  resetUnknownLangWarningsForTests,
} from './shiki';

describe('parseFenceMeta', () => {
  test('returns empty object for empty input', () => {
    expect(parseFenceMeta(undefined)).toEqual({});
    expect(parseFenceMeta(null)).toEqual({});
    expect(parseFenceMeta('')).toEqual({});
  });

  test('extracts title from title="..."', () => {
    expect(parseFenceMeta('title="src/app.ts"').title).toBe('src/app.ts');
  });

  test('flags linenos', () => {
    expect(parseFenceMeta('linenos').showLineNumbers).toBe(true);
  });

  test('expands {1,3-5} highlight ranges', () => {
    expect(parseFenceMeta('{1,3-5}').highlightLines).toEqual([1, 3, 4, 5]);
  });

  test('extracts [label] at the start as tabLabel', () => {
    expect(parseFenceMeta('[npm]').tabLabel).toBe('npm');
    expect(parseFenceMeta(' [yarn] ').tabLabel).toBe('yarn');
  });

  test('does not confuse [label] with the {1,3-5} highlight syntax', () => {
    // Square brackets and curly braces are distinct — different meta features.
    const result = parseFenceMeta('[npm] {1,3-5}');
    expect(result.tabLabel).toBe('npm');
    expect(result.highlightLines).toEqual([1, 3, 4, 5]);
  });

  test('combines all meta fields in one fence', () => {
    const result = parseFenceMeta('[npm] title="install.sh" linenos {1,3-5}');
    expect(result.tabLabel).toBe('npm');
    expect(result.title).toBe('install.sh');
    expect(result.showLineNumbers).toBe(true);
    expect(result.highlightLines).toEqual([1, 3, 4, 5]);
  });

  test('ignores [label] that is not at the start of the meta', () => {
    // The convention is [label] FIRST. A bracket-token deeper into the meta is
    // not interpreted as a label — keeps the grammar unambiguous.
    expect(parseFenceMeta('linenos [late]').tabLabel).toBeUndefined();
  });

  test('whitespace-only [   ] does not leak an empty-string label', () => {
    // `[   ]` would otherwise produce an empty string, which bypasses downstream
    // `?? language` fallbacks (empty string isn't nullish). Result: blank tabs.
    expect(parseFenceMeta('[   ]').tabLabel).toBeUndefined();
    expect(parseFenceMeta('[]').tabLabel).toBeUndefined();
  });
});

describe('getLanguageDisplayName', () => {
  test('returns the proper-case brand form for a canonical language', () => {
    expect(getLanguageDisplayName('typescript')).toBe('TypeScript');
    expect(getLanguageDisplayName('python')).toBe('Python');
    expect(getLanguageDisplayName('ocaml')).toBe('OCaml');
  });

  test('resolves aliases to the canonical display name', () => {
    expect(getLanguageDisplayName('ts')).toBe('TypeScript');
    expect(getLanguageDisplayName('js')).toBe('JavaScript');
    expect(getLanguageDisplayName('py')).toBe('Python');
  });

  test('handles alias tokens with special characters', () => {
    // `c++` is a Shiki alias that resolves to `cpp` → `C++` display.
    expect(getLanguageDisplayName('c++')).toBe('C++');
  });

  test('falls back to the raw input for unrecognized languages', () => {
    // Defensive — highlightToHast throws on unknown langs, so this branch is
    // only reachable for callers that opt to render a label without highlighting.
    expect(getLanguageDisplayName('totally-fake')).toBe('totally-fake');
  });

  test('handles plaintext aliases', () => {
    expect(getLanguageDisplayName('plaintext')).toBe('Plain text');
    expect(getLanguageDisplayName('text')).toBe('Plain text');
    expect(getLanguageDisplayName('txt')).toBe('Plain text');
  });

  test('resolves previously-unregistered Shiki langs (regression: production build)', () => {
    // Before the lazy-load refactor, `make` was rejected at build time because it
    // wasn't in a hand-maintained SHIKI_LANGS list. Now resolved via Shiki's bundle.
    expect(getLanguageDisplayName('make')).toBe('Makefile');
    expect(getLanguageDisplayName('makefile')).toBe('Makefile');
    expect(getLanguageDisplayName('dockerfile')).toBe('Dockerfile');
    expect(getLanguageDisplayName('toml')).toBe('TOML');
    expect(getLanguageDisplayName('kotlin')).toBe('Kotlin');
  });

  test('resolves community aliases Shiki does not ship natively (regression: golang)', () => {
    // Shiki's bundledLanguagesInfo for `go` does not list `golang` as an alias,
    // and similarly for several other community-written names. The
    // COMMUNITY_ALIASES overlay in shiki.ts adds them.
    expect(getLanguageDisplayName('golang')).toBe('Go');
    expect(getLanguageDisplayName('node')).toBe('JavaScript');
    expect(getLanguageDisplayName('nodejs')).toBe('JavaScript');
    expect(getLanguageDisplayName('obj-c')).toBe('Objective-C');
    expect(getLanguageDisplayName('gnumakefile')).toBe('Makefile');
    expect(getLanguageDisplayName('bsdmakefile')).toBe('Makefile');
  });
});

describe('highlightToHast strict-build behavior', () => {
  test('lazy-loads any language in Shiki bundle (previously-unregistered: make)', async () => {
    // Regression: the production build broke when a real post used ```make. Strict-build
    // is supposed to fail typos, not legitimate bundled languages — this test locks in
    // that any bundled lang works without prior registration.
    const hast = await highlightToHast('all:\n\t@echo hi\n', 'make');
    expect(hast.type).toBe('root');
    // The highlighted output should contain at least one element.
    expect(hast.children.length).toBeGreaterThan(0);
  });

  test('renders unknown languages as plaintext + emits a deduped warn', async () => {
    // Warn-and-degrade: a typo'd or otherwise unknown fence language renders as
    // plaintext (so the production build never fails on a single fence) and emits
    // a one-line console.warn that authors running a clean local build can spot.
    // The warning dedupes per-process so noisy content doesn't spam the log.
    resetUnknownLangWarningsForTests();
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const hast1 = await highlightToHast('x = 1', 'totally-not-a-real-lang');
      const hast2 = await highlightToHast('y = 2', 'totally-not-a-real-lang');
      expect(hast1.type).toBe('root');
      expect(hast2.type).toBe('root');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/\[shiki\] Unknown code-block language "totally-not-a-real-lang"/);
    } finally {
      warn.mockRestore();
      mock.restore();
      // Reset on the way out too so subsequent tests / re-runs don't inherit
      // the dedup state populated by this test.
      resetUnknownLangWarningsForTests();
    }
  });

  test('empty fence language renders as plaintext without throwing', async () => {
    const hast = await highlightToHast('plain content', '');
    expect(hast.type).toBe('root');
  });
});

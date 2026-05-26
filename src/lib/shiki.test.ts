import { describe, expect, test } from 'bun:test';
import { getLanguageDisplayName, parseFenceMeta } from './shiki';

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
    // `c++` is a LANG_ALIASES key that resolves to `cpp` → `C++` display.
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
});

import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { renderAsync } from '@/test-utils/render';

describe('Integration: Shiki Notation Comments', () => {
  test('// [!code focus] dims non-focused lines via .has-focused on <pre> and .focused on the line', async () => {
    const content = [
      '```ts',
      'const a = 1',
      'const b = 2 // [!code focus]',
      'const c = 3',
      '```',
    ].join('\n');

    const html = await renderAsync(MarkdownRenderer({ content }));

    expect(html).toContain('has-focused');
    expect(html).toMatch(/class="line focused"/);
  });

  test('// [!code error] and // [!code warning] add .line.error / .line.warning classes', async () => {
    const content = [
      '```ts',
      'failHere() // [!code error]',
      'warnHere() // [!code warning]',
      'okHere()',
      '```',
    ].join('\n');

    const html = await renderAsync(MarkdownRenderer({ content }));

    // transformerNotationErrorLevel adds `highlighted` plus the error/warning class.
    expect(html).toMatch(/class="line[^"]*\berror\b/);
    expect(html).toMatch(/class="line[^"]*\bwarning\b/);
  });

  test('// [!code highlight] adds .line.highlighted (same class as {1,3-5} fence meta)', async () => {
    const content = ['```ts', 'pickMe() // [!code highlight]', 'ignoreMe()', '```'].join('\n');
    const html = await renderAsync(MarkdownRenderer({ content }));

    expect(html).toMatch(/class="line[^"]*\bhighlighted\b/);
  });

  test('// [!code ++] / [!code --] add .diff.add / .diff.remove (same classes as raw diff fences)', async () => {
    const content = [
      '```ts',
      'const old = 1 // [!code --]',
      'const next = 2 // [!code ++]',
      '```',
    ].join('\n');

    const html = await renderAsync(MarkdownRenderer({ content }));

    expect(html).toContain('diff add');
    expect(html).toContain('diff remove');
  });

  test('notation diff and raw diff (in a ```diff fence) coexist without conflict', async () => {
    // Two blocks in the same render. The raw-diff transformer fires for the
    // ```diff fence's +/- lines; the notation transformer fires for the
    // [!code ++/--] comments in the ts fence. Same class names; no clash.
    const content = [
      '```diff',
      '-old line',
      '+new line',
      '```',
      '',
      '```ts',
      'const x = 1 // [!code --]',
      'const y = 2 // [!code ++]',
      '```',
    ].join('\n');

    const html = await renderAsync(MarkdownRenderer({ content }));

    // Two blocks × one add + one remove each = at least 2 of each.
    const addCount = (html.match(/diff add/g) || []).length;
    const removeCount = (html.match(/diff remove/g) || []).length;
    expect(addCount).toBeGreaterThanOrEqual(2);
    expect(removeCount).toBeGreaterThanOrEqual(2);
  });

  test('Python `# [!code focus]` style comment works for non-C languages', async () => {
    const content = [
      '```python',
      'def fib(n):',
      '    if n < 2: return n  # [!code focus]',
      '    return fib(n-1) + fib(n-2)',
      '```',
    ].join('\n');

    const html = await renderAsync(MarkdownRenderer({ content }));

    expect(html).toContain('has-focused');
    expect(html).toMatch(/class="line focused"/);
  });
});

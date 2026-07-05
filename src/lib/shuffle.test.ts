import { describe, expect, test } from 'bun:test';
import { shuffle, shuffleSeeded } from './shuffle';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Assert `actual` contains exactly the same elements as `expected` (any order). */
function expectPermutationOf<T>(actual: T[], expected: T[]): void {
  expect(actual).toHaveLength(expected.length);
  expect([...actual].sort()).toEqual([...expected].sort());
}

describe('shuffle', () => {
  test('returns a permutation of the input', () => {
    const input = range(10);
    expectPermutationOf(shuffle(input), input);
  });

  test('does not mutate the original array', () => {
    const input = range(10);
    const snapshot = [...input];
    shuffle(input);
    expect(input).toEqual(snapshot);
  });

  test('returns a new array, not the input reference', () => {
    const input = range(5);
    expect(shuffle(input)).not.toBe(input);
  });

  test('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['only'])).toEqual(['only']);
  });

  test('actually shuffles (produces more than one order across many runs)', () => {
    const input = range(6);
    const orders = new Set<string>();
    for (let i = 0; i < 50; i++) {
      orders.add(JSON.stringify(shuffle(input)));
    }
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('shuffleSeeded', () => {
  test('is deterministic: same seed gives the same order', () => {
    const input = range(12);
    expect(shuffleSeeded(input, 42)).toEqual(shuffleSeeded(input, 42));
    expect(shuffleSeeded(input, 20609)).toEqual(shuffleSeeded(input, 20609));
  });

  test('returns a permutation of the input', () => {
    const input = range(12);
    expectPermutationOf(shuffleSeeded(input, 7), input);
  });

  test('does not mutate the original array', () => {
    const input = range(12);
    const snapshot = [...input];
    shuffleSeeded(input, 7);
    expect(input).toEqual(snapshot);
  });

  test('small consecutive seeds are decorrelated (regression: splitmix32 finalizer)', () => {
    // Before the splitmix32 finalizer, raw xorshift32 gave near-identical
    // permutations for small consecutive seeds like 1, 2, 3.
    const input = range(8);
    const orders = [1, 2, 3].map((seed) => JSON.stringify(shuffleSeeded(input, seed)));
    expect(new Set(orders).size).toBe(3);
  });

  test('consecutive day-index seeds rotate short arrays (regression: daily rotation)', () => {
    // Day indices like 20608/20609/20610 must not collapse onto the same
    // permutation for short arrays, or "daily rotation" becomes invisible.
    const input = range(5);
    const orders = [20608, 20609, 20610].map((seed) =>
      JSON.stringify(shuffleSeeded(input, seed))
    );
    expect(new Set(orders).size).toBe(3);
  });

  test('seed 0 does not crash, lock into identity, or degenerate', () => {
    const input = range(8);
    const result = shuffleSeeded(input, 0);
    expectPermutationOf(result, input);
    // The PRNG must not be stuck at zero state (which would leave the array untouched)
    expect(result).not.toEqual(input);
  });

  test('seed 0 is guarded by mapping onto seed 1', () => {
    const input = range(8);
    expect(shuffleSeeded(input, 0)).toEqual(shuffleSeeded(input, 1));
  });

  test('negative and large seeds produce valid permutations', () => {
    const input = range(8);
    expectPermutationOf(shuffleSeeded(input, -12345), input);
    expectPermutationOf(shuffleSeeded(input, 2 ** 31), input);
    expectPermutationOf(shuffleSeeded(input, Number.MAX_SAFE_INTEGER), input);
  });

  test('handles empty and single-element arrays', () => {
    expect(shuffleSeeded([], 1)).toEqual([]);
    expect(shuffleSeeded(['only'], 1)).toEqual(['only']);
  });

  test('preserves object identity of elements', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    const result = shuffleSeeded([a, b, c], 9);
    expect(result).toHaveLength(3);
    expect(result).toContain(a);
    expect(result).toContain(b);
    expect(result).toContain(c);
  });
});

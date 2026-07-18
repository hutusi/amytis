import { describe, test, expect } from 'bun:test';
import { shuffleSeeded, seedFromKeys } from '@/lib/shuffle';

describe('shuffleSeeded', () => {
  const items = Array.from({ length: 12 }, (_, i) => i);

  test('is deterministic for a given seed (server/client render agree)', () => {
    expect(shuffleSeeded(items, 42)).toEqual(shuffleSeeded(items, 42));
  });

  test('does not mutate the input', () => {
    const copy = [...items];
    shuffleSeeded(items, 7);
    expect(items).toEqual(copy);
  });

  test('is a permutation (same multiset, reordered for most seeds)', () => {
    const out = shuffleSeeded(items, 12345);
    expect([...out].sort((a, b) => a - b)).toEqual(items);
    expect(out).not.toEqual(items); // vanishingly unlikely to be identity
  });

  test('different seeds generally yield different orders', () => {
    expect(shuffleSeeded(items, 1)).not.toEqual(shuffleSeeded(items, 2));
  });
});

describe('seedFromKeys', () => {
  test('is stable for the same keys and order', () => {
    expect(seedFromKeys(['a', 'b', 'c'])).toBe(seedFromKeys(['a', 'b', 'c']));
  });

  test('reacts to content and order changes', () => {
    expect(seedFromKeys(['a', 'b'])).not.toBe(seedFromKeys(['b', 'a']));
    expect(seedFromKeys(['a', 'b'])).not.toBe(seedFromKeys(['a', 'c']));
  });

  test('feeding the seed into shuffleSeeded is fully deterministic', () => {
    const keys = ['post-1', 'post-2', 'post-3', 'post-4'];
    const order1 = shuffleSeeded(keys, seedFromKeys(keys));
    const order2 = shuffleSeeded(keys, seedFromKeys(keys));
    expect(order1).toEqual(order2);
  });
});

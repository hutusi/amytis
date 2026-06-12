import { afterEach, describe, expect, test } from 'bun:test';
import { createKeyedMemo, createMemo, createProdMemo, getCacheEnvKey } from './cache';

const env = process.env as Record<string, string | undefined>;
const previousNodeEnv = env.NODE_ENV;

afterEach(() => {
  env.NODE_ENV = previousNodeEnv;
});

describe('content/cache', () => {
  test('getCacheEnvKey maps NODE_ENV to production/development', () => {
    env.NODE_ENV = 'production';
    expect(getCacheEnvKey()).toBe('production');
    env.NODE_ENV = 'test';
    expect(getCacheEnvKey()).toBe('development');
  });

  test('createMemo caches per env (dev included)', () => {
    const memo = createMemo<number>();
    let calls = 0;
    const compute = () => ++calls;

    env.NODE_ENV = 'test';
    expect(memo.get(compute)).toBe(1);
    expect(memo.get(compute)).toBe(1); // cached in dev

    env.NODE_ENV = 'production';
    expect(memo.get(compute)).toBe(2); // separate env slot
    expect(memo.get(compute)).toBe(2);
  });

  test('createKeyedMemo caches per key per env', () => {
    const memo = createKeyedMemo<string, number>();
    let calls = 0;

    expect(memo.get('a', () => ++calls)).toBe(1);
    expect(memo.get('a', () => ++calls)).toBe(1);
    expect(memo.get('b', () => ++calls)).toBe(2);
  });

  test('createProdMemo recomputes on every call outside production', () => {
    const memo = createProdMemo<number>();
    let calls = 0;
    const compute = () => ++calls;

    env.NODE_ENV = 'test';
    expect(memo.get(compute)).toBe(1);
    expect(memo.get(compute)).toBe(2); // dev: recompute (HMR content freshness)

    env.NODE_ENV = 'production';
    expect(memo.get(compute)).toBe(3);
    expect(memo.get(compute)).toBe(3); // prod: cached
  });
});

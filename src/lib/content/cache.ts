/**
 * Build-time memoization helpers for the content data layer.
 *
 * Static export means these caches only exist to avoid re-reading the
 * content tree within a single build / dev process — there is no
 * invalidation API. Two flavors exist and they are NOT interchangeable:
 *
 * - `createMemo` / `createKeyedMemo`: cache in dev AND prod, keyed by
 *   `getCacheEnvKey()` (the historical Map-per-env pattern).
 * - `createProdMemo`: caches in production only; dev recomputes on every
 *   call so HMR sees fresh content (the historical `_singleton` pattern).
 */

export function getCacheEnvKey(): string {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

/** Env-keyed single-value memo. Caches in dev too. */
export function createMemo<T>(): { get(compute: () => T): T } {
  const byEnv = new Map<string, T>();
  return {
    get(compute) {
      const key = getCacheEnvKey();
      if (byEnv.has(key)) return byEnv.get(key) as T;
      const value = compute();
      byEnv.set(key, value);
      return value;
    },
  };
}

/** Env-keyed, per-key memo (the `Map<env, Map<K, V>>` pattern). Caches in dev too. */
export function createKeyedMemo<K, V>(): { get(key: K, compute: () => V): V } {
  const byEnv = new Map<string, Map<K, V>>();
  return {
    get(key, compute) {
      const envKey = getCacheEnvKey();
      let byKey = byEnv.get(envKey);
      if (!byKey) {
        byKey = new Map();
        byEnv.set(envKey, byKey);
      }
      if (byKey.has(key)) return byKey.get(key) as V;
      const value = compute();
      byKey.set(key, value);
      return value;
    },
  };
}

/** Production-only memo: dev recomputes every call so HMR sees fresh content. */
export function createProdMemo<T>(): { get(compute: () => T): T } {
  let cached: T | undefined;
  let hasValue = false;
  return {
    get(compute) {
      if (process.env.NODE_ENV !== 'production') {
        return compute();
      }
      if (!hasValue) {
        cached = compute();
        hasValue = true;
      }
      return cached as T;
    },
  };
}

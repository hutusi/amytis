/**
 * Dynamic-route param decoding. Slugs may arrive percent-encoded, raw, or
 * in either Unicode normalization form depending on how the URL was typed
 * or linked — every dynamic route must tolerate all four. Never use bare
 * `decodeURIComponent` (it throws on malformed input).
 */

export function safeDecodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

/**
 * All lookup candidates for a raw route param, most-likely first:
 * decoded, raw, NFC, NFD — deduplicated, order preserved.
 */
export function paramVariants(raw: string): string[] {
  const decoded = safeDecodeParam(raw);
  return [...new Set([decoded, raw, decoded.normalize('NFC'), decoded.normalize('NFD')])];
}

/** Resolve a route param against a lookup, trying every variant in order. */
export function resolveFromParam<T>(raw: string, lookup: (candidate: string) => T | null): T | null {
  for (const candidate of paramVariants(raw)) {
    const result = lookup(candidate);
    if (result !== null && result !== undefined) return result;
  }
  return null;
}

/**
 * Dev-only: expand static params with percent-encoded variants of every
 * segment (all combinations), deduplicated against what's already present.
 * Works around Next dev static-param checks for Unicode slugs under
 * `output: "export"` — the dev server may receive encoded forms of any
 * segment. Production export keeps raw segment values only.
 */
export function withDevEncodedVariants<T extends Record<string, string>>(params: T[]): T[] {
  if (process.env.NODE_ENV === 'production') return params;
  const keyOf = (param: Record<string, string>) =>
    Object.keys(param)
      .sort()
      .map((k) => `${k}=${param[k]}`)
      .join('&');
  const out = [...params];
  const seen = new Set(out.map(keyOf));
  for (const param of params) {
    const keys = Object.keys(param);
    for (let mask = 1; mask < 1 << keys.length; mask++) {
      const variant: Record<string, string> = { ...param };
      keys.forEach((k, i) => {
        if (mask & (1 << i)) variant[k] = encodeURIComponent(param[k]);
      });
      const key = keyOf(variant);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(variant as T);
      }
    }
  }
  return out;
}

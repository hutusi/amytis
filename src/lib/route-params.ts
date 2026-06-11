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

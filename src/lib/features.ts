import { siteConfig } from '../../site.config';

/**
 * Feature gating. Encodes the default-on convention exactly once:
 * a feature is enabled unless its config block says `enabled: false`.
 * Use this instead of reading `siteConfig.features` in routes/components —
 * scattered `?.enabled !== false` checks drift into inconsistent idioms.
 */

export type FeatureKey = keyof typeof siteConfig.features;

type FeatureFlags = Partial<Record<FeatureKey, { enabled?: boolean } | undefined>> | undefined;

/** Testable core: default-on unless explicitly disabled. */
export function isEnabledIn(features: FeatureFlags, key: FeatureKey): boolean {
  return features?.[key]?.enabled !== false;
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return isEnabledIn(siteConfig.features, key);
}

import { siteConfig } from '../../site.config';
import type { NavItem } from '../../site.config';
import { isFeatureEnabled } from '@/lib/features';

type FeatureKey = keyof typeof siteConfig.features;

// Gating: nav URLs hidden when their feature is disabled.
const FEATURE_URLS: Partial<Record<string, FeatureKey>> = {
  '/posts': 'posts',
  '/flows': 'flow',
  '/notes': 'flow',
  '/graph': 'flow',
  '/series': 'series',
  '/books': 'books',
};

// Labels: only a feature's PRIMARY url takes the configurable feature name.
// /notes and /graph are flow-gated but keep their own translated labels —
// mapping them here would label all three nav entries "Flow".
const FEATURE_LABEL_URLS: Partial<Record<string, FeatureKey>> = {
  '/posts': 'posts',
  '/flows': 'flow',
  '/series': 'series',
  '/books': 'books',
};

export function featureLabelKey(url: string): FeatureKey | undefined {
  return FEATURE_LABEL_URLS[url];
}

export function isNavUrlEnabled(url: string): boolean {
  const key = FEATURE_URLS[url];
  return !key || isFeatureEnabled(key);
}

/**
 * Feature-gate top-level nav items AND dropdown children, drop a
 * children-only item (url: "") whose children were all filtered out,
 * and sort by weight. The `isEnabled` predicate is injectable for tests.
 */
export function visibleNavItems(
  items: NavItem[],
  isEnabled: (url: string) => boolean = isNavUrlEnabled,
): NavItem[] {
  return items
    .filter(item => !item.url || isEnabled(item.url))
    .map(item => (item.children
      ? { ...item, children: item.children.filter(c => isEnabled(c.url)) }
      : item))
    .filter(item => !(item.children && item.children.length === 0 && !item.url))
    .sort((a, b) => a.weight - b.weight);
}

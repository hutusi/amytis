import { describe, test, expect } from 'bun:test';
import { featureLabelKey, visibleNavItems } from '../../src/lib/nav';
import type { NavItem } from '../../site.config';

const NAV: NavItem[] = [
  { name: 'Posts', url: '/posts', weight: 2 },
  { name: 'Flow', url: '/flows', weight: 1 },
  { name: 'About', url: '/about', weight: 3 },
  { name: 'More', url: '', weight: 4, children: [
    { name: 'Notes', url: '/notes' },
    { name: 'Graph', url: '/graph' },
    { name: 'Archive', url: '/archive', dividerBefore: true },
  ]},
];

const allEnabled = () => true;
const flowDisabled = (url: string) => !['/flows', '/notes', '/graph'].includes(url);

describe('visibleNavItems', () => {
  test('sorts by weight and keeps everything when all features are enabled', () => {
    const items = visibleNavItems(NAV, allEnabled);
    expect(items.map(i => i.name)).toEqual(['Flow', 'Posts', 'About', 'More']);
    expect(items[3].children?.map(c => c.name)).toEqual(['Notes', 'Graph', 'Archive']);
  });

  test('filters flow-gated top-level items AND dropdown children', () => {
    const items = visibleNavItems(NAV, flowDisabled);
    expect(items.map(i => i.name)).toEqual(['Posts', 'About', 'More']);
    expect(items[2].children?.map(c => c.name)).toEqual(['Archive']);
  });

  test('drops a children-only item whose children were all filtered out', () => {
    const nav: NavItem[] = [
      { name: 'Posts', url: '/posts', weight: 1 },
      { name: 'More', url: '', weight: 2, children: [
        { name: 'Notes', url: '/notes' },
        { name: 'Graph', url: '/graph' },
      ]},
    ];
    const items = visibleNavItems(nav, flowDisabled);
    expect(items.map(i => i.name)).toEqual(['Posts']);
  });

  test('does not mutate the input nav array', () => {
    const before = JSON.stringify(NAV);
    visibleNavItems(NAV, flowDisabled);
    expect(JSON.stringify(NAV)).toBe(before);
  });
});

describe('featureLabelKey', () => {
  test('primary feature urls take the configurable feature name', () => {
    expect(featureLabelKey('/flows')).toBe('flow');
    expect(featureLabelKey('/posts')).toBe('posts');
  });

  test('/notes and /graph are flow-GATED but keep their own labels', () => {
    expect(featureLabelKey('/notes')).toBeUndefined();
    expect(featureLabelKey('/graph')).toBeUndefined();
  });
});

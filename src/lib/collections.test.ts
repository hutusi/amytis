import { describe, expect, test } from 'bun:test';
import { resolveActiveCollection } from './collections';

const contexts = [
  { slug: 'reading-list', title: 'Reading list', posts: [] },
  { slug: 'favorites', title: 'Favorites', posts: [] },
];

describe('resolveActiveCollection', () => {
  test('selects the collection named by the param', () => {
    expect(resolveActiveCollection(contexts, 'favorites')?.title).toBe('Favorites');
  });

  test('falls back to the series context without a param or for an unknown one', () => {
    expect(resolveActiveCollection(contexts, null)).toBeNull();
    expect(resolveActiveCollection(contexts, '')).toBeNull();
    expect(resolveActiveCollection(contexts, 'not-a-member')).toBeNull();
    expect(resolveActiveCollection(undefined, 'favorites')).toBeNull();
  });
});

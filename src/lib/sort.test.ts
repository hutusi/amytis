import { describe, expect, test } from 'bun:test';
import { byDateAsc, byDateDesc } from './sort';

interface Dated {
  id: string;
  date: string;
}

const items: Dated[] = [
  { id: 'middle', date: '2025-06-15' },
  { id: 'newest', date: '2026-01-01' },
  { id: 'oldest', date: '2024-12-31' },
];

describe('byDateDesc', () => {
  test('sorts newest first', () => {
    const sorted = [...items].sort(byDateDesc);
    expect(sorted.map((i) => i.id)).toEqual(['newest', 'middle', 'oldest']);
  });

  test('returns 0 for equal dates', () => {
    expect(byDateDesc({ id: 'a', date: '2025-01-01' }, { id: 'b', date: '2025-01-01' })).toBe(0);
  });

  test('is antisymmetric', () => {
    const [a, b] = items;
    expect(byDateDesc(a, b)).toBe(-byDateDesc(b, a));
  });

  test('preserves insertion order for equal dates (stable sort)', () => {
    const equal: Dated[] = [
      { id: 'first', date: '2025-03-03' },
      { id: 'second', date: '2025-03-03' },
      { id: 'third', date: '2025-03-03' },
    ];
    const sorted = [...equal].sort(byDateDesc);
    expect(sorted.map((i) => i.id)).toEqual(['first', 'second', 'third']);
  });

  test('orders full ISO datetimes within the same day', () => {
    const sorted = [
      { id: 'morning', date: '2025-05-05T08:00:00Z' },
      { id: 'evening', date: '2025-05-05T20:00:00Z' },
    ].sort(byDateDesc);
    expect(sorted.map((i) => i.id)).toEqual(['evening', 'morning']);
  });

  test('empty date strings sort last (lexicographic comparison)', () => {
    const sorted = [
      { id: 'missing', date: '' },
      { id: 'dated', date: '2025-01-01' },
    ].sort(byDateDesc);
    expect(sorted.map((i) => i.id)).toEqual(['dated', 'missing']);
  });
});

describe('byDateAsc', () => {
  test('sorts oldest first', () => {
    const sorted = [...items].sort(byDateAsc);
    expect(sorted.map((i) => i.id)).toEqual(['oldest', 'middle', 'newest']);
  });

  test('returns 0 for equal dates', () => {
    expect(byDateAsc({ id: 'a', date: '2025-01-01' }, { id: 'b', date: '2025-01-01' })).toBe(0);
  });

  test('is antisymmetric', () => {
    const [a, b] = items;
    expect(byDateAsc(a, b)).toBe(-byDateAsc(b, a));
  });

  test('is the reverse of byDateDesc for distinct dates', () => {
    const desc = [...items].sort(byDateDesc).map((i) => i.id);
    const asc = [...items].sort(byDateAsc).map((i) => i.id);
    expect(asc).toEqual([...desc].reverse());
  });

  test('preserves insertion order for equal dates (stable sort)', () => {
    const equal: Dated[] = [
      { id: 'first', date: '2025-03-03' },
      { id: 'second', date: '2025-03-03' },
    ];
    const sorted = [...equal].sort(byDateAsc);
    expect(sorted.map((i) => i.id)).toEqual(['first', 'second']);
  });
});

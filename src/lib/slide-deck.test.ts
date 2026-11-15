import { describe, expect, test } from 'bun:test';
import { autoDeckBase, isValidDeckId, parseSlideHash, slideId, slideIndexFromScroll } from './slide-deck';

describe('deck ids', () => {
  test('automatic stems never look like another deck\'s slide id', () => {
    expect([0, 1, 2].map(autoDeckBase)).toEqual(['slides', 'slides2', 'slides3']);
    expect(slideId('slides', 2)).toBe('slides-2');
    expect(slideId(autoDeckBase(1), 1)).toBe('slides2-1');
  });

  test.each([
    ['talk', true],
    ['xconf_2026-keynote', true],
    ['2026-talk', false],
    ['-talk', false],
    ['my talk', false],
    ['', false],
  ])('isValidDeckId(%p) is %p', (id, valid) => {
    expect(isValidDeckId(id)).toBe(valid);
  });
});

describe('parseSlideHash', () => {
  test('maps a slide hash to its 0-based index', () => {
    expect(parseSlideHash('#slides-1', 'slides', 40)).toBe(0);
    expect(parseSlideHash('#slides-12', 'slides', 40)).toBe(11);
    expect(parseSlideHash('slides-40', 'slides', 40)).toBe(39);
  });

  test('ignores out-of-range and malformed slide numbers', () => {
    expect(parseSlideHash('#slides-41', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#slides-0', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#slides-01', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#slides-2x', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#slides-', 'slides', 40)).toBeNull();
  });

  test('ignores headings and other decks', () => {
    expect(parseSlideHash('#slides', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#introduction', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#slides2-3', 'slides', 40)).toBeNull();
    expect(parseSlideHash('#slides-2-3', 'slides', 40)).toBeNull();
  });

  test('matches prefixed stems and percent-encoded hashes', () => {
    expect(parseSlideHash('#f-2026-03-03-slides-4', 'f-2026-03-03-slides', 5)).toBe(3);
    expect(parseSlideHash('#talk%2D3', 'talk', 5)).toBe(2);
    expect(parseSlideHash('#%E0%A4%A', 'talk', 5)).toBeNull();
  });
});

describe('slideIndexFromScroll', () => {
  test('rounds to the nearest slide', () => {
    expect(slideIndexFromScroll(0, 800, 10)).toBe(0);
    expect(slideIndexFromScroll(390, 800, 10)).toBe(0);
    expect(slideIndexFromScroll(410, 800, 10)).toBe(1);
    expect(slideIndexFromScroll(1600, 800, 10)).toBe(2);
  });

  test('clamps to the deck', () => {
    expect(slideIndexFromScroll(-50, 800, 10)).toBe(0);
    expect(slideIndexFromScroll(99999, 800, 10)).toBe(9);
  });

  test('reports the first slide when the track has no width', () => {
    expect(slideIndexFromScroll(400, 0, 10)).toBe(0);
    expect(slideIndexFromScroll(400, Number.NaN, 10)).toBe(0);
    expect(slideIndexFromScroll(400, 800, 0)).toBe(0);
  });
});

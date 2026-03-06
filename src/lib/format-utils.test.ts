import { describe, expect, test } from 'bun:test';
import { padNumber } from './format-utils';

describe('padNumber', () => {
  test('pads single digit to width 2 by default', () => {
    expect(padNumber(1)).toBe('01');
    expect(padNumber(9)).toBe('09');
  });

  test('does not pad numbers already at default width', () => {
    expect(padNumber(10)).toBe('10');
    expect(padNumber(99)).toBe('99');
  });

  test('does not truncate numbers wider than the default width', () => {
    expect(padNumber(100)).toBe('100');
  });

  test('pads zero', () => {
    expect(padNumber(0)).toBe('00');
  });

  test('respects custom width', () => {
    expect(padNumber(5, 3)).toBe('005');
    expect(padNumber(42, 4)).toBe('0042');
  });
});

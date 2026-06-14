import { describe, expect, test } from 'bun:test';
import { cn } from './cn';

describe('cn', () => {
  test('joins plain class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  test('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  test('supports conditional object and array syntax', () => {
    expect(cn('base', { active: true, hidden: false }, ['x', 'y'])).toBe('base active x y');
  });

  test('last conflicting Tailwind utility wins (tailwind-merge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-muted', 'text-accent')).toBe('text-accent');
  });

  test('keeps non-conflicting utilities and respects variant prefixes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    // hover: and base utilities target different states — both survive
    expect(cn('text-muted', 'hover:text-accent')).toBe('text-muted hover:text-accent');
  });

  test('returns an empty string for no meaningful input', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

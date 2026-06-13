import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { dateField, draftField, tagsField } from './schema';

describe('content/schema', () => {
  test('dateField normalizes strings and Dates to YYYY-MM-DD', () => {
    const S = z.object({ date: dateField });
    expect(S.parse({ date: '2026-06-13' }).date).toBe('2026-06-13');
    expect(S.parse({ date: new Date('2026-06-13T12:00:00Z') }).date).toBe('2026-06-13');
  });

  test('dateField rejects an invalid date as a CAUGHT validation error (not a thrown RangeError)', () => {
    const S = z.object({ date: dateField });
    // Must not throw — safeParse returns { success: false } so the content
    // parsers can wrap it as "Invalid frontmatter in <file>".
    expect(() => S.safeParse({ date: '2026-99-99' })).not.toThrow();
    expect(S.safeParse({ date: '2026-99-99' }).success).toBe(false);
    expect(S.safeParse({ date: 'not-a-date' }).success).toBe(false);
  });

  test('draftField and tagsField apply their defaults', () => {
    const S = z.object({ draft: draftField, tags: tagsField });
    expect(S.parse({})).toEqual({ draft: false, tags: [] });
  });
});

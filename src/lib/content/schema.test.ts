import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { dateField, draftField, tagsField, invalidFrontmatterError, isDraftVisible } from './schema';

describe('content/schema', () => {
  test('dateField normalizes strings and Dates to YYYY-MM-DD', () => {
    const S = z.object({ date: dateField });
    expect(S.parse({ date: '2026-06-13' }).date).toBe('2026-06-13');
    expect(S.parse({ date: new Date('2026-06-13T12:00:00Z') }).date).toBe('2026-06-13');
  });

  test('dateField keeps the authored calendar day regardless of the build timezone', () => {
    const S = z.object({ date: dateField });
    const originalTz = process.env.TZ;
    // UTC+8: every local-time parse lands on the previous UTC day, which is
    // exactly the shift the calendar-prefix path must avoid.
    process.env.TZ = 'Asia/Shanghai';
    try {
      expect(S.parse({ date: '2024-01-05 07:00' }).date).toBe('2024-01-05');
      expect(S.parse({ date: '2024-01-05T07:00:00+08:00' }).date).toBe('2024-01-05');
      expect(S.parse({ date: '2024-01-05 07:00:00 +0800' }).date).toBe('2024-01-05');
      expect(S.parse({ date: '2024-1-5' }).date).toBe('2024-01-05');
      expect(S.parse({ date: ' 2024-01-05 ' }).date).toBe('2024-01-05');
      // Unquoted YAML timestamps arrive as UTC Date instants.
      expect(S.parse({ date: new Date('2024-01-05T00:00:00Z') }).date).toBe('2024-01-05');
    } finally {
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    }
  });

  test('dateField rejects calendar dates that do not exist or carry a malformed time', () => {
    const S = z.object({ date: dateField });
    expect(S.safeParse({ date: '2024-02-30' }).success).toBe(false);
    expect(S.safeParse({ date: '2023-02-29' }).success).toBe(false);
    expect(S.safeParse({ date: '2024-02-29' }).success).toBe(true);
    expect(S.safeParse({ date: '2024-01-05Tgarbage' }).success).toBe(false);
  });

  test('dateField rejects an invalid date as a CAUGHT validation error (not a thrown RangeError)', () => {
    const S = z.object({ date: dateField });
    // Must not throw — safeParse returns { success: false } so the content
    // parsers can wrap it as "Invalid frontmatter in <file>".
    expect(() => S.safeParse({ date: '2026-99-99' })).not.toThrow();
    expect(S.safeParse({ date: '2026-99-99' }).success).toBe(false);
    expect(S.safeParse({ date: 'not-a-date' }).success).toBe(false);
  });

  test('isDraftVisible hides drafts only in production builds', () => {
    expect(isDraftVisible({ draft: true }, 'production')).toBe(false);
    expect(isDraftVisible({ draft: true }, 'development')).toBe(true);
    expect(isDraftVisible({ draft: true }, 'test')).toBe(true);
    expect(isDraftVisible({ draft: false }, 'production')).toBe(true);
    expect(isDraftVisible({}, 'production')).toBe(true);
  });

  test('draftField and tagsField apply their defaults', () => {
    const S = z.object({ draft: draftField, tags: tagsField });
    expect(S.parse({})).toEqual({ draft: false, tags: [] });
  });

  test('invalidFrontmatterError embeds file path AND field details in the message', () => {
    const S = z.object({ title: z.string() });
    const parsed = S.safeParse({});
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('unreachable');

    const err = invalidFrontmatterError('note frontmatter', '/content/notes/x.md', parsed.error);
    // The details must live in the thrown message itself — CI logs that
    // capture only the exception would otherwise lose the offending fields.
    expect(err.message).toContain('[amytis] Invalid note frontmatter in /content/notes/x.md:');
    expect(err.message).toContain('title');
  });
});

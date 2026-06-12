import { describe, test, expect } from 'bun:test';
import { groupFlowsByMonth, toFlowIndexItems } from '../../src/lib/flow-stream';

const flow = (date: string) => ({ date, slug: date.replaceAll('-', '/') });

describe('toFlowIndexItems', () => {
  test('keeps only the light fields (drops content etc.)', () => {
    const items = toFlowIndexItems([
      { slug: '2026/03/07', date: '2026-03-07', title: 'T', excerpt: 'E', tags: ['a'], content: 'FULL BODY' },
    ]);
    expect(items).toEqual([
      { slug: '2026/03/07', date: '2026-03-07', title: 'T', excerpt: 'E', tags: ['a'] },
    ]);
  });
});

describe('groupFlowsByMonth', () => {
  test('empty input returns no groups', () => {
    expect(groupFlowsByMonth([])).toEqual([]);
  });

  test('single-month input produces one group preserving order', () => {
    const flows = [flow('2026-03-07'), flow('2026-03-03'), flow('2026-03-01')];
    const groups = groupFlowsByMonth(flows, 'en-US');
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('2026-03');
    expect(groups[0].flows.map(f => f.date)).toEqual(['2026-03-07', '2026-03-03', '2026-03-01']);
  });

  test('splits on month boundary, newest-first order preserved', () => {
    const flows = [flow('2026-03-07'), flow('2026-03-03'), flow('2026-02-25'), flow('2025-12-31')];
    const groups = groupFlowsByMonth(flows, 'en-US');
    expect(groups.map(g => g.key)).toEqual(['2026-03', '2026-02', '2025-12']);
    expect(groups[0].flows).toHaveLength(2);
    expect(groups[1].flows).toHaveLength(1);
    expect(groups[2].flows).toHaveLength(1);
  });

  test('en-US labels use long month name and year', () => {
    const groups = groupFlowsByMonth([flow('2026-03-07')], 'en-US');
    expect(groups[0].label).toBe('March 2026');
  });

  test('zh-CN labels use Chinese year/month form', () => {
    const groups = groupFlowsByMonth([flow('2026-03-07')], 'zh-CN');
    expect(groups[0].label).toBe('2026年3月');
  });

  test('en-US labelParts: month segment (with merged space) then year segment', () => {
    const groups = groupFlowsByMonth([flow('2026-03-07')], 'en-US');
    expect(groups[0].labelParts).toEqual([
      { text: 'March ', link: 'month' },
      { text: '2026', link: 'year' },
    ]);
  });

  test('zh-CN labelParts: year segment (with 年) then month segment (with 月)', () => {
    const groups = groupFlowsByMonth([flow('2026-03-07')], 'zh-CN');
    expect(groups[0].labelParts).toEqual([
      { text: '2026年', link: 'year' },
      { text: '3月', link: 'month' },
    ]);
  });

  test('labelParts texts join back to the full label', () => {
    for (const locale of ['en-US', 'zh-CN']) {
      const groups = groupFlowsByMonth([flow('2026-03-07')], locale);
      expect(groups[0].labelParts.map(s => s.text).join('')).toBe(groups[0].label);
    }
  });

  test('non-adjacent same months stay separate groups (order is trusted, not re-sorted)', () => {
    // Defensive: grouping is adjacency-based; callers pass sorted input.
    const flows = [flow('2026-03-07'), flow('2026-02-25'), flow('2026-03-01')];
    const groups = groupFlowsByMonth(flows, 'en-US');
    expect(groups.map(g => g.key)).toEqual(['2026-03', '2026-02', '2026-03']);
  });
});

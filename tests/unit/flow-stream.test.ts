import { describe, test, expect } from 'bun:test';
import { groupFlowsByMonth } from '../../src/lib/flow-stream';

const flow = (date: string) => ({ date, slug: date.replaceAll('-', '/') });

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

  test('non-adjacent same months stay separate groups (order is trusted, not re-sorted)', () => {
    // Defensive: grouping is adjacency-based; callers pass sorted input.
    const flows = [flow('2026-03-07'), flow('2026-02-25'), flow('2026-03-01')];
    const groups = groupFlowsByMonth(flows, 'en-US');
    expect(groups.map(g => g.key)).toEqual(['2026-03', '2026-02', '2026-03']);
  });
});

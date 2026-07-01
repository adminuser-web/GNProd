import { describe, it, expect } from 'vitest';
import { buildStatusTimeline, formatDuration, timeInCurrentStatus } from './orderTimeline';

const DAY = 86400000;
const HOUR = 3600000;

describe('formatDuration', () => {
  it('formats days, hours, minutes', () => {
    expect(formatDuration(2 * DAY + 4 * HOUR)).toBe('2d 4h');
    expect(formatDuration(3 * HOUR + 12 * 60000)).toBe('3h 12m');
    expect(formatDuration(8 * 60000)).toBe('8m');
    expect(formatDuration(10000)).toBe('just now');
    expect(formatDuration(-5)).toBe('just now');
  });
});

describe('buildStatusTimeline', () => {
  const now = Date.parse('2026-06-10T00:00:00Z');
  const order = {
    status: 'Processing',
    createdAt: '2026-06-01T00:00:00Z',
    timeline: [
      { status: 'Order Placed', timestamp: '2026-06-01T00:00:00Z', note: 'placed' },
      { status: 'Processing', timestamp: '2026-06-03T00:00:00Z', note: 'paid' },
    ],
  };

  it('computes duration per bucket, live for the current one', () => {
    const t = buildStatusTimeline(order, now);
    expect(t).toHaveLength(2);
    expect(t[0].status).toBe('Order Placed');
    expect(t[0].durationMs).toBe(2 * DAY);       // placed -> processing = 2 days
    expect(t[0].isCurrent).toBe(false);
    expect(t[1].status).toBe('Processing');
    expect(t[1].isCurrent).toBe(true);
    expect(t[1].end).toBeNull();
    expect(t[1].durationMs).toBe(7 * DAY);        // processing -> now = 7 days (live)
  });

  it('sorts out-of-order events', () => {
    const t = buildStatusTimeline({ ...order, timeline: [order.timeline[1], order.timeline[0]] }, now);
    expect(t.map((s) => s.status)).toEqual(['Order Placed', 'Processing']);
  });

  it('synthesizes a stage from createdAt when timeline is empty', () => {
    const t = buildStatusTimeline({ status: 'Order Placed', createdAt: '2026-06-08T00:00:00Z', timeline: [] }, now);
    expect(t).toHaveLength(1);
    expect(t[0].isCurrent).toBe(true);
    expect(t[0].durationMs).toBe(2 * DAY);
  });

  it('timeInCurrentStatus returns the current bucket duration', () => {
    expect(timeInCurrentStatus(order, now)).toBe(7 * DAY);
  });
});

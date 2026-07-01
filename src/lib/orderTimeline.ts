import { mapLegacyStatus, OrderStatus } from './orderStatus';

/** Normalise the many timestamp shapes (ISO string, epoch ms, Firestore-like). */
export function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v?.toDate === 'function') { const d = v.toDate(); return isNaN(d?.getTime?.()) ? null : d; }
  if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  return null;
}

/** Human, compact duration: "2d 4h", "3h 12m", "8m", "just now". */
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return 'just now';
  const days = Math.floor(totalMin / 1440);
  const hrs = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export interface TimelineStage {
  status: OrderStatus;
  start: Date;
  end: Date | null;      // null = still current
  durationMs: number;    // time spent in this status (live for the current one)
  note?: string;
  isCurrent: boolean;
}

/**
 * Build the per-status timeline for an order from its `timeline` events, each
 * annotated with how long the order spent (or has spent) in that status — the
 * "days in each bucket" view. Falls back to a single synthesized stage from
 * `createdAt` for orders with no recorded timeline.
 */
export function buildStatusTimeline(order: any, now: number = Date.now()): TimelineStage[] {
  const events = (((order?.timeline as any[]) || [])
    .map((e) => ({ status: mapLegacyStatus(e.status), start: toDate(e.timestamp), note: e.note as string | undefined }))
    .filter((e) => !!e.start) as Array<{ status: OrderStatus; start: Date; note?: string }>)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (events.length === 0) {
    const created = toDate(order?.createdAt) || new Date(now);
    events.push({ status: mapLegacyStatus(order?.status || 'Order Placed'), start: created, note: 'Order placed' });
  }

  return events.map((e, i) => {
    const end = i < events.length - 1 ? events[i + 1].start : null;
    const durationMs = (end ? end.getTime() : now) - e.start.getTime();
    return { status: e.status, start: e.start, end, durationMs, note: e.note, isCurrent: i === events.length - 1 };
  });
}

/** Time the order has spent in its current status (ms). */
export function timeInCurrentStatus(order: any, now: number = Date.now()): number {
  const t = buildStatusTimeline(order, now);
  return t.length ? t[t.length - 1].durationMs : 0;
}

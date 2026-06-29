import React, { useEffect, useState } from 'react';
import { ScrollText, RotateCcw, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { auditService, AuditAction } from '../../features/audit/services/auditService';
import { AuditLog } from '../../features/audit/types';
import { Skeleton } from '../Skeleton';

const ACTION_LABELS: Record<AuditAction, string> = {
  product_created: 'Product created',
  product_updated: 'Product updated',
  product_archived: 'Product archived',
  order_status_updated: 'Order status updated',
  payment_confirmed: 'Payment confirmed',
  support_status_updated: 'Support status updated',
  enquiry_status_updated: 'Enquiry status updated',
  settings_updated: 'Settings updated',
};

const ACTIONS = Object.keys(ACTION_LABELS) as AuditAction[];

function formatTimestamp(createdAt: any): string {
  if (typeof createdAt === 'string') return new Date(createdAt).toLocaleString();
  if (createdAt?.toDate) return createdAt.toDate().toLocaleString();
  if (createdAt?.seconds) return new Date(createdAt.seconds * 1000).toLocaleString();
  return 'Pending…';
}

export function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (reset: boolean) => {
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);
      const page = await auditService.getAuditLogs({
        action: actionFilter === 'all' ? undefined : actionFilter,
        cursor: reset ? null : cursor,
      });
      setLogs((prev) => (reset ? page.logs : [...prev, ...page.logs]));
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (e: any) {
      setError(e?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Reload from the top whenever the filter changes.
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <ScrollText className="w-5 h-5 text-[#c5a059]" />
        <h1 className="text-xl font-bold tracking-wide">Audit Log</h1>
      </div>
      <p className="text-xs text-muted mb-6">
        Immutable, append-only record of admin actions. Read-only.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-[10px] uppercase tracking-widest text-muted">Action</label>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
          className="bg-bg border border-[#c5a059]/30 text-sm px-3 py-2 focus:outline-none focus:border-[#c5a059]"
        >
          <option value="all">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
        <button
          onClick={() => load(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-[#c5a059] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 text-red-400 text-sm p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted text-sm py-16 border border-[#c5a059]/10">
          No audit entries{actionFilter !== 'all' ? ' for this action' : ''} yet.
        </div>
      ) : (
        <div className="border border-[#c5a059]/15 divide-y divide-[#c5a059]/10">
          {logs.map((log, idx) => (
            <div key={log.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'text-[10px] uppercase tracking-widest px-2 py-0.5 border',
                    'border-[#c5a059]/30 text-[#c5a059]'
                  )}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span className="text-xs text-muted truncate">
                    {log.entityType}/{log.entityId}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted sm:text-right shrink-0">
                <div className="text-content">{log.actorName || log.actorUserId}</div>
                <div>{formatTimestamp(log.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => load(false)}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest border border-[#c5a059]/30 px-5 py-2.5 hover:bg-[#c5a059]/10 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : <>Load more <ChevronRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>
      )}
    </div>
  );
}

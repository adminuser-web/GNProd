import React, { useEffect, useState } from 'react';
import { ScrollText, RotateCcw, ChevronRight } from 'lucide-react';
import { auditService, AuditAction } from '../../features/audit/services/auditService';
import { AuditLog } from '../../features/audit/types';
import { Skeleton } from '../Skeleton';
import { PageHeader, Card, EmptyState, StatusPill } from './ui';

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
    <div className="max-w-5xl mx-auto pb-16">
      <PageHeader
        eyebrow="System"
        title="Audit Log"
        description="Immutable, append-only record of admin actions. Read-only."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
              className="bg-bg border border-[#c5a059]/20 text-xs uppercase tracking-widest px-3 py-2 text-content focus:outline-none focus:border-[#c5a059]"
            >
              <option value="all">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
            <button
              onClick={() => load(true)}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted border border-[#c5a059]/20 px-3 py-2 rounded-sm hover:text-[#c5a059] hover:border-[#c5a059]/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="border border-red-500/30 bg-red-500/5 text-red-400 text-sm p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : logs.length === 0 ? (
        <Card bodyClassName="p-0">
          <EmptyState
            icon={ScrollText}
            title="No audit entries"
            description={actionFilter !== 'all' ? 'No actions of this type have been recorded yet.' : 'Admin actions will appear here as they happen.'}
          />
        </Card>
      ) : (
        <Card bodyClassName="p-0">
          <div className="divide-y divide-[#c5a059]/10">
            {logs.map((log, idx) => (
              <div key={log.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusPill label={ACTION_LABELS[log.action] || log.action} />
                    <span className="text-xs text-muted truncate font-mono">
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
        </Card>
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

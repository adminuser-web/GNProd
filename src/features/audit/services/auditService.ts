import { supabase } from '../../../lib/supabase';
import { AuditLog } from '../types';

export type AuditAction = AuditLog['action'];

export interface WriteAuditInput {
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  /** Override the actor; defaults to the currently signed-in user. */
  actorUserId?: string;
  actorName?: string;
}

export interface AuditQuery {
  action?: AuditAction;
  entityType?: string;
  pageSize?: number;
  /** Opaque offset cursor (rows already consumed). */
  cursor?: number | null;
}

export interface AuditPage {
  logs: AuditLog[];
  cursor: number | null;
  hasMore: boolean;
}

function rowToAudit(r: any): AuditLog {
  return {
    id: r.id,
    actorUserId: r.actor_user_id,
    actorName: r.actor_name ?? undefined,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    before: r.before ?? undefined,
    after: r.after ?? undefined,
    createdAt: r.created_at,
  };
}

export const auditService = {
  /**
   * Append an immutable audit entry. Best-effort: failures are logged but never
   * thrown, so audit logging can never break the primary admin mutation.
   */
  async writeAudit(input: WriteAuditInput): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('audit_logs').insert({
        actor_user_id: input.actorUserId ?? user?.id ?? null,
        actor_name:
          input.actorName ??
          (user?.user_metadata?.full_name as string) ??
          user?.email ??
          'Unknown',
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        before: input.before ?? null,
        after: input.after ?? null,
      });
      if (error) throw error;
    } catch (e) {
      console.error('auditService.writeAudit failed', e);
    }
  },

  /** Paginated, optionally filtered, newest-first. Read-only admin viewer. */
  async getAuditLogs({ action, entityType, pageSize = 25, cursor = 0 }: AuditQuery = {}): Promise<AuditPage> {
    const from = cursor ?? 0;
    // Fetch one extra row to detect whether another page exists.
    const to = from + pageSize;
    let q = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (action) q = q.eq('action', action);
    if (entityType) q = q.eq('entity_type', entityType);

    const { data, error } = await q;
    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

    return {
      logs: pageRows.map(rowToAudit),
      cursor: from + pageRows.length,
      hasMore,
    };
  },
};

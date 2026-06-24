import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  serverTimestamp,
  QueryConstraint,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { AuditLog } from '../types';

const COLLECTION = 'auditLogs';

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
  cursor?: QueryDocumentSnapshot | null;
}

export interface AuditPage {
  logs: AuditLog[];
  cursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const auditService = {
  /**
   * Append an immutable audit entry. Best-effort: failures are logged but never
   * thrown, so audit logging can never break the primary admin mutation.
   */
  async writeAudit(input: WriteAuditInput): Promise<void> {
    try {
      const user = auth.currentUser;
      const id = doc(collection(db, COLLECTION)).id;
      await setDoc(doc(db, COLLECTION, id), {
        id,
        actorUserId: input.actorUserId || user?.uid || 'system',
        actorName: input.actorName || user?.displayName || user?.email || 'Unknown',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before ?? null,
        after: input.after ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('auditService.writeAudit failed', e);
    }
  },

  /** Paginated, optionally filtered, newest-first. Read-only admin viewer. */
  async getAuditLogs({ action, entityType, pageSize = 25, cursor = null }: AuditQuery = {}): Promise<AuditPage> {
    const constraints: QueryConstraint[] = [];
    if (action) constraints.push(where('action', '==', action));
    if (entityType) constraints.push(where('entityType', '==', entityType));
    constraints.push(orderBy('createdAt', 'desc'));
    if (cursor) constraints.push(startAfter(cursor));
    // Fetch one extra to detect whether another page exists.
    constraints.push(limit(pageSize + 1));

    const snap = await getDocs(query(collection(db, COLLECTION), ...constraints));
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

    return {
      logs: pageDocs.map((d) => d.data() as AuditLog),
      cursor: pageDocs.length ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  },
};

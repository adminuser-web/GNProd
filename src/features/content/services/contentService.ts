import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../../../types';
import { auditService } from '../../audit/services/auditService';

export interface ContentRevision {
  id: string;
  area: keyof SiteContentMap;
  data: any;
  actorUserId: string;
  actorName: string;
  createdAt: any;
}

export const contentService = {
  async getArea<K extends keyof SiteContentMap>(area: K): Promise<SiteContentMap[K] | null> {
    const docRef = doc(db, 'content', area);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SiteContentMap[K];
    }
    return null;
  },

  async getAllAreas(): Promise<Partial<SiteContentMap>> {
    const querySnapshot = await getDocs(collection(db, 'content'));
    const content: Partial<SiteContentMap> = {};
    querySnapshot.forEach((doc) => {
      content[doc.id as keyof SiteContentMap] = doc.data() as any;
    });
    return content;
  },

  async updateArea<K extends keyof SiteContentMap>(area: K, data: Partial<SiteContentMap[K]>, opts?: { audit?: boolean }) {
    const docRef = doc(db, 'content', area);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Snapshot a revision of the saved state so changes can be rolled back later.
    // Best-effort: a snapshot failure must never break the primary save.
    try {
      const user = auth.currentUser;
      const revId = doc(collection(db, 'content', area as string, 'revisions')).id;
      await setDoc(doc(db, 'content', area as string, 'revisions', revId), {
        id: revId,
        area,
        data,
        actorUserId: user?.uid || 'system',
        actorName: user?.displayName || user?.email || 'Unknown',
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('contentService: revision snapshot failed', e);
    }

    // Audit every real admin save (skip programmatic ones via opts.audit === false).
    if (opts?.audit !== false) {
      await auditService.writeAudit({
        action: 'settings_updated',
        entityType: 'content',
        entityId: area as string,
        after: { fields: Object.keys(data || {}) },
      });
    }
  },

  /** Newest-first revision snapshots for a content area (for history + rollback). */
  async getRevisions(area: keyof SiteContentMap, max = 25): Promise<ContentRevision[]> {
    const q = query(
      collection(db, 'content', area as string, 'revisions'),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ContentRevision);
  },

  async seedContentIfMissing() {
    for (const [area, defaultData] of Object.entries(DEFAULT_SITE_CONTENT)) {
      const docRef = doc(db, 'content', area);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ...defaultData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  }
};

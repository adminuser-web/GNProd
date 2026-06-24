import { db } from '../../../lib/firebase';
import { collection, doc, addDoc, getDocs, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { SavedBuild } from '../types';

const COLLECTION = 'savedBuilds';

export const buildService = {
  async saveBuild(buildInfo: Omit<SavedBuild, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...buildInfo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getUserBuilds(userId: string): Promise<SavedBuild[]> {
    if (!userId) return [];
    
    // Sort logic might require an index, but since users won't have many builds, 
    // we can sort client side if Firebase complains, or just use orderBy if indexed.
    // Assuming simple query without orderBy to avoid needing a new index immediately
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as SavedBuild[];
  },

  async deleteBuild(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  }
};

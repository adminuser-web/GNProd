import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../../../types';

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

  async updateArea<K extends keyof SiteContentMap>(area: K, data: Partial<SiteContentMap[K]>) {
    const docRef = doc(db, 'content', area);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
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

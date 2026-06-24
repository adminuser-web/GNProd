import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const crmService = {
  async getCustomerNote(userId: string) {
    if (!userId) return '';
    try {
      const docRef = doc(db, 'customerNotes', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().note || '';
      }
      return '';
    } catch (err) {
      console.error('Error fetching customer note', err);
      return '';
    }
  },

  async updateCustomerNote(userId: string, note: string) {
    if (!userId) return;
    try {
      const docRef = doc(db, 'customerNotes', userId);
      await setDoc(docRef, {
        note,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Error updating customer note', err);
      throw err;
    }
  }
};

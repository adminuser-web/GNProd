import { db } from '../../../lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp, query, where, orderBy, getDocs, limit, writeBatch } from 'firebase/firestore';
import { Notification } from '../types';

export const notificationService = {
  async getNotifications(userId: string, roleTarget: 'customer' | 'admin' = 'customer', unreadOnly: boolean = false): Promise<Notification[]> {
    const qConstraints: any[] = [limit(50)];
    
    if (roleTarget === 'admin') {
      qConstraints.unshift(where('roleTarget', '==', 'admin'));
    } else {
      qConstraints.unshift(where('userId', '==', userId));
      qConstraints.unshift(where('roleTarget', '==', 'customer'));
    }

    if (unreadOnly) {
      qConstraints.unshift(where('read', '==', false));
    }

    const q = query(collection(db, 'notifications'), ...qConstraints);
    const snap = await getDocs(q);
    
    const docs = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
    
    return docs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  },

  async createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async markAsRead(id: string): Promise<void> {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  },

  async markAllAsRead(userId: string, roleTarget: 'customer' | 'admin' = 'customer'): Promise<void> {
    const unread = await this.getNotifications(userId, roleTarget, true);
    if (!unread.length) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      const docRef = doc(db, 'notifications', n.id);
      batch.update(docRef, { read: true });
    });
    await batch.commit();
  }
};

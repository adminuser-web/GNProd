import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Notification } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../services/notificationService';

export function useNotifications(roleTarget: 'customer' | 'admin' = 'customer') {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    if (roleTarget === 'admin' && !isAdmin) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
    }

    const qConstraints: any[] = [limit(50)];
    
    // For admin, query notifications meant for admin
    if (roleTarget === 'admin') {
      qConstraints.unshift(where('roleTarget', '==', 'admin'));
    } else {
      qConstraints.unshift(where('userId', '==', user.uid));
      qConstraints.unshift(where('roleTarget', '==', 'customer'));
    }

    const q = query(collection(db, 'notifications'), ...qConstraints);

    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs: Notification[] = [];
      let unread = 0;
      snap.forEach(doc => {
        const data = doc.data() as Notification;
        data.id = doc.id;
        notifs.push(data);
        if (!data.read) {
          unread++;
        }
      });
      // Sort in memory to avoid missing composite index
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setNotifications(notifs);
      setUnreadCount(unread);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to notifications:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, roleTarget]);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.uid, roleTarget);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, loading };
}

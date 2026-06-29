import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../services/notificationService';

export function useNotifications(roleTarget: 'customer' | 'admin' = 'customer') {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || (roleTarget === 'admin' && !isAdmin)) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const notifs = await notificationService.getNotifications(user.uid, roleTarget);
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, roleTarget, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    await load();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.uid, roleTarget);
    await load();
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, loading, refresh: load };
}

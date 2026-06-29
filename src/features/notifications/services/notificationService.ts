import { supabase } from '../../../lib/supabase';
import { Notification } from '../types';

function rowToNotif(r: any): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    roleTarget: r.role_target,
    type: r.type,
    title: r.title,
    message: r.message,
    link: r.link,
    read: r.read,
    createdAt: r.created_at,
  } as any;
}

// auth.users ids are uuids; coerce anything else (e.g. 'system') to null.
function asUuid(v: any): string | null {
  return typeof v === 'string' && v.length === 36 ? v : null;
}

export const notificationService = {
  async getNotifications(
    userId: string,
    roleTarget: 'customer' | 'admin' = 'customer',
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (roleTarget === 'admin') {
      q = q.eq('role_target', 'admin');
    } else {
      q = q.eq('role_target', 'customer').eq('user_id', userId);
    }
    if (unreadOnly) q = q.eq('read', false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(rowToNotif);
  },

  async createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<string> {
    const d: any = data;
    const { data: row, error } = await supabase
      .from('notifications')
      .insert({
        user_id: d.roleTarget === 'admin' ? null : asUuid(d.userId),
        role_target: d.roleTarget ?? 'customer',
        type: d.type,
        title: d.title,
        message: d.message,
        link: d.link,
        read: false,
      })
      .select('id')
      .single();
    if (error) throw error;
    return row!.id;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(userId: string, roleTarget: 'customer' | 'admin' = 'customer'): Promise<void> {
    let q = supabase.from('notifications').update({ read: true }).eq('read', false);
    if (roleTarget === 'admin') {
      q = q.eq('role_target', 'admin');
    } else {
      q = q.eq('role_target', 'customer').eq('user_id', userId);
    }
    const { error } = await q;
    if (error) throw error;
  },
};

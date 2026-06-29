import { uploadToStorage } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { SupportTicket, SupportTicketMessage, TicketAttachment } from '../../../types';
import { notificationService } from '../../notifications/services/notificationService';
import { auditService } from '../../audit/services/auditService';

// tickets rows: { id, user_id, status, data (full SupportTicket), notes[] }.
function rowToTicket(r: any): SupportTicket {
  return { ...(r.data as any), id: r.id, status: r.status } as SupportTicket;
}

async function fetchTicketRow(ticketId: string): Promise<any | null> {
  const { data, error } = await supabase.from('tickets').select('*').eq('id', ticketId).maybeSingle();
  if (error) throw error;
  return data;
}

export const ticketService = {
  async uploadAttachment(file: File, userId: string, ticketId: string): Promise<TicketAttachment> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `support/${userId}/${ticketId}/${Date.now()}_${safeName}`;
    const url = await uploadToStorage(path, file);
    return { name: file.name, url, contentType: file.type };
  },

  // "Subscriptions" — fetch-on-call (no-op unsubscribe).
  subscribeToAllTickets(callback: (tickets: SupportTicket[]) => void) {
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToAllTickets', error); return; }
        callback((data ?? []).map(rowToTicket));
      });
    return () => {};
  },

  subscribeToOpenTickets(callback: (tickets: SupportTicket[]) => void) {
    supabase.from('tickets').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(500)
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToOpenTickets', error); return; }
        callback((data ?? []).map(rowToTicket));
      });
    return () => {};
  },

  subscribeToUserTickets(userId: string, callback: (tickets: SupportTicket[]) => void) {
    supabase.from('tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToUserTickets', error); return; }
        callback((data ?? []).map(rowToTicket));
      });
    return () => {};
  },

  /** Map of orderId -> true for orders with a non-resolved ticket. */
  async getActiveOrderIds(): Promise<Record<string, boolean>> {
    const { data, error } = await supabase.from('tickets').select('data').neq('status', 'resolved');
    if (error) { console.error('getActiveOrderIds', error); return {}; }
    const map: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => {
      const oid = r.data?.orderId;
      if (oid) map[oid] = true;
    });
    return map;
  },

  async getTicketCountByOrder(orderId: string): Promise<number> {
    const { count, error } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('data->>orderId', orderId);
    if (error) { console.error('getTicketCountByOrder', error); return 0; }
    return count ?? 0;
  },

  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>) {
    const td: any = ticketData;
    const { data, error } = await supabase
      .from('tickets')
      .insert({ user_id: td.userId ?? null, status: td.status ?? 'open', data: ticketData })
      .select('id')
      .single();
    if (error) throw error;

    try {
      await notificationService.createNotification({
        userId: td.userId,
        roleTarget: 'admin',
        type: 'new_support_request',
        title: 'New Support Request',
        message: `${td.customerName} submitted a new support request regarding ${td.subject}.`,
        link: '/admin/support',
      } as any);
    } catch (e) {
      console.error('Error creating notification for support request', e);
    }

    return { id: data!.id };
  },

  async addAdminReply(ticketId: string, messages: SupportTicketMessage[]) {
    const row = await fetchTicketRow(ticketId);
    if (!row) throw new Error('Ticket not found');
    const newData = { ...(row.data as any), messages };
    const { error } = await supabase.from('tickets').update({ data: newData }).eq('id', ticketId);
    if (error) throw error;
    try {
      await notificationService.createNotification({
        userId: row.data?.userId,
        roleTarget: 'customer',
        type: 'support_reply',
        title: 'Support Update',
        message: `Admin has replied to your request: ${row.data?.subject}`,
        link: `/my-requests`,
      } as any);
    } catch (e) {
      console.error('Error creating notification for admin reply', e);
    }
  },

  async addCustomerReply(ticketId: string, messages: SupportTicketMessage[]) {
    const row = await fetchTicketRow(ticketId);
    if (!row) throw new Error('Ticket not found');
    const newData = { ...(row.data as any), messages };
    const { error } = await supabase.from('tickets').update({ data: newData }).eq('id', ticketId);
    if (error) throw error;
    try {
      await notificationService.createNotification({
        userId: row.data?.userId,
        roleTarget: 'admin',
        type: 'support_reply',
        title: 'Customer Reply',
        message: `${row.data?.customerName} has replied to request: ${row.data?.subject}`,
        link: '/admin/support',
      } as any);
    } catch (e) {
      console.error('Error creating notification for customer reply', e);
    }
  },

  async updateTicketStatus(ticketId: string, status: string, messages?: SupportTicketMessage[]) {
    const row = await fetchTicketRow(ticketId);
    if (!row) throw new Error('Ticket not found');
    const newData: any = { ...(row.data as any), status };
    if (messages) newData.messages = messages;
    const { error } = await supabase.from('tickets').update({ status, data: newData }).eq('id', ticketId);
    if (error) throw error;

    await auditService.writeAudit({
      action: 'support_status_updated',
      entityType: 'ticket',
      entityId: ticketId,
      after: { status },
    });

    try {
      const t: any = row.data;
      if (status === 'closed') {
        await notificationService.createNotification({
          userId: t.userId, roleTarget: 'customer', type: 'support_reply',
          title: 'Support Request Closed',
          message: `Your request regarding ${t.subject} has been closed by admin.`,
          link: `/my-requests`,
        } as any);
      } else if (messages?.length) {
        await notificationService.createNotification({
          userId: t.userId, roleTarget: 'customer', type: 'support_reply',
          title: 'Support Update',
          message: `Admin has replied and updated the status of your request: ${t.subject}`,
          link: `/my-requests`,
        } as any);
      }
    } catch (e) {
      console.error('Error creating notification for ticket status update', e);
    }
  },

  async addInternalNote(ticketId: string, text: string, createdBy: string) {
    const row = await fetchTicketRow(ticketId);
    if (!row) throw new Error('Ticket not found');
    const note = { id: crypto.randomUUID(), text, createdBy, createdAt: new Date().toISOString() };
    const notes = [...(row.notes ?? []), note];
    const { error } = await supabase.from('tickets').update({ notes }).eq('id', ticketId);
    if (error) throw error;
    return note;
  },

  subscribeToTicketNotes(ticketId: string, callback: (notes: any[]) => void) {
    supabase.from('tickets').select('notes').eq('id', ticketId).maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToTicketNotes', error); return; }
        callback((data?.notes as any[]) ?? []);
      });
    return () => {};
  },
};

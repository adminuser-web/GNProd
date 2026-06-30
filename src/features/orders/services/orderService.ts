import { supabase } from '../../../lib/supabase';
import { OrderRecord, OrderStatus, OrderPayment } from '../../../types';
import { notificationService } from '../../notifications/services/notificationService';
import { auditService } from '../../audit/services/auditService';

// Orders are document rows: { id, user_id, status, total, data }. The full
// OrderRecord lives in `data`.
function rowToOrder(r: any): OrderRecord {
  return { ...(r.data as any), id: r.id } as OrderRecord;
}

async function fetchOrderRow(orderId: string): Promise<any | null> {
  const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) throw error;
  return data;
}

export const orderService = {
  // "Subscriptions" — fetch-on-call (returns a no-op unsubscribe). Realtime can
  // be layered on with Supabase channels during hardening.
  subscribeToAllOrders(callback: (orders: OrderRecord[]) => void) {
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToAllOrders', error); return; }
        callback((data ?? []).map(rowToOrder));
      });
    return () => {};
  },

  subscribeToUserOrders(userId: string, callback: (orders: OrderRecord[]) => void) {
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToUserOrders', error); return; }
        callback((data ?? []).map(rowToOrder));
      });
    return () => {};
  },

  subscribeToOrder(orderId: string, callback: (order: OrderRecord | null) => void) {
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('subscribeToOrder', error); return; }
        callback(data ? rowToOrder(data) : null);
      });
    return () => {};
  },

  async getOrder(orderId: string): Promise<OrderRecord | null> {
    const row = await fetchOrderRow(orderId);
    return row ? rowToOrder(row) : null;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, changedBy: string, note?: string) {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const data: any = row.data;

    const currentStatus = (data.status as OrderStatus) || 'Order Placed';
    const { ALLOWED_TRANSITIONS, mapLegacyStatus } = await import('../../../lib/orderStatus');
    const mappedCurrent = mapLegacyStatus(currentStatus);
    const allowed = ALLOWED_TRANSITIONS[mappedCurrent] || [];
    if (status !== currentStatus && mappedCurrent !== status && !allowed.includes(status)) {
      throw new Error(`Invalid status transition from ${mappedCurrent} to ${status}`);
    }

    const timeline = data.timeline || [];
    timeline.push({
      status,
      timestamp: new Date().toISOString(),
      changedBy,
      note: note || `Status updated to ${status}`,
    });

    const newData = { ...data, status, timeline, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('orders').update({ data: newData, status }).eq('id', orderId);
    if (error) throw error;

    await auditService.writeAudit({
      action: 'order_status_updated',
      entityType: 'order',
      entityId: orderId,
      before: { status: currentStatus },
      after: { status },
      actorName: changedBy,
    });

    try {
      await notificationService.createNotification({
        userId: data.userId,
        roleTarget: 'customer',
        type: 'order_status_changed',
        title: 'Order Status Updated',
        message: `Your order ${data.receiptNumber || orderId.slice(0, 8)} is now ${status}.`,
        link: `/my-orders/${orderId}`,
      });
    } catch (err) {
      console.error('Failed to notify', err);
    }
  },

  async updateShipmentStatus(orderId: string, shipment: any) {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const newData = { ...(row.data as any), shipment, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('orders').update({ data: newData }).eq('id', orderId);
    if (error) throw error;
  },

  async updatePaymentStatus(orderId: string, payment: OrderPayment, changedBy: string = 'System') {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const data: any = row.data;

    const newData: any = { ...data, payment, updatedAt: new Date().toISOString() };
    let newStatusCol = data.status;

    if (payment.status === 'confirmed' && data.payment?.status !== 'confirmed') {
      if (!data.receiptNumber) {
        newData.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;
        newData.receiptUrl = `/my-orders/${orderId}/receipt`;
      }
      newData.status = 'Payment Confirmed';
      newStatusCol = 'Payment Confirmed';
      newData.timeline = [
        ...(data.timeline || []),
        { status: 'Payment Confirmed', timestamp: new Date().toISOString(), changedBy, note: 'Payment marked as confirmed' },
      ];
    }

    const { error } = await supabase.from('orders').update({ data: newData, status: newStatusCol }).eq('id', orderId);
    if (error) throw error;

    if (payment.status === 'confirmed' && data.payment?.status !== 'confirmed') {
      await auditService.writeAudit({
        action: 'payment_confirmed',
        entityType: 'order',
        entityId: orderId,
        before: { paymentStatus: data.payment?.status || 'pending' },
        after: { paymentStatus: 'confirmed', paidAmount: payment.paidAmount },
        actorName: changedBy,
      });
      try {
        await notificationService.createNotification({
          userId: data.userId,
          roleTarget: 'customer',
          type: 'payment_confirmed',
          title: 'Payment Confirmed',
          message: `Your payment for Order ${newData.receiptNumber || data.receiptNumber || orderId.slice(0, 8)} has been confirmed${!data.receiptNumber ? '. Receipt is now available.' : ''}`,
          link: `/my-orders/${orderId}/receipt`,
        });
      } catch (e) {
        console.error('Failed to create payment notification', e);
      }
    }
  },

  // Record that an order email DRAFT was opened in Gmail (admin sends it manually).
  // Does NOT mark the order as "sent" — just timestamps that it was prepared.
  async markEmailPrepared(orderId: string, template: string) {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const data: any = row.data;
    const payment = { ...(data.payment || {}), emailPreparedAt: new Date().toISOString(), emailPreparedTemplate: template };
    const newData = { ...data, payment, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('orders').update({ data: newData }).eq('id', orderId);
    if (error) throw error;
  },

  async updateAdminNote(orderId: string, adminNote: string) {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const newData = { ...(row.data as any), adminNote, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('orders').update({ data: newData }).eq('id', orderId);
    if (error) throw error;
  },

  async updateShipment(orderId: string, shipment: any) {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const newData = { ...(row.data as any), shipment, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('orders').update({ data: newData }).eq('id', orderId);
    if (error) throw error;
  },

  async updateOrder(orderId: string, updates: Partial<OrderRecord>) {
    const row = await fetchOrderRow(orderId);
    if (!row) throw new Error('Order not found');
    const newData = { ...(row.data as any), ...updates, updatedAt: new Date().toISOString() };
    const patch: any = { data: newData };
    if ((updates as any).status) patch.status = (updates as any).status;
    const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
    if (error) throw error;
  },

  async createOrder(orderId: string, orderData: Omit<OrderRecord, 'id'>) {
    const od: any = orderData;
    const { error } = await supabase.from('orders').insert({
      id: orderId,
      user_id: od.userId ?? null,
      status: od.status ?? 'Order Placed',
      total: od.total ?? od.totals?.total ?? 0,
      data: orderData,
    });
    if (error) throw error;
    // The admin "new order" notification is created server-side by the
    // `orders_notify_admin` DB trigger (PII-free, RLS-independent).
  },
};

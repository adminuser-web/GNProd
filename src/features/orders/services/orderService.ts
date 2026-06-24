import { collection, doc, query, where, orderBy, onSnapshot, getDoc, getDocs, updateDoc, setDoc, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { OrderRecord, OrderStatus, OrderPayment } from '../../../types';
import { notificationService } from '../../notifications/services/notificationService';
import { auditService } from '../../audit/services/auditService';

export const orderService = {
  // Subscriptions
  subscribeToAllOrders(callback: (orders: OrderRecord[]) => void) {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderRecord));
      callback(orders);
    }, (error) => {
      console.warn("Index fallback for subscribeToAllOrders", error);
      const fallQ = query(collection(db, 'orders'), limit(200));
      onSnapshot(fallQ, (snap) => {
        let fallDocs = snap.docs.map(d => ({id: d.id, ...d.data()}) as OrderRecord);
        fallDocs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        callback(fallDocs);
      }, (fallErr) => {
        console.error("Fallback query error in subscribeToAllOrders:", fallErr);
      });
    });
  },

  subscribeToUserOrders(userId: string, callback: (orders: OrderRecord[]) => void) {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderRecord));
      callback(orders);
    }, (err) => console.error(err));
  },

  subscribeToOrder(orderId: string, callback: (order: OrderRecord | null) => void) {
    const q = doc(db, 'orders', orderId);
    return onSnapshot(q, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as OrderRecord);
      } else {
        callback(null);
      }
    }, (err) => console.error(err));
  },

  // Mutations
  async updateOrderStatus(orderId: string, status: OrderStatus, changedBy: string, note?: string) {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');
    
    const data = orderSnap.data();
    
    // Check if transition is allowed
    const currentStatus = (data.status as OrderStatus) || 'Order Placed';
    const { ALLOWED_TRANSITIONS, mapLegacyStatus } = await import('../../../lib/orderStatus');
    const mappedCurrent = mapLegacyStatus(currentStatus);
    const allowed = ALLOWED_TRANSITIONS[mappedCurrent] || [];
    
    if (status !== currentStatus && mappedCurrent !== status && !allowed.includes(status)) {
      throw new Error(`Invalid status transition from ${mappedCurrent} to ${status}`);
    }

    const timeline = data.timeline || [];
    
    // Add to timeline
    timeline.push({
      status,
      timestamp: new Date(),
      changedBy,
      note: note || `Status updated to ${status}`
    });

    await updateDoc(orderRef, {
      status,
      timeline,
      updatedAt: new Date()
    });

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
        message: `Your order ${data.receiptNumber || data.id?.slice(0, 8)} is now ${status}.`,
        link: `/my-orders/${orderId}`
      });
    } catch (err) {
      console.error("Failed to notification", err);
    }
  },

  async updateShipmentStatus(orderId: string, shipment: any) {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      shipment: shipment,
      updatedAt: new Date()
    });
  },

  async updatePaymentStatus(orderId: string, payment: OrderPayment, changedBy: string = 'System') {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("Order not found");
    const data = orderSnap.data() as OrderRecord;

    const updates: any = {
      payment,
      updatedAt: new Date()
    };

    if (payment.status === 'confirmed' && data.payment?.status !== 'confirmed') {
      // 1. Generate receipt number if missing
      if (!data.receiptNumber) {
        updates.receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`;
        updates.receiptUrl = `/my-orders/${orderId}/receipt`;
      }
      
      updates.status = 'Payment Confirmed';
      updates.timeline = [
        ...(data.timeline || []),
        {
          status: 'Payment Confirmed',
          timestamp: new Date(),
          changedBy,
          note: 'Payment marked as confirmed'
        }
      ];
    }

    await updateDoc(orderRef, updates);

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
          message: `Your payment for Order ${updates.receiptNumber || data.receiptNumber || orderId.slice(0,8)} has been confirmed${!data.receiptNumber ? '. Receipt is now available.' : ''}`,
          link: `/my-orders/${orderId}/receipt`
        });
      } catch (e) {
        console.error("Failed to create payment notification", e);
      }
    }
  },

  async updateAdminNote(orderId: string, adminNote: string) {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      adminNote,
      updatedAt: new Date()
    });
  },

  async updateShipment(orderId: string, shipment: any) {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      shipment,
      updatedAt: new Date()
    });
  },

  async updateOrder(orderId: string, updates: Partial<OrderRecord>) {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async createOrder(orderId: string, orderData: Omit<OrderRecord, 'id'>) {
    await setDoc(doc(db, 'orders', orderId), orderData);
    
    try {
      await notificationService.createNotification({
        userId: orderData.userId || 'system',
        roleTarget: 'admin',
        type: 'order_created',
        title: 'New Order Received',
        message: `${(orderData as any).customerInfo?.name || orderData.shippingDetails?.name || 'Customer'} placed a new order.`,
        link: `/admin/orders/${orderId}`
      });
    } catch (e) {
      console.error("Failed to create admin notification", e);
    }
  }
};

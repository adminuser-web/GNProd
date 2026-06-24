import { collection, doc, query, where, orderBy, onSnapshot, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { SupportTicket, SupportTicketMessage, TicketAttachment } from '../../../types';
import { notificationService } from '../../notifications/services/notificationService';
import { auditService } from '../../audit/services/auditService';

export const ticketService = {
  async uploadAttachment(file: File, userId: string, ticketId: string): Promise<TicketAttachment> {
    if (!storage) throw new Error("Firebase storage not initialized");
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `support/${userId}/${ticketId}/${fileName}`);
    const snapshot = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return {
      name: file.name,
      url,
      contentType: file.type
    };
  },

  // Subscriptions
  subscribeToAllTickets(callback: (tickets: SupportTicket[]) => void) {
    const q = query(
      collection(db, 'tickets'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SupportTicket);
      callback(tickets);
    }, (error) => {
      console.error("Error in subscribeToAllTickets:", error);
    });
  },

  subscribeToOpenTickets(callback: (tickets: SupportTicket[]) => void) {
    const q = query(
      collection(db, 'tickets'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SupportTicket);
      callback(tickets);
    }, (error) => {
      console.error("Error in subscribeToOpenTickets:", error);
    });
  },

  subscribeToUserTickets(userId: string, callback: (tickets: SupportTicket[]) => void) {
    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SupportTicket);
      callback(tickets);
    }, (error) => {
      console.error("Error in subscribeToUserTickets:", error);
    });
  },

  // Mutations
  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'tickets'), {
      ...ticketData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      await notificationService.createNotification({
        userId: ticketData.userId,
        roleTarget: 'admin',
        type: 'new_support_request',
        title: 'New Support Request',
        message: `${ticketData.customerName} submitted a new support request regarding ${ticketData.subject}.`,
        link: '/admin/support'
      });
    } catch (e) {
      console.error("Error creating notification for support request", e);
    }

    return docRef;
  },

  async addAdminReply(ticketId: string, messages: SupportTicketMessage[]) {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      messages,
      updatedAt: serverTimestamp()
    });

    try {
      const snap = await getDoc(ticketRef);
      if (snap.exists()) {
         const ticket = snap.data();
         await notificationService.createNotification({
            userId: ticket.userId,
            roleTarget: 'customer',
            type: 'support_reply',
            title: 'Support Update',
            message: `Admin has replied to your request: ${ticket.subject}`,
            link: `/my-requests`
         });
      }
    } catch (e) {
      console.error("Error creating notification for admin reply", e);
    }
  },

  async addCustomerReply(ticketId: string, messages: SupportTicketMessage[]) {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      messages,
      updatedAt: serverTimestamp()
    });

    try {
      const snap = await getDoc(ticketRef);
      if (snap.exists()) {
         const ticket = snap.data();
         await notificationService.createNotification({
            userId: ticket.userId,
            roleTarget: 'admin',
            type: 'support_reply',
            title: 'Customer Reply',
            message: `${ticket.customerName} has replied to request: ${ticket.subject}`,
            link: '/admin/support'
         });
      }
    } catch (e) {
      console.error("Error creating notification for customer reply", e);
    }
  },

  async updateTicketStatus(ticketId: string, status: string, messages?: SupportTicketMessage[]) {
    const ticketRef = doc(db, 'tickets', ticketId);
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };
    if (messages) {
      updates.messages = messages;
    }
    await updateDoc(ticketRef, updates);

    await auditService.writeAudit({
      action: 'support_status_updated',
      entityType: 'ticket',
      entityId: ticketId,
      after: { status },
    });

    try {
      const snap = await getDoc(ticketRef);
      if (snap.exists() && status === 'closed') {
         const ticket = snap.data();
         await notificationService.createNotification({
            userId: ticket.userId,
            roleTarget: 'customer',
            type: 'support_reply',
            title: 'Support Request Closed',
            message: `Your request regarding ${ticket.subject} has been closed by admin.`,
            link: `/my-requests`
         });
      } else if (snap.exists() && messages?.length) {
         const ticket = snap.data();
         await notificationService.createNotification({
            userId: ticket.userId,
            roleTarget: 'customer',
            type: 'support_reply',
            title: 'Support Update',
            message: `Admin has replied and updated the status of your request: ${ticket.subject}`,
            link: `/my-requests`
         });
      }
    } catch (e) {
      console.error("Error creating notification for ticket status update", e);
    }
  },

  async addInternalNote(ticketId: string, text: string, createdBy: string) {
    return await addDoc(collection(db, 'tickets', ticketId, 'notes'), {
      text,
      createdBy,
      createdAt: serverTimestamp()
    });
  },

  subscribeToTicketNotes(ticketId: string, callback: (notes: any[]) => void) {
    const q = query(collection(db, 'tickets', ticketId, 'notes'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notes);
    }, (error) => {
      console.error("Error fetching notes:", error);
    });
  }
};

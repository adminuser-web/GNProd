import { collection, doc, setDoc, getDocs, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Enquiry, EnquiryStatus } from '../types';
import { notificationService } from '../../notifications/services/notificationService';
import { auditService } from '../../audit/services/auditService';

export const enquiryService = {
  async submitEnquiry(enquiry: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    const id = doc(collection(db, 'enquiries')).id;
    const docRef = doc(db, 'enquiries', id);
    const newEnquiry = {
      ...enquiry,
      id,
      status: 'new' as EnquiryStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newEnquiry);
    
    try {
      await notificationService.createNotification({
        userId: enquiry.userId || 'system',
        roleTarget: 'admin',
        type: 'new_enquiry',
        title: 'New Enquiry',
        message: `${enquiry.customerName} submitted a new ${enquiry.type?.replace(/_/g, ' ') || 'enquiry'}.`,
        link: '/admin/enquiries'
      });
    } catch (e) {
      console.error("Error creating notification for enquiry", e);
    }
    
    return id;
  },

  async updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<void> {
    const docRef = doc(db, 'enquiries', id);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });

    await auditService.writeAudit({
      action: 'enquiry_status_updated',
      entityType: 'enquiry',
      entityId: id,
      after: { status },
    });
  }
};

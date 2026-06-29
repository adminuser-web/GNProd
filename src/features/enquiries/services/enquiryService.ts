import { supabase } from '../../../lib/supabase';
import { Enquiry, EnquiryStatus } from '../types';
import { notificationService } from '../../notifications/services/notificationService';
import { auditService } from '../../audit/services/auditService';

// enquiries are document rows: { id, status, data (full Enquiry), created_at }.
export const enquiryService = {
  async submitEnquiry(
    enquiry: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<string> {
    const { data, error } = await supabase
      .from('enquiries')
      .insert({ status: 'new', data: enquiry })
      .select('id')
      .single();
    if (error) throw error;

    const e: any = enquiry;
    try {
      await notificationService.createNotification({
        userId: e.userId || 'system',
        roleTarget: 'admin',
        type: 'new_enquiry',
        title: 'New Enquiry',
        message: `${e.customerName} submitted a new ${e.type?.replace(/_/g, ' ') || 'enquiry'}.`,
        link: '/admin/enquiries',
      } as any);
    } catch (err) {
      console.error('Error creating notification for enquiry', err);
    }

    return data!.id;
  },

  async updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<void> {
    const { error } = await supabase.from('enquiries').update({ status }).eq('id', id);
    if (error) throw error;

    await auditService.writeAudit({
      action: 'enquiry_status_updated',
      entityType: 'enquiry',
      entityId: id,
      after: { status },
    });
  },
};

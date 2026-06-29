import { supabase } from '../../../lib/supabase';

export const crmService = {
  async getCustomerNote(userId: string): Promise<string> {
    if (!userId) return '';
    try {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('note')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data?.note || '';
    } catch (err) {
      console.error('Error fetching customer note', err);
      return '';
    }
  },

  async updateCustomerNote(userId: string, note: string): Promise<void> {
    if (!userId) return;
    const { error } = await supabase
      .from('customer_notes')
      .upsert({ user_id: userId, note, updated_at: new Date().toISOString() });
    if (error) {
      console.error('Error updating customer note', error);
      throw error;
    }
  },
};

import { supabase } from '../../../lib/supabase';
import { PricingRule, DiscountCode } from '../../../lib/pricing';

export const pricingConfigAdminService = {
  async getPricingRules(): Promise<PricingRule[]> {
    const { data, error } = await supabase.from('pricing_rules').select('*');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id } as unknown as PricingRule));
  },

  async getDiscountCodes(): Promise<DiscountCode[]> {
    const { data, error } = await supabase.from('discount_codes').select('*');
    if (error) { console.error(error); return []; }
    return (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id } as unknown as DiscountCode));
  },

  async createPricingRule(rule: Partial<PricingRule>) {
    const data: any = { ...rule };
    delete data.id;
    const { error } = await supabase.from('pricing_rules').insert({ data });
    if (error) throw error;
  },

  async updatePricingRule(id: string, updates: Partial<PricingRule>) {
    const data: any = { ...updates };
    delete data.id;
    const { error } = await supabase.from('pricing_rules').update({ data }).eq('id', id);
    if (error) throw error;
  },

  async deletePricingRule(id: string) {
    const { error } = await supabase.from('pricing_rules').delete().eq('id', id);
    if (error) throw error;
  },

  async createDiscountCode(code: Partial<DiscountCode>) {
    const data: any = { ...code };
    delete data.id;
    const { error } = await supabase.from('discount_codes').insert({ data });
    if (error) throw error;
  },

  async updateDiscountCode(id: string, updates: Partial<DiscountCode>) {
    const data: any = { ...updates };
    delete data.id;
    const { error } = await supabase.from('discount_codes').update({ data }).eq('id', id);
    if (error) throw error;
  },

  async deleteDiscountCode(id: string) {
    const { error } = await supabase.from('discount_codes').delete().eq('id', id);
    if (error) throw error;
  },
};

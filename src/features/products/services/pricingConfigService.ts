import { supabase } from '../../../lib/supabase';
import { PricingRule, DiscountCode } from '../../../lib/pricing';

export const pricingConfigService = {
  async getPricingRules(): Promise<PricingRule[]> {
    const { data, error } = await supabase.from('pricing_rules').select('*');
    if (error) { console.error('getPricingRules', error); return []; }
    return (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id } as unknown as PricingRule));
  },

  async getDiscountCodes(): Promise<DiscountCode[]> {
    const { data, error } = await supabase.from('discount_codes').select('*');
    if (error) { console.error('getDiscountCodes', error); return []; }
    return (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id } as unknown as DiscountCode));
  },
};

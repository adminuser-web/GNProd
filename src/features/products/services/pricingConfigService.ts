import { supabase } from '../../../lib/supabase';
import { PricingRule, DiscountCode } from '../../../lib/pricing';

export const pricingConfigService = {
  async getPricingRules(): Promise<PricingRule[]> {
    const { data, error } = await supabase.from('pricing_rules').select('*');
    if (error) { console.error('getPricingRules', error); return []; }
    return (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id } as unknown as PricingRule));
  },

  // Customers can no longer list discount_codes (admin-only). Code-discount
  // display in product/cart pricing therefore returns []; codes apply only when
  // a customer explicitly enters one and it's validated server-side at checkout.
  async getDiscountCodes(): Promise<DiscountCode[]> {
    const { data, error } = await supabase.from('discount_codes').select('*');
    if (error) { return []; }
    return (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id } as unknown as DiscountCode));
  },

  // Validate a single pasted code via the SECURITY DEFINER RPC (no enumeration).
  // Returns the matching active/unexpired code, or null.
  async validateDiscountCode(code: string): Promise<DiscountCode | null> {
    const trimmed = (code || '').trim();
    if (!trimmed) return null;
    const { data, error } = await supabase.rpc('validate_discount_code', { p_code: trimmed });
    if (error || !data) return null;
    return data as DiscountCode;
  },
};

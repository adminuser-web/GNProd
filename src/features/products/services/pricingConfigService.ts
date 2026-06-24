import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PricingRule, DiscountCode } from '../../../lib/pricing';

export const pricingConfigService = {
  async getPricingRules(): Promise<PricingRule[]> {
    try {
      const q = collection(db, 'pricingRules');
      const snap = await getDocs(q);
      if (snap.empty) return [];
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as PricingRule));
    } catch {
      return [];
    }
  },

  async getDiscountCodes(): Promise<DiscountCode[]> {
    try {
      const q = collection(db, 'discountCodes');
      const snap = await getDocs(q);
      if (snap.empty) return [];
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as DiscountCode));
    } catch {
      return [];
    }
  }
};

import { collection, doc, getDocs, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PricingRule, DiscountCode } from '../../../lib/pricing';

export const pricingConfigAdminService = {
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
  },

  async createPricingRule(rule: Partial<PricingRule>) {
    const data = { ...rule };
    delete data.id;
    await addDoc(collection(db, 'pricingRules'), data);
  },

  async updatePricingRule(id: string, updates: Partial<PricingRule>) {
    const data = { ...updates };
    delete data.id;
    await updateDoc(doc(db, 'pricingRules', id), data);
  },

  async deletePricingRule(id: string) {
    await deleteDoc(doc(db, 'pricingRules', id));
  },

  async createDiscountCode(code: Partial<DiscountCode>) {
    const data = { ...code } as any;
    delete data.id;
    await addDoc(collection(db, 'discountCodes'), data);
  },

  async updateDiscountCode(id: string, updates: Partial<DiscountCode>) {
    const data = { ...updates } as any;
    delete data.id;
    await updateDoc(doc(db, 'discountCodes', id), data);
  },

  async deleteDiscountCode(id: string) {
    await deleteDoc(doc(db, 'discountCodes', id));
  }
};

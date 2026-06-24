import { useState, useEffect } from 'react';
import { pricingConfigService } from '../services/pricingConfigService';
import { PricingRule, DiscountCode } from '../../../lib/pricing';

let cachedRules: PricingRule[] | null = null;
let cachedCodes: DiscountCode[] | null = null;
let fetchPromise: Promise<void> | null = null;

export function refreshPricingConfig() {
  cachedRules = null;
  cachedCodes = null;
  fetchPromise = null;
}

export function usePricingConfig() {
  const [rules, setRules] = useState<PricingRule[]>(cachedRules || []);
  const [codes, setCodes] = useState<DiscountCode[]>(cachedCodes || []);
  const [loading, setLoading] = useState(!cachedRules);

  useEffect(() => {
    if (cachedRules && cachedCodes) return;

    if (!fetchPromise) {
      fetchPromise = Promise.all([
        pricingConfigService.getPricingRules(),
        pricingConfigService.getDiscountCodes()
      ]).then(([fetchedRules, fetchedCodes]) => {
        cachedRules = fetchedRules;
        cachedCodes = fetchedCodes;
      }).catch(err => {
        console.error('Failed to fetch pricing config:', err);
      });
    }

    fetchPromise.then(() => {
      setRules(cachedRules || []);
      setCodes(cachedCodes || []);
      setLoading(false);
    });
  }, []);

  return { rules, codes, loading };
}


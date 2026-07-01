import { Product } from '../types';
import { getCustomizableAttributes } from '../features/products/attributes';

export interface PricingRule {
  id: string;
  label: string;
  type: 'flat' | 'percent';
  amount: number;
  appliesTo?: 'order' | 'series' | 'subSeries' | 'group' | 'option' | 'accessory';
  target?: string;
  active: boolean;
  startsAt?: number;
  endsAt?: number;
}

export interface DiscountCode {
  code: string;
  type: 'flat' | 'percent';
  amount: number;
  active: boolean;
  expiresAt?: number;
}

export interface PricingOptions {
  rules?: PricingRule[];
  discountCode?: string;
  availableCodes?: DiscountCode[];
}

export interface LineItem {
  label: string;
  amount: number;
  groupId?: string;
}

export interface DiscountItem {
  label: string;
  amount: number;
}

export interface PricingResult {
  base: number;
  lineItems: LineItem[];
  subtotal: number;
  discounts: DiscountItem[];
  total: number;
}

export function computePrice(
  product: Product,
  selections: Record<string, string>,
  opts?: PricingOptions
): PricingResult {
  const base = product.price || 0;
  const lineItems: LineItem[] = [];

  let optionsTotal = 0;

  // Compute selected options from the unified attribute model (customizable
  // attributes only; `getCustomizableAttributes` already filters to active).
  const customizable = getCustomizableAttributes(product);
  customizable.forEach(attr => {
    const options = attr.options ?? [];
    const selectedOptVal = selections[attr.key];
    if (selectedOptVal) {
      let opt = options.find(o => o.id === selectedOptVal);

      // Ignore unavailable options
      if (attr.type !== 'text' && opt && opt.active === false) {
        opt = undefined;
      }

      let displayLabel = "";

      if (attr.type === 'text') {
        if (selectedOptVal.trim() !== '') {
          opt = options[0]; // Text types use the first option for pricing
          displayLabel = `${attr.label}: "${selectedOptVal}"`;
        }
      } else if (opt) {
        displayLabel = `${attr.label}: ${opt.label}`;
      }

      if (opt && opt.priceDelta > 0) {
        lineItems.push({
          label: displayLabel,
          amount: opt.priceDelta,
          groupId: attr.key
        });
        optionsTotal += opt.priceDelta;
      }
    }
  });

  const subtotal = base + optionsTotal;
  const discounts: DiscountItem[] = [];
  let totalDiscounts = 0;

  const now = Date.now();
  
  // Apply Pricing Rules
  if (opts?.rules) {
    opts.rules.forEach(rule => {
      if (!rule.active) return;
      if (rule.startsAt && now < rule.startsAt) return;
      if (rule.endsAt && now > rule.endsAt) return;

      if (!rule.appliesTo || rule.appliesTo === 'order') {
        const discountAmount = rule.type === 'percent' 
          ? subtotal * (rule.amount / 100) 
          : rule.amount;
        
        discounts.push({ label: rule.label, amount: discountAmount });
        totalDiscounts += discountAmount;
      } else if (rule.appliesTo === 'series' && rule.target) {
        if (product.id === rule.target || product.slug === rule.target) {
          const discountAmount = rule.type === 'percent'
            ? subtotal * (rule.amount / 100)
            : rule.amount;
          discounts.push({ label: rule.label, amount: discountAmount });
          totalDiscounts += discountAmount;
        }
      } else if (rule.appliesTo === 'subSeries' && rule.target) {
        if ((product as any).activeSubSeriesId === rule.target) {
          const discountAmount = rule.type === 'percent'
            ? subtotal * (rule.amount / 100)
            : rule.amount;
          discounts.push({ label: rule.label, amount: discountAmount });
          totalDiscounts += discountAmount;
        }
      } else if (rule.appliesTo === 'accessory' && rule.target) {
        if (selections['accessories'] === rule.target || (selections['accessories'] && typeof selections['accessories'] === 'string' && selections['accessories'].includes(rule.target))) {
            const discountAmount = rule.type === 'percent'
              ? subtotal * (rule.amount / 100)
              : rule.amount;
            discounts.push({ label: rule.label, amount: discountAmount });
            totalDiscounts += discountAmount;
        }
      } else if (rule.appliesTo === 'group' && rule.target) {
        // Find if the target group is selected and has a price delta
        const itemObj = lineItems.find(li => li.groupId === rule.target);
        if (itemObj && itemObj.amount > 0) {
          const discountAmount = rule.type === 'percent'
            ? itemObj.amount * (rule.amount / 100)
            : Math.min(rule.amount, itemObj.amount);
          discounts.push({ label: rule.label, amount: discountAmount });
          totalDiscounts += discountAmount;
        }
      } else if (rule.appliesTo === 'option' && rule.target) {
        // Target format could be "groupId:optionId"
        const [targetGroupId, targetOptionId] = rule.target.split(':');
        if (targetGroupId && targetOptionId && selections[targetGroupId] === targetOptionId) {
          const item = lineItems.find(li => li.groupId === targetGroupId);
          if (item && item.amount > 0) {
            const discountAmount = rule.type === 'percent'
              ? item.amount * (rule.amount / 100)
              : Math.min(rule.amount, item.amount);
            discounts.push({ label: rule.label, amount: discountAmount });
            totalDiscounts += discountAmount;
          } else if (!item) {
            // Apply to subtotal if the option doesn't have a specific line item amount?
            // Usually option discounts apply to base if option has no delta, or we just discount the option cost
            // Let's assume it discounts the option cost, so if it's 0, discount is 0. But wait!
            // Sometimes it's a fixed amount off the subtotal if that option is selected.
            const discountAmount = rule.type === 'percent'
              ? subtotal * (rule.amount / 100)
              : rule.amount;
            discounts.push({ label: rule.label, amount: discountAmount });
            totalDiscounts += discountAmount;
          }
        }
      }
    });
  }

  // Apply Discount Codes
  if (opts?.discountCode && opts.availableCodes) {
    const code = opts.availableCodes.find(
      c => c.code.toLowerCase() === opts.discountCode?.toLowerCase()
    );
    if (code && code.active && (!code.expiresAt || now <= code.expiresAt)) {
      const discountAmount = code.type === 'percent'
        ? subtotal * (code.amount / 100)
        : code.amount;
      
      discounts.push({ label: `Code: ${code.code}`, amount: discountAmount });
      totalDiscounts += discountAmount;
    }
  }

  return {
    base,
    lineItems,
    subtotal,
    discounts,
    total: Math.max(0, subtotal - totalDiscounts)
  };
}

import { describe, it, expect } from 'vitest';
import { computePrice } from './pricing';

const product: any = {
  id: 'debutant',
  slug: 'debutant',
  price: 10000,
  customizationGroups: [
    {
      id: 'grip', label: 'Grip', type: 'select', active: true,
      options: [
        { id: 'std', label: 'Standard', priceDelta: 0, active: true },
        { id: 'pro', label: 'Pro', priceDelta: 500, active: true },
      ],
    },
    {
      id: 'disabledGroup', label: 'Hidden', type: 'select', active: false,
      options: [{ id: 'a', label: 'A', priceDelta: 999, active: true }],
    },
  ],
};

describe('pricing — computePrice', () => {
  it('base price with no selections', () => {
    const r = computePrice(product, {});
    expect(r.base).toBe(10000);
    expect(r.subtotal).toBe(10000);
    expect(r.total).toBe(10000);
    expect(r.lineItems).toHaveLength(0);
  });

  it('adds option price deltas to the subtotal', () => {
    const r = computePrice(product, { grip: 'pro' });
    expect(r.subtotal).toBe(10500);
    expect(r.total).toBe(10500);
    expect(r.lineItems.find(li => li.groupId === 'grip')?.amount).toBe(500);
  });

  it('ignores selections on inactive groups', () => {
    const r = computePrice(product, { disabledGroup: 'a' });
    expect(r.subtotal).toBe(10000);
  });

  it('applies an order-level percent rule', () => {
    const r = computePrice(product, { grip: 'pro' }, {
      rules: [{ id: 'r1', label: '10% off', type: 'percent', amount: 10, active: true } as any],
    });
    expect(r.total).toBe(10500 - 1050); // 9450
  });

  it('applies a valid discount code and never goes below zero', () => {
    const r = computePrice(product, {}, {
      discountCode: 'WELCOME',
      availableCodes: [{ code: 'WELCOME', type: 'fixed', amount: 999999, active: true } as any],
    });
    expect(r.total).toBe(0);
  });

  it('ignores an unknown/inactive discount code', () => {
    const r = computePrice(product, {}, {
      discountCode: 'NOPE',
      availableCodes: [{ code: 'WELCOME', type: 'percent', amount: 10, active: true } as any],
    });
    expect(r.total).toBe(10000);
  });
});

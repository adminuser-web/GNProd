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

// The unified attribute model is the source of truth post-migration. These
// mirror the legacy cases above but drive pricing off `attributes` directly.
const attrProduct: any = {
  id: 'debutant',
  slug: 'debutant',
  price: 10000,
  attributes: [
    {
      id: 'grip', key: 'grip', label: 'Grip', mode: 'customizable',
      type: 'single_select', active: true, sortOrder: 0,
      options: [
        { id: 'std', label: 'Standard', priceDelta: 0, active: true },
        { id: 'pro', label: 'Pro', priceDelta: 500, active: true },
      ],
    },
    {
      id: 'engraving', key: 'engraving', label: 'Engraving', mode: 'customizable',
      type: 'text', active: true, sortOrder: 1,
      options: [{ id: 'engraving-yes', label: 'Add Engraving', priceDelta: 1500, active: true }],
    },
    {
      id: 'disabled', key: 'disabled', label: 'Hidden', mode: 'customizable',
      type: 'single_select', active: false, sortOrder: 2,
      options: [{ id: 'a', label: 'A', priceDelta: 999, active: true }],
    },
    {
      id: 'fixed-grains', key: 'grains', label: 'Grains', mode: 'fixed',
      active: true, sortOrder: 3, fixedValue: '6-8 grains',
    },
  ],
};

describe('pricing — computePrice (attribute model)', () => {
  it('base price with no selections', () => {
    const r = computePrice(attrProduct, {});
    expect(r.subtotal).toBe(10000);
    expect(r.lineItems).toHaveLength(0);
  });

  it('adds a customizable option surcharge', () => {
    const r = computePrice(attrProduct, { grip: 'pro' });
    expect(r.subtotal).toBe(10500);
    expect(r.lineItems.find(li => li.groupId === 'grip')?.amount).toBe(500);
  });

  it('charges a text attribute (engraving) by its option priceDelta when filled', () => {
    const r = computePrice(attrProduct, { engraving: 'MS DHONI' });
    expect(r.subtotal).toBe(11500);
  });

  it('ignores selections on inactive attributes and fixed attributes', () => {
    const r = computePrice(attrProduct, { disabled: 'a', grains: 'anything' });
    expect(r.subtotal).toBe(10000);
  });
});

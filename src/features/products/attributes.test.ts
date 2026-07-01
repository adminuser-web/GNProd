import { describe, it, expect } from 'vitest';
import { applySeriesDefaults, attributeProvenance } from './attributes';

const t = (over: any) => ({ id: over.key, key: over.key, label: over.key, mode: 'customizable', sortOrder: 0, active: true, options: [], ...over });

const template = [
  t({ key: 'bat-size', active: true }),
  t({ key: 'grip-color', active: true, options: [{ id: 'w', label: 'White', priceDelta: 0 }] }),
  t({ key: 'engraving', active: false, type: 'text' }),
];

describe('applySeriesDefaults', () => {
  it('fills only missing keys, never overwrites existing', () => {
    const current = [t({ key: 'bat-size', label: 'Custom Size', active: false })];
    const { attributes, added } = applySeriesDefaults(current, template);
    expect(added).toEqual(['grip-color', 'engraving']);
    // existing untouched
    expect(attributes.find(a => a.key === 'bat-size')!.label).toBe('Custom Size');
    expect(attributes).toHaveLength(3);
  });

  it('added attributes are forced inactive by default', () => {
    const { attributes } = applySeriesDefaults([], template);
    expect(attributes.every(a => a.active === false)).toBe(true);
  });

  it('activateAdded keeps template active state (for new sub-series)', () => {
    const { attributes } = applySeriesDefaults([], template, { activateAdded: true });
    expect(attributes.find(a => a.key === 'bat-size')!.active).toBe(true);
    expect(attributes.find(a => a.key === 'engraving')!.active).toBe(false); // template inactive
  });

  it('deep-copies options (no shared references)', () => {
    const { attributes } = applySeriesDefaults([], template, { activateAdded: true });
    const grip = attributes.find(a => a.key === 'grip-color')!;
    grip.options![0].label = 'Mutated';
    expect(template[1].options![0].label).toBe('White');
  });
});

describe('attributeProvenance', () => {
  it('series-default when config matches (ignoring active/sortOrder)', () => {
    const attr = t({ key: 'bat-size', active: false, sortOrder: 9 });
    expect(attributeProvenance(attr, template)).toBe('series-default');
  });
  it('overridden when config differs', () => {
    const attr = t({ key: 'grip-color', options: [{ id: 'w', label: 'White', priceDelta: 500 }] });
    expect(attributeProvenance(attr, template)).toBe('overridden');
  });
  it('product when key not in template', () => {
    expect(attributeProvenance(t({ key: 'sticker' }), template)).toBe('product');
  });
});

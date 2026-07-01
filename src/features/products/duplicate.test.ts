import { describe, it, expect } from 'vitest';
import { buildDuplicateSubSeries } from './duplicate';

const original: any = {
  id: 'legend-legend-elite',
  slug: 'legend-elite',
  name: 'Legend Elite',
  sku: 'LEG-001',
  active: true,
  sortOrder: 10,
  basePrice: 40000,
  compareAtPrice: 45000,
  seoTitle: 'Legend Elite',
  shortDescription: 'A great bat',
  media: { primaryImage: 'https://cdn/x/primary.webp', galleryImages: ['https://cdn/x/g1.webp'] },
  attributes: [
    { id: 'bat-size', key: 'bat-size', label: 'Bat Size', mode: 'customizable', sortOrder: 0, active: true,
      options: [{ id: 'sh', label: 'SH', priceDelta: 0, imageUrl: 'https://cdn/x/swatch.webp' }] },
    { id: 'fixed-grains', key: 'grains', label: 'Grains', mode: 'fixed', sortOrder: 1, active: true, fixedValue: '10 grains' },
  ],
};

const ctx = { seriesSlug: 'legend', existingSlugs: ['legend-elite'], existingSkus: ['LEG-001'] };

describe('buildDuplicateSubSeries', () => {
  it('appends " Copy" and creates a fresh unique slug/id/sku, inactive', () => {
    const d = buildDuplicateSubSeries(original, ctx);
    expect(d.name).toBe('Legend Elite Copy');
    expect(d.slug).toBe('legend-elite-copy');
    expect(d.id).toBe('legend-legend-elite-copy');
    expect(d.sku).toBe('LEG-001-COPY');
    expect(d.active).toBe(false);
  });

  it('copies attributes (fixed + customizable, incl options/prices)', () => {
    const d: any = buildDuplicateSubSeries(original, ctx);
    expect(d.attributes).toHaveLength(2);
    expect(d.attributes[0].options[0].priceDelta).toBe(0);
    expect(d.attributes[1].fixedValue).toBe('10 grains');
  });

  it('REFERENCES the same image URLs — never re-uploads or changes paths', () => {
    const d: any = buildDuplicateSubSeries(original, ctx);
    expect(d.media.primaryImage).toBe('https://cdn/x/primary.webp');
    expect(d.media.galleryImages[0]).toBe('https://cdn/x/g1.webp');
    expect(d.attributes[0].options[0].imageUrl).toBe('https://cdn/x/swatch.webp');
  });

  it('does NOT mutate the original (deep clone)', () => {
    const d: any = buildDuplicateSubSeries(original, ctx);
    d.name = 'changed';
    d.attributes[0].options[0].priceDelta = 999;
    d.media.primaryImage = 'https://cdn/x/OTHER.webp';
    expect(original.name).toBe('Legend Elite');
    expect(original.attributes[0].options[0].priceDelta).toBe(0);
    expect(original.media.primaryImage).toBe('https://cdn/x/primary.webp');
    expect(original.active).toBe(true);
  });

  it('disambiguates slug/sku when the base is already taken', () => {
    const d = buildDuplicateSubSeries(original, {
      seriesSlug: 'legend',
      existingSlugs: ['legend-elite', 'legend-elite-copy'],
      existingSkus: ['LEG-001', 'LEG-001-COPY'],
    });
    expect(d.slug).toBe('legend-elite-copy-2');
    expect(d.sku).toBe('LEG-001-COPY-2');
  });
});

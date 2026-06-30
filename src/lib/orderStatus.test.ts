import { describe, it, expect } from 'vitest';
import { ALLOWED_TRANSITIONS, mapLegacyStatus, stageIndex, STAGE_FLOW } from './orderStatus';

describe('orderStatus — mapLegacyStatus', () => {
  it('passes through known statuses', () => {
    expect(mapLegacyStatus('Processing')).toBe('Processing');
    expect(mapLegacyStatus('Shipped')).toBe('Shipped');
    expect(mapLegacyStatus('Cancelled')).toBe('Cancelled');
  });
  it('maps legacy aliases', () => {
    expect(mapLegacyStatus('Crafting')).toBe('Processing');
    expect(mapLegacyStatus('In Production')).toBe('Processing');
    expect(mapLegacyStatus('Confirmed')).toBe('Payment Confirmed');
  });
});

describe('orderStatus — stageIndex (unified 4-stage flow)', () => {
  it('maps the canonical stages to 0..3', () => {
    expect(stageIndex('Order Placed')).toBe(0);
    expect(stageIndex('Processing')).toBe(1);
    expect(stageIndex('Shipped')).toBe(2);
    expect(stageIndex('Delivered')).toBe(3);
  });
  it('returns -1 for cancelled', () => {
    expect(stageIndex('Cancelled')).toBe(-1);
  });
  it('folds payment-confirmed into Processing and ready-for-pickup into Shipped', () => {
    expect(stageIndex('Payment Confirmed')).toBe(1);
    expect(stageIndex('Ready for Pickup')).toBe(2);
    expect(stageIndex('Completed')).toBe(3);
  });
  it('defaults unknown/empty to stage 0', () => {
    expect(stageIndex('')).toBe(0);
    expect(stageIndex('Whatever')).toBe(0);
  });
});

describe('orderStatus — ALLOWED_TRANSITIONS (business rules)', () => {
  it('Delivered is terminal (no transitions)', () => {
    expect(ALLOWED_TRANSITIONS['Delivered']).toEqual([]);
  });
  it('Cancel is allowed before delivery, NOT after', () => {
    expect(ALLOWED_TRANSITIONS['Order Placed']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Processing']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Shipped']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Delivered']).not.toContain('Cancelled');
  });
  it('follows the unified path Placed→Processing→Shipped→Delivered', () => {
    expect(ALLOWED_TRANSITIONS['Order Placed']).toContain('Processing');
    expect(ALLOWED_TRANSITIONS['Processing']).toContain('Shipped');
    expect(ALLOWED_TRANSITIONS['Shipped']).toContain('Delivered');
  });
  it('STAGE_FLOW is the 4 canonical stages in order', () => {
    expect(STAGE_FLOW).toEqual(['Order Placed', 'Processing', 'Shipped', 'Delivered']);
  });
});

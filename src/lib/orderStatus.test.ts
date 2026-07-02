import { describe, it, expect } from 'vitest';
import { ALLOWED_TRANSITIONS, mapLegacyStatus, stageIndex, STAGE_FLOW } from './orderStatus';

describe('orderStatus — mapLegacyStatus', () => {
  it('passes through known statuses', () => {
    expect(mapLegacyStatus('Processing')).toBe('Processing');
    expect(mapLegacyStatus('Shipped')).toBe('Shipped');
    expect(mapLegacyStatus('Cancelled')).toBe('Cancelled');
    expect(mapLegacyStatus('Ready for Shipment')).toBe('Ready for Shipment');
  });
  it('maps legacy aliases into the online flow', () => {
    expect(mapLegacyStatus('Crafting')).toBe('Processing');
    expect(mapLegacyStatus('In Production')).toBe('Processing');
    expect(mapLegacyStatus('Confirmed')).toBe('Processing');
    expect(mapLegacyStatus('Payment Confirmed')).toBe('Processing');
    expect(mapLegacyStatus('Ready for Pickup')).toBe('Ready for Shipment');
    expect(mapLegacyStatus('Completed')).toBe('Delivered');
  });
});

describe('orderStatus — stageIndex (post-payment 4-stage flow)', () => {
  it('maps the canonical stages to 0..3', () => {
    expect(stageIndex('Processing')).toBe(0);
    expect(stageIndex('Ready for Shipment')).toBe(1);
    expect(stageIndex('Shipped')).toBe(2);
    expect(stageIndex('Delivered')).toBe(3);
  });
  it('returns -1 for cancelled and for not-yet-paid', () => {
    expect(stageIndex('Cancelled')).toBe(-1);
    expect(stageIndex('Awaiting Payment')).toBe(-1);
  });
  it('folds legacy statuses into the flow', () => {
    expect(stageIndex('Order Placed')).toBe(0);        // → Processing
    expect(stageIndex('Payment Confirmed')).toBe(0);   // → Processing
    expect(stageIndex('Ready for Pickup')).toBe(1);    // → Ready for Shipment
    expect(stageIndex('Completed')).toBe(3);           // → Delivered
  });
  it('defaults unknown/empty to stage 0 (Processing)', () => {
    expect(stageIndex('')).toBe(0);
    expect(stageIndex('Whatever')).toBe(0);
  });
});

describe('orderStatus — ALLOWED_TRANSITIONS (business rules)', () => {
  it('Delivered is terminal (no transitions)', () => {
    expect(ALLOWED_TRANSITIONS['Delivered']).toEqual([]);
  });
  it('Cancel is allowed before delivery, NOT after', () => {
    expect(ALLOWED_TRANSITIONS['Awaiting Payment']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Processing']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Ready for Shipment']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Shipped']).toContain('Cancelled');
    expect(ALLOWED_TRANSITIONS['Delivered']).not.toContain('Cancelled');
  });
  it('follows the online path Processing→Ready for Shipment→Shipped→Delivered', () => {
    expect(ALLOWED_TRANSITIONS['Processing']).toContain('Ready for Shipment');
    expect(ALLOWED_TRANSITIONS['Ready for Shipment']).toContain('Shipped');
    expect(ALLOWED_TRANSITIONS['Shipped']).toContain('Delivered');
  });
  it('STAGE_FLOW is the 4 canonical post-payment stages in order', () => {
    expect(STAGE_FLOW).toEqual(['Processing', 'Ready for Shipment', 'Shipped', 'Delivered']);
  });
});

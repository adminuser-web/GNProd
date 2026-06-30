import { describe, it, expect } from 'vitest';
import { buildUpiUri, hasUpiConfigured } from './upi';

describe('upi — buildUpiUri', () => {
  it('builds a valid upi intent with amount to 2dp + INR + note', () => {
    const uri = buildUpiUri({ payeeVpa: 'grainood@okhdfc', payeeName: 'GRAINOOD', amount: 14999, note: 'Order GRN-1' });
    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=grainood%40okhdfc');
    expect(uri).toContain('am=14999.00');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('tn=Order+GRN-1');
  });
  it('returns empty string when no payee VPA (graceful fallback)', () => {
    expect(buildUpiUri({ payeeVpa: '', payeeName: 'X', amount: 100 })).toBe('');
  });
  it('rounds amount to 2 decimals', () => {
    expect(buildUpiUri({ payeeVpa: 'a@b', payeeName: 'X', amount: 100.005 })).toContain('am=100.01');
  });
});

describe('upi — hasUpiConfigured', () => {
  it('true only for a well-formed vpa', () => {
    expect(hasUpiConfigured('grainood@okhdfc')).toBe(true);
    expect(hasUpiConfigured('')).toBe(false);
    expect(hasUpiConfigured(undefined)).toBe(false);
    expect(hasUpiConfigured('notavpa')).toBe(false);
  });
});

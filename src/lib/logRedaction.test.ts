import { describe, it, expect } from 'vitest';
import { scrubArg, maskString, isSensitiveKey } from './logRedaction';

describe('maskString', () => {
  it('masks email addresses', () => {
    expect(maskString('contact sai@grainood.com now')).toBe('contact s***@*** now');
  });

  it('masks phone numbers keeping last 2 digits', () => {
    const out = maskString('call +91 89395 68005');
    expect(out).not.toContain('89395');
    expect(out).toContain('05');
  });

  it('redacts JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1.eyJyb2xlIjoiYW5vbi.abc123XYZ_def';
    expect(maskString(`token=${jwt}`)).toBe('token=[redacted-jwt]');
  });

  it('redacts API keys (resend / supabase / stripe style)', () => {
    expect(maskString('re_ABCdef123456')).toBe('[redacted-key]');
    expect(maskString('sb_secret_aaaaaaaa')).toBe('[redacted-key]');
    expect(maskString('sk_live_XYZ99999')).toBe('[redacted-key]');
  });

  it('redacts bearer tokens', () => {
    expect(maskString('Authorization: Bearer grainood-hook-2026')).toBe('Authorization: Bearer [redacted]');
  });

  it('redacts long hex secrets', () => {
    const hex = 'a'.repeat(40);
    expect(maskString(hex)).toBe('[redacted-secret]');
  });

  it('leaves short numbers (prices) alone', () => {
    expect(maskString('total 40000')).toBe('total 40000');
  });
});

describe('isSensitiveKey', () => {
  it('flags PII keys', () => {
    for (const k of ['name', 'fullName', 'phone', 'email', 'address', 'line1', 'pincode', 'dob']) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });
  it('flags secret keys', () => {
    for (const k of ['password', 'apiKey', 'Authorization', 'service_role_key', 'accessToken']) {
      expect(isSensitiveKey(k)).toBe(true);
    }
  });
  it('does NOT flag catalog fields', () => {
    for (const k of ['productName', 'brandName', 'seriesName', 'price', 'status', 'id']) {
      expect(isSensitiveKey(k)).toBe(false);
    }
  });
});

describe('scrubArg', () => {
  it('redacts sensitive object keys, keeps others', () => {
    const order = {
      id: 'GRN-1',
      status: 'Order Placed',
      customer: { name: 'Sai Lokesh', phone: '9876543210', email: 'sai@x.com' },
      shippingDetails: { address: '12/42 F Type', city: 'Chennai', pincode: '600049' },
      total: 40000,
    };
    const out = scrubArg(order) as any;
    expect(out.id).toBe('GRN-1');
    expect(out.status).toBe('Order Placed');
    expect(out.total).toBe(40000);
    expect(out.customer.name).toBe('[redacted]');
    expect(out.customer.phone).toBe('[redacted]');
    expect(out.customer.email).toBe('[redacted]');
    expect(out.shippingDetails.address).toBe('[redacted]');
    expect(out.shippingDetails.pincode).toBe('[redacted]');
    expect(out.shippingDetails.city).toBe('Chennai'); // city is not redacted
  });

  it('masks PII embedded in strings (non-sensitive keys)', () => {
    const out = scrubArg({ note: 'ping sai@x.com or +91 89395 68005' }) as any;
    expect(out.note).toContain('s***@***');
    expect(out.note).not.toContain('89395');
  });

  it('handles Error objects with masked message', () => {
    const out = scrubArg(new Error('failed for sai@x.com')) as any;
    expect(out.name).toBe('Error');
    expect(out.message).toBe('failed for s***@***');
  });

  it('handles circular references without throwing', () => {
    const a: any = { name: 'x' };
    a.self = a;
    expect(() => scrubArg(a)).not.toThrow();
  });

  it('passes primitives through', () => {
    expect(scrubArg(42)).toBe(42);
    expect(scrubArg(true)).toBe(true);
    expect(scrubArg(null)).toBe(null);
  });
});

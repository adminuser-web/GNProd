import { describe, it, expect } from 'vitest';
import { buildOrderEmail, buildGmailComposeUrl } from './emailTemplates';

const order = {
  customerName: 'Rahul D.',
  shortId: 'GRN-20260630-AB12',
  total: 14999,
  items: [{ productName: 'Debutant Standard', quantity: 1, lineTotal: 14999 }],
};

describe('emailTemplates — buildOrderEmail', () => {
  it('payment_request includes the order id, total and the pasted link', () => {
    const { subject, body } = buildOrderEmail('payment_request', order, { paymentLink: 'https://pay.example.com/abc', brandName: 'Grainood' });
    expect(subject).toContain('GRN-20260630-AB12');
    expect(body).toContain('₹14,999');
    expect(body).toContain('https://pay.example.com/abc');
    expect(body).toContain('Debutant Standard');
  });
  it('payment_received subject signals processing', () => {
    const { subject, body } = buildOrderEmail('payment_received', order, { brandName: 'Grainood' });
    expect(subject.toLowerCase()).toContain('payment received');
    expect(body).toContain('processing');
  });
  it('summarises long item lists rather than dumping everything', () => {
    const many = { ...order, items: Array.from({ length: 20 }, (_, i) => ({ productName: `Bat ${i}`, quantity: 1, lineTotal: 100 })) };
    const { body } = buildOrderEmail('payment_request', many, { paymentLink: 'https://x.y' });
    expect(body).toMatch(/and \d+ more item/);
  });
});

describe('emailTemplates — buildGmailComposeUrl', () => {
  const url = buildGmailComposeUrl({ sendFrom: 'admin@grainood.com', to: 'rahul@example.com', subject: 'Hi there', body: 'Line1\nLine2' });
  it('targets the configured account with authuser (encoded email)', () => {
    expect(url).toContain('authuser=admin%40grainood.com');
  });
  it('is a Gmail compose url', () => {
    expect(url.startsWith('https://mail.google.com/mail/?')).toBe(true);
    expect(url).toContain('view=cm');
    expect(url).toContain('fs=1');
  });
  it('encodes recipient, subject and newlines in body', () => {
    expect(url).toContain('to=rahul%40example.com');
    expect(url).toContain('su=Hi%20there');
    expect(url).toContain('%0A'); // encoded newline
  });
});

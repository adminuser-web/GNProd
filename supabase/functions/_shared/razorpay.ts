// Razorpay server helpers — Order creation + HMAC signature verification.
// Secrets (RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET) live only in edge
// function env; never shipped to the client.

const RZP_API = 'https://api.razorpay.com/v1';

function basicAuth(keyId: string, keySecret: string): string {
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export async function createRazorpayOrder(
  keyId: string,
  keySecret: string,
  params: { amountPaise: number; currency?: string; receipt?: string; notes?: Record<string, string> },
): Promise<RazorpayOrder> {
  const res = await fetch(`${RZP_API}/orders`, {
    method: 'POST',
    headers: { Authorization: basicAuth(keyId, keySecret), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes || {},
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`razorpay order create failed ${res.status}: ${t.slice(0, 200)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Verify the checkout callback signature: HMAC(order_id|payment_id) == signature. */
export async function verifyPaymentSignature(
  keySecret: string,
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return timingSafeEqual(expected, signature);
}

/** Verify a webhook: HMAC(rawBody) == X-Razorpay-Signature. */
export async function verifyWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  return timingSafeEqual(expected, signature);
}

// Razorpay helpers shared by the edge functions.
// Secrets are read from the function environment — NEVER hard-coded or shipped
// to the browser. Set them with:
//   supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=...

export function getRazorpayAuthHeader(): string {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  }
  return 'Basic ' + btoa(`${keyId}:${keySecret}`);
}

const encoder = new TextEncoder();

function hexFromBuffer(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a Razorpay webhook signature: HMAC-SHA256 of the raw request body,
 * keyed with RAZORPAY_WEBHOOK_SECRET, compared (constant-time) to the
 * `x-razorpay-signature` header. Returns true only on an exact match.
 *
 * IMPORTANT: pass the RAW request body string (do not JSON.parse first).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!secret || !signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = hexFromBuffer(sigBuf);

  // Constant-time compare.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface CreatePaymentLinkInput {
  amountPaise: number;
  orderId: string;
  receiptNumber?: string;
  description: string;
  customer: { name?: string; email?: string; contact?: string };
  callbackUrl?: string;
}

/**
 * Create a Razorpay Payment Link for an order. Amount is in paise and is set
 * SERVER-SIDE from the order total — never trust a client-supplied amount.
 * The order id is stored in `notes.order_id` and `reference_id` so the webhook
 * can map the payment back to the order.
 */
export async function createPaymentLink(input: CreatePaymentLinkInput) {
  const body = {
    amount: input.amountPaise,
    currency: 'INR',
    accept_partial: false,
    reference_id: input.orderId,
    description: input.description,
    customer: {
      name: input.customer.name || undefined,
      email: input.customer.email || undefined,
      contact: input.customer.contact || undefined,
    },
    notify: { sms: false, email: !!input.customer.email },
    reminder_enable: true,
    notes: { order_id: input.orderId, receipt: input.receiptNumber || '' },
    callback_url: input.callbackUrl || undefined,
    callback_method: input.callbackUrl ? 'get' : undefined,
  };

  const res = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay error: ${data?.error?.description || res.statusText}`);
  }
  return data as { id: string; short_url: string; status: string };
}

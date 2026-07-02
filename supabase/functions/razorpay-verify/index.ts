// Edge function: razorpay-verify
//
// Called by the browser after Razorpay Checkout succeeds. Verifies the payment
// signature server-side (HMAC with the key secret) and — only if valid — flips
// the pending order to PAID / Processing. Idempotent.
//
// Deploy:  supabase functions deploy razorpay-verify --no-verify-jwt
// Secrets: RAZORPAY_KEY_SECRET (SUPABASE_* injected).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyPaymentSignature, fetchRazorpayPayment } from '../_shared/razorpay.ts';

const log = (m: string) => console.log(`[razorpay-verify] ${m}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ ok: false, error: 'not_configured' }, 500);

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.razorpay_order_id ?? '');
    const paymentId = String(body?.razorpay_payment_id ?? '');
    const signature = String(body?.razorpay_signature ?? '');
    if (!orderId || !paymentId || !signature) return json({ ok: false, error: 'bad_request' }, 400);

    // 1) Signature must match (proves this payment belongs to this order).
    const valid = await verifyPaymentSignature(keySecret, orderId, paymentId, signature);
    if (!valid) { log('invalid signature'); return json({ ok: false, error: 'invalid_signature' }, 400); }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row } = await admin
      .from('orders').select('id, data, status')
      .eq('data->>razorpayOrderId', orderId).maybeSingle();
    if (!row) { log('order not found'); return json({ ok: false, error: 'not_found' }, 404); }

    const d: any = row.data ?? {};
    // Idempotent: if already paid, just return ok.
    if (d.payment?.status === 'confirmed') return json({ ok: true, orderId: row.id, already: true });

    // 2) Defence-in-depth: re-fetch the payment from Razorpay and confirm it was
    //    actually captured/authorized FOR THIS ORDER and the EXACT amount we set.
    const expectedPaise = Math.round(Number(d.totalPrice ?? d.pricing?.total ?? 0)) * 100;
    let payment;
    try {
      payment = await fetchRazorpayPayment(keyId, keySecret, paymentId);
    } catch (e) {
      // Transient API issue — don't confirm here; the webhook will reconcile.
      log(`payment fetch failed: ${(e as Error).message}`);
      return json({ ok: false, error: 'verify_deferred' }, 202);
    }
    if (payment.order_id !== orderId) { log('payment/order mismatch'); return json({ ok: false, error: 'order_mismatch' }, 400); }
    if (!['captured', 'authorized'].includes(payment.status)) { log(`payment not captured: ${payment.status}`); return json({ ok: false, error: 'not_captured' }, 402); }
    if (Number(payment.amount) !== expectedPaise) { log(`amount mismatch got=${payment.amount} expected=${expectedPaise}`); return json({ ok: false, error: 'amount_mismatch' }, 400); }

    const nowIso = new Date().toISOString();
    const newData = {
      ...d,
      status: 'Processing',
      payment: { ...(d.payment || {}), status: 'confirmed', paidAmount: Number(payment.amount) / 100,
                 gateway: 'razorpay', razorpayOrderId: orderId, razorpayPaymentId: paymentId, paidAt: nowIso },
      paymentStatus: 'confirmed',
      timeline: [...(d.timeline || []),
        { status: 'Processing', timestamp: nowIso, changedBy: 'razorpay', note: 'Payment received — order confirmed' }],
      updatedAt: nowIso,
    };
    const { error } = await admin.from('orders').update({ data: newData, status: 'Processing' }).eq('id', row.id);
    if (error) { log(`update failed ${error.message}`); return json({ ok: false, error: 'server_error' }, 500); }

    log(`order ${row.id} paid`);
    return json({ ok: true, orderId: row.id });
  } catch (e) {
    log(`unhandled ${(e as Error).message}`);
    return json({ ok: false, error: 'server_error' }, 500);
  }
});

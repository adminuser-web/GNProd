// Edge function: razorpay-webhook
//
// Server-to-server reliability net. Razorpay POSTs payment events here; we
// verify the signature over the RAW body, dedupe via payment_events, and mark
// the order paid even if the customer closed the tab before razorpay-verify ran.
//
// Deploy:  supabase functions deploy razorpay-webhook --no-verify-jwt
// Secrets: RAZORPAY_WEBHOOK_SECRET (SUPABASE_* injected).
// Configure in Razorpay Dashboard → Webhooks: events payment.captured, order.paid.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWebhookSignature } from '../_shared/razorpay.ts';

const log = (m: string) => console.log(`[razorpay-webhook] ${m}`);

Deno.serve(async (req) => {
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) return json({ ok: false }, 500);

    const raw = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    if (!signature || !(await verifyWebhookSignature(secret, raw, signature))) {
      log('invalid signature');
      return json({ ok: false }, 401);
    }

    const evt = JSON.parse(raw);
    const type: string = evt?.event ?? '';
    const payment = evt?.payload?.payment?.entity;
    const rzpOrderId: string | undefined = payment?.order_id ?? evt?.payload?.order?.entity?.id;
    const eventId: string = evt?.id || `${type}:${payment?.id ?? rzpOrderId ?? Math.random()}`;

    const admin = createClient(supabaseUrl, serviceKey);

    // Idempotency — record the event; skip if we've seen it.
    const { error: dupErr } = await admin.from('payment_events').insert({ event_id: eventId, event_type: type });
    if (dupErr) { log(`duplicate/ignored event ${type}`); return json({ ok: true, dedup: true }); }

    if (!['payment.captured', 'order.paid'].includes(type) || !rzpOrderId) {
      return json({ ok: true, ignored: true });
    }

    const { data: row } = await admin
      .from('orders').select('id, data').eq('data->>razorpayOrderId', rzpOrderId).maybeSingle();
    if (!row) { log('order not found for webhook'); return json({ ok: true, no_order: true }); }

    const d: any = row.data ?? {};
    if (d.payment?.status === 'confirmed') return json({ ok: true, already: true });

    // Confirm the captured amount matches what we charged (webhook is signed, but
    // guard against any amount discrepancy before marking the order paid).
    const expectedPaise = Math.round(Number(d.totalPrice ?? d.pricing?.total ?? 0)) * 100;
    const paidPaise = Number(payment?.amount ?? 0);
    if (paidPaise && expectedPaise && paidPaise !== expectedPaise) {
      log(`webhook amount mismatch got=${paidPaise} expected=${expectedPaise}`);
      return json({ ok: true, amount_mismatch: true });
    }

    const nowIso = new Date().toISOString();
    const newData = {
      ...d,
      status: 'Processing',
      payment: { ...(d.payment || {}), status: 'confirmed', paidAmount: (paidPaise || expectedPaise) / 100,
                 gateway: 'razorpay', razorpayOrderId: rzpOrderId, razorpayPaymentId: payment?.id, paidAt: nowIso },
      paymentStatus: 'confirmed',
      timeline: [...(d.timeline || []),
        { status: 'Processing', timestamp: nowIso, changedBy: 'razorpay-webhook', note: 'Payment confirmed (webhook)' }],
      updatedAt: nowIso,
    };
    await admin.from('orders').update({ data: newData, status: 'Processing' }).eq('id', row.id);
    log(`order ${row.id} confirmed via webhook`);
    return json({ ok: true });
  } catch (e) {
    log(`unhandled ${(e as Error).message}`);
    return json({ ok: false }, 500);
  }
});

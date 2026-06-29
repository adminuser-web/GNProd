// Edge function: razorpay-webhook
//
// Razorpay calls this server-to-server when a payment link is paid. It is the
// ONLY trusted path that may mark an order as paid — the browser never can
// (RLS blocks it). Flow:
//   1. Verify the HMAC signature against the RAW body (reject forgeries).
//   2. Idempotency: record the Razorpay event id; ignore duplicates/retries.
//   3. On `payment_link.paid`, mark the matching order's payment confirmed,
//      write an audit log, and notify the customer.
//
// Deploy:  supabase functions deploy razorpay-webhook --no-verify-jwt
//   (--no-verify-jwt because Razorpay can't send a Supabase JWT; the HMAC
//    signature is our authentication instead.)
// Secrets: RAZORPAY_WEBHOOK_SECRET (+ SUPABASE_URL / SERVICE_ROLE auto-injected)
// Razorpay dashboard: add this function URL as a webhook for `payment_link.paid`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWebhookSignature } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Raw body is required for signature verification.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const eventId = req.headers.get('x-razorpay-event-id') ?? crypto.randomUUID();

  // Idempotency: if we've already recorded this event, acknowledge and stop.
  const { error: insErr } = await admin
    .from('payment_events')
    .insert({ id: eventId, raw: rawBody.slice(0, 20000) });
  if (insErr) {
    // Unique violation = already processed → return 200 so Razorpay stops retrying.
    return new Response('Already processed', { status: 200 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return new Response('Bad JSON', { status: 400 }); }

  const event = payload?.event as string;

  if (event === 'payment_link.paid') {
    const linkEntity = payload?.payload?.payment_link?.entity ?? {};
    const paymentEntity = payload?.payload?.payment?.entity ?? {};
    const orderId = linkEntity?.notes?.order_id || linkEntity?.reference_id;

    if (orderId) {
      const { data: row } = await admin
        .from('orders').select('id, data').eq('id', orderId).single();

      if (row) {
        const data = (row.data ?? {}) as Record<string, any>;
        const already = data.payment?.status === 'confirmed';

        const payment = {
          ...(data.payment ?? {}),
          status: 'confirmed',
          gateway: 'razorpay',
          gatewayPaymentId: paymentEntity?.id || data.payment?.gatewayPaymentId,
          method: paymentEntity?.method || data.payment?.method,
          paidAmount: (paymentEntity?.amount ?? linkEntity?.amount_paid ?? 0) / 100,
          confirmedAt: new Date().toISOString(),
          confirmedBy: 'razorpay-webhook',
        };

        await admin
          .from('orders')
          .update({
            data: { ...data, payment },
            status: data.status && data.status !== 'Cancelled' ? 'Payment Confirmed' : data.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (!already) {
          // Audit + customer notification (mirrors orderService.updatePaymentStatus).
          await admin.from('audit_logs').insert({
            action: 'payment_confirmed',
            entity_type: 'order',
            entity_id: orderId,
            actor_name: 'Razorpay',
            after: { paymentStatus: 'confirmed', paidAmount: payment.paidAmount },
          });
          if (data.userId) {
            await admin.from('notifications').insert({
              user_id: data.userId,
              role_target: 'customer',
              type: 'payment_confirmed',
              title: 'Payment Confirmed',
              message: `Your payment for order ${data.receiptNumber || orderId} has been received. Thank you!`,
              read: false,
            });
          }
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
});

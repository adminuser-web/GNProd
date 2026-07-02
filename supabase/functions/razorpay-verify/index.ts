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
import { verifyPaymentSignature } from '../_shared/razorpay.ts';

const log = (m: string) => console.log(`[razorpay-verify] ${m}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return json({ ok: false, error: 'not_configured' }, 500);

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.razorpay_order_id ?? '');
    const paymentId = String(body?.razorpay_payment_id ?? '');
    const signature = String(body?.razorpay_signature ?? '');
    if (!orderId || !paymentId || !signature) return json({ ok: false, error: 'bad_request' }, 400);

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

    const nowIso = new Date().toISOString();
    const newData = {
      ...d,
      status: 'Processing',
      payment: { ...(d.payment || {}), status: 'confirmed', paidAmount: d.totalPrice ?? d.pricing?.total ?? 0,
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

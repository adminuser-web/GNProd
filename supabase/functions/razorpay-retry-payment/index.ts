// Edge function: razorpay-retry-payment
//
// Lets the order OWNER re-open Razorpay Checkout for an existing
// "Awaiting Payment" order (abandoned/dismissed checkout) without
// re-configuring the bat. Reuses the stored Razorpay order when it is still
// payable; otherwise creates a fresh one for the SAME server-fixed amount and
// re-points the order row so razorpay-verify / razorpay-webhook still match.
//
// Deploy:  supabase functions deploy razorpay-retry-payment
//          (JWT verification stays ON — the caller must be the order owner.)
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (SUPABASE_* injected).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createRazorpayOrder, fetchRazorpayOrder } from '../_shared/razorpay.ts';

const log = (m: string) => console.log(`[razorpay-retry-payment] ${m}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ ok: false, error: 'not_configured' }, 500);

    // Caller must be the order owner (guest anon session or logged-in user).
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.orderId ?? '').trim();
    if (!orderId) return json({ ok: false, error: 'bad_request' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row } = await admin
      .from('orders').select('id, user_id, status, total, data')
      .eq('id', orderId).maybeSingle();
    // Same response for missing and not-owned — don't leak order existence.
    if (!row || row.user_id !== user.id) return json({ ok: false, error: 'not_found' }, 404);

    const d: any = row.data ?? {};
    if (d.payment?.status === 'confirmed') return json({ ok: false, error: 'already_paid' }, 409);
    if ((row.status || d.status) !== 'Awaiting Payment') return json({ ok: false, error: 'not_payable' }, 409);

    const amountPaise = Math.round(Number(d.totalPrice ?? d.pricing?.total ?? row.total ?? 0)) * 100;
    if (amountPaise <= 0) return json({ ok: false, error: 'invalid_amount' }, 400);

    // Reuse the original Razorpay order when it is still open for payment.
    let rzpOrderId: string | null = null;
    const existing = String(d.razorpayOrderId ?? d.payment?.razorpayOrderId ?? '');
    if (existing) {
      try {
        const rzpOrder = await fetchRazorpayOrder(keyId, keySecret, existing);
        if (rzpOrder.status === 'paid') return json({ ok: false, error: 'already_paid' }, 409);
        if (['created', 'attempted'].includes(rzpOrder.status) && Number(rzpOrder.amount) === amountPaise) {
          rzpOrderId = rzpOrder.id;
        }
      } catch (e) {
        log(`existing order fetch failed (${existing}): ${(e as Error).message}`);
      }
    }

    // Otherwise mint a fresh Razorpay order for the same fixed amount and
    // re-point the row — verify/webhook look orders up by data->>razorpayOrderId.
    if (!rzpOrderId) {
      const rzp = await createRazorpayOrder(keyId, keySecret, {
        amountPaise,
        currency: 'INR',
        receipt: orderId,
        notes: { orderId, retry: 'true' },
      });
      rzpOrderId = rzp.id;
      const newData = {
        ...d,
        razorpayOrderId: rzp.id,
        payment: { ...(d.payment || {}), status: 'pending', gateway: 'razorpay', razorpayOrderId: rzp.id },
        updatedAt: new Date().toISOString(),
      };
      const { error: updErr } = await admin.from('orders').update({ data: newData }).eq('id', row.id);
      if (updErr) { log(`repoint failed: ${updErr.message}`); return json({ ok: false, error: 'server_error' }, 500); }
      log(`order ${row.id} re-pointed to fresh rzp order ${rzp.id}`);
    }

    const contact = d.customer ?? d.shippingDetails ?? {};
    return json({
      ok: true,
      orderId: row.id,
      razorpayOrderId: rzpOrderId,
      amount: amountPaise,
      currency: 'INR',
      keyId,
      prefill: { name: contact.name, email: contact.email, contact: contact.phone },
    });
  } catch (e) {
    log(`unhandled: ${(e as Error).message}`);
    return json({ ok: false, error: 'server_error' }, 500);
  }
});

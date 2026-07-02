// Edge function: track-order (PUBLIC)
//
// Lets a customer (incl. guests) look up their order status by { orderId, email }
// without a login. The order is loaded with the SERVICE ROLE and released only
// when the supplied email matches the order's email — so anon callers can never
// read the orders table directly and email enumeration returns a generic error.
//
// Returns a SAFE, PII-minimal view: status, timeline, item names, totals,
// payment status, shipment tracking. It never returns the customer's address,
// phone, or full contact details.
//
// Deploy:  supabase functions deploy track-order --no-verify-jwt
//          (--no-verify-jwt because this endpoint is intentionally public.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const log = (msg: string) => console.log(`[track-order] ${msg}`);

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const NOT_FOUND = { ok: false, error: 'not_found' };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.orderId ?? '').trim();
    const email = norm(body?.email);
    if (!orderId || !email) return json({ ok: false, error: 'bad_request' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Rate limit by client IP (max 30 lookups / 10 min) to curb enumeration.
    // Fail-open if the RPC is unavailable so legit lookups never break.
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const { data: allowed, error: rlErr } = await admin.rpc('rl_check', {
      p_bucket: 'track', p_identifier: ip, p_max: 30, p_window: '10 minutes',
    });
    if (!rlErr && allowed === false) return json({ ok: false, error: 'rate_limited' }, 429);

    // Match on id OR the human receiptNumber so either works for the customer.
    let row: any = null;
    {
      const byId = await admin.from('orders').select('id, status, total, data, created_at').eq('id', orderId).maybeSingle();
      row = byId.data;
      if (!row) {
        const byReceipt = await admin
          .from('orders').select('id, status, total, data, created_at')
          .eq('data->>receiptNumber', orderId).limit(1).maybeSingle();
        row = byReceipt.data;
      }
    }
    if (!row) { log('miss'); return json(NOT_FOUND, 404); }

    const data = (row.data ?? {}) as Record<string, any>;
    const orderEmail = norm(data.customer?.email || data.shippingDetails?.email || data.customerInfo?.email);
    if (!orderEmail || orderEmail !== email) { log('email mismatch'); return json(NOT_FOUND, 404); }

    // Build a SAFE subset — no address/phone/email echoed back.
    const items = (data.items ?? []).map((it: any) => ({
      name: it.productName || it.product?.name || 'Custom bat',
      qty: it.quantity || 1,
      image: it.product?.imageUrl || null,
    }));
    const timeline = (data.timeline ?? []).map((t: any) => ({
      status: t.status,
      timestamp: t.timestamp,
      note: t.note || null,
    }));
    const shipment = data.shipment
      ? { carrier: data.shipment.carrier || null, trackingNumber: data.shipment.trackingNumber || null, trackingUrl: data.shipment.trackingUrl || null }
      : null;

    return json({
      ok: true,
      order: {
        shortId: data.receiptNumber || row.id,
        status: data.status || row.status || 'Order Placed',
        paymentStatus: data.payment?.status || data.paymentStatus || 'pending',
        total: Number(data.pricing?.total ?? data.totalPrice ?? row.total ?? 0),
        currency: data.pricing?.currency || 'INR',
        createdAt: data.createdAt || row.created_at || null,
        customerFirstName: (data.customer?.name || data.shippingDetails?.name || '').split(' ')[0] || null,
        items,
        timeline,
        shipment,
        cancellation: data.cancellation ? { reason: data.cancellation.reason || null } : null,
      },
    });
  } catch (_e) {
    log('unhandled error');
    return json({ ok: false, error: 'error' }, 500);
  }
});

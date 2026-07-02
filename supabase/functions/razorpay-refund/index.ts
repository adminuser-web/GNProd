// Edge function: razorpay-refund (ADMIN ONLY)
//
// Issues a full refund for a paid order via the Razorpay API, then records the
// refund on the order. Called when an admin cancels a paid order. The order's
// status change to "Cancelled" is done separately by the client (cancelOrder).
//
// Deploy:  supabase functions deploy razorpay-refund
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (SUPABASE_* injected).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createRazorpayRefund } from '../_shared/razorpay.ts';

const log = (m: string) => console.log(`[razorpay-refund] ${m}`);

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

    // Admins only — and enforce MFA at the data layer. is_admin() (SECURITY
    // DEFINER) returns true only when the caller is an admin AND their session
    // is MFA-elevated (aal2) if they have a verified factor. Evaluated in the
    // caller's own context via their JWT, so a password-only session can't refund.
    const authHeader = req.headers.get('Authorization') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'unauthorized' }, 401);
    const { data: isAdmin, error: adminErr } = await userClient.rpc('is_admin');
    if (adminErr || isAdmin !== true) return json({ ok: false, error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.orderId ?? '');
    if (!orderId) return json({ ok: false, error: 'bad_request' }, 400);

    const { data: row } = await admin.from('orders').select('id, data').eq('id', orderId).maybeSingle();
    if (!row) return json({ ok: false, error: 'not_found' }, 404);
    const d: any = row.data ?? {};

    if (d.payment?.status !== 'confirmed') return json({ ok: false, error: 'not_paid' }, 409);
    if (d.refund?.status) return json({ ok: true, already: true, refund: d.refund }); // idempotent

    const paymentId = d.payment?.razorpayPaymentId;
    if (!paymentId) return json({ ok: false, error: 'no_payment_id' }, 409);

    const amount = Number(d.totalPrice ?? d.pricing?.total ?? 0);
    const refund = await createRazorpayRefund(keyId, keySecret, paymentId, amount > 0 ? amount * 100 : undefined);

    const nowIso = new Date().toISOString();
    const newData = {
      ...d,
      refund: { id: refund.id, amount: (refund.amount ?? amount * 100) / 100, status: refund.status || 'processed', at: nowIso },
      payment: { ...(d.payment || {}), status: 'refunded' },
      updatedAt: nowIso,
    };
    await admin.from('orders').update({ data: newData }).eq('id', row.id);

    log(`refunded order ${row.id} refund=${refund.id}`);
    return json({ ok: true, refund: { id: refund.id, amount: (refund.amount ?? amount * 100) / 100, status: refund.status } });
  } catch (e) {
    log(`unhandled ${(e as Error).message}`);
    return json({ ok: false, error: 'refund_failed', message: (e as Error).message?.slice(0, 120) }, 502);
  }
});

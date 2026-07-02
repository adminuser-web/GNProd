// Edge function: razorpay-create-order
//
// Recomputes the order amount SERVER-SIDE from persisted product data (never
// trusts the client), creates a Razorpay order, inserts a PENDING order row,
// and returns the checkout params. The customer then pays in Razorpay Checkout
// (GPay / any UPI app / card) — the merchant UPI ID is never exposed.
//
// Deploy:  supabase functions deploy razorpay-create-order
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (SUPABASE_* injected).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { computePrice, SRule, SCode, SProduct } from '../_shared/pricing.ts';
import { createRazorpayOrder } from '../_shared/razorpay.ts';

const log = (m: string) => console.log(`[razorpay-create-order] ${m}`);
const round = (n: number) => Math.round(Number(n) || 0);

function genOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GRN-${date}-${rand}`;
}

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

    // Caller identity (guest anon session or logged-in user) → order owner.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    const uid = user?.id ?? null;

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({} as any));
    const items = Array.isArray(body?.items) ? body.items : [];
    const shipping = body?.shipping ?? {};
    const discountCode: string | undefined = body?.discountCode || undefined;
    const expectedTotal = Number(body?.expectedTotal ?? NaN);

    if (!items.length) return json({ ok: false, error: 'empty_cart' }, 400);
    if (!shipping.email || !shipping.name || !shipping.phone || !shipping.address) {
      return json({ ok: false, error: 'missing_shipping' }, 400);
    }

    // Load authoritative product data → sub-series lookup by id.
    const { data: prodRows, error: prodErr } = await admin.from('products').select('slug, data');
    if (prodErr) { log('products load failed'); return json({ ok: false, error: 'server_error' }, 500); }
    const subMap = new Map<string, { sub: any; seriesSlug: string }>();
    for (const row of prodRows ?? []) {
      const d: any = row.data ?? {};
      const subs = Array.isArray(d.subSeries) && d.subSeries.length ? d.subSeries : [d];
      for (const sub of subs) {
        if (sub?.id) subMap.set(String(sub.id), { sub, seriesSlug: d.slug || row.slug });
      }
    }

    // Load pricing rules + (optional) discount code, server-side.
    let rules: SRule[] = [];
    try {
      const { data: ruleRows } = await admin.from('pricing_rules').select('*');
      rules = (ruleRows ?? []).map((r: any) => (r.data ? { id: r.id, ...r.data } : r)) as SRule[];
    } catch { rules = []; }
    let codes: SCode[] = [];
    let appliedCode: string | undefined;   // persisted on the order for redemption counting
    let codeMaxUses: number | undefined;   // F-02: optional per-code redemption cap
    if (discountCode) {
      try {
        const { data: c } = await admin.from('discount_codes').select('*').ilike('code', discountCode).maybeSingle();
        if (c) {
          const cd: any = c.data ? { code: c.code ?? c.data.code, ...c.data } : c;
          codes = [{
            code: cd.code, type: cd.type, amount: Number(cd.amount),
            active: cd.active !== false,
            expiresAt: cd.expiresAt ?? cd.expires_at ?? undefined,
          }];
          appliedCode = String(cd.code ?? discountCode);
          const mu = cd.maxUses ?? cd.max_uses;
          if (mu !== undefined && mu !== null && mu !== '') codeMaxUses = Number(mu);
        }
      } catch { codes = []; }
    }

    // F-02: enforce the redemption cap server-side (counts confirmed-payment
    // orders that used this code). Codes without maxUses stay unlimited.
    if (appliedCode && codeMaxUses !== undefined && Number.isFinite(codeMaxUses)) {
      try {
        const { data: used } = await admin.rpc('discount_redemptions', { p_code: appliedCode });
        if (Number(used ?? 0) >= codeMaxUses) {
          return json({ ok: false, error: 'code_exhausted' }, 409);
        }
      } catch { /* fail-open on RPC hiccup — don't block legit checkout */ }
    }

    // Recompute each line authoritatively.
    let grandTotal = 0;
    const snapItems: any[] = [];
    for (const it of items) {
      const entry = subMap.get(String(it.productId));
      if (!entry) { log(`unknown product ${it.productId}`); return json({ ok: false, error: 'product_unavailable' }, 409); }
      const sub = entry.sub;
      const base = Number(sub.price ?? sub.basePrice ?? 0);
      const product: SProduct = {
        id: sub.id, slug: entry.seriesSlug, price: base, activeSubSeriesId: sub.id,
        attributes: sub.attributes, customizationGroups: sub.customizationGroups,
      };
      const selections: Record<string, string> = it.selections ?? {};
      const res = computePrice(product, selections, { rules, discountCode, availableCodes: codes });
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const unit = round(res.total);
      const lineTotal = unit * qty;
      grandTotal += lineTotal;
      snapItems.push({
        productId: sub.id,
        seriesSlug: entry.seriesSlug,
        productName: it.productName || sub.name || 'Custom bat',
        product: { id: sub.id, name: sub.name, imageUrl: sub.media?.[0] || sub.imageUrl || null },
        selections: it.selections ?? {},
        selectionLabels: it.selectionLabels ?? [],
        quantity: qty,
        basePrice: base,
        unitPrice: unit,
        lineTotal,
      });
    }

    // Reconcile with what the customer saw — never charge a surprising amount.
    if (Number.isFinite(expectedTotal) && Math.abs(grandTotal - expectedTotal) > 1) {
      log(`amount mismatch server=${grandTotal} expected=${expectedTotal}`);
      return json({ ok: false, error: 'price_changed', serverTotal: grandTotal }, 409);
    }
    if (grandTotal <= 0) return json({ ok: false, error: 'invalid_amount' }, 400);

    const orderId = genOrderId();
    const receiptNumber = Math.floor(10000000 + Math.random() * 90000000).toString();

    const rzp = await createRazorpayOrder(keyId, keySecret, {
      amountPaise: grandTotal * 100,
      currency: 'INR',
      receipt: orderId,
      notes: { orderId },
    });

    const nowIso = new Date().toISOString();
    const orderData = {
      userId: uid,
      status: 'Awaiting Payment',
      receiptNumber,
      totalPrice: grandTotal,
      subtotal: grandTotal,
      pricing: { total: grandTotal, currency: 'INR' },
      payment: { status: 'pending', paidAmount: 0, gateway: 'razorpay', razorpayOrderId: rzp.id },
      razorpayOrderId: rzp.id,
      paymentStatus: 'pending',
      fulfillmentMode: 'delivery',
      orderSource: 'website',
      items: snapItems,
      ...(appliedCode ? { discount: { code: appliedCode } } : {}),
      customer: { name: shipping.name, email: shipping.email, phone: shipping.phone },
      shippingDetails: {
        name: shipping.name, email: shipping.email, phone: shipping.phone,
        country: shipping.country, state: shipping.state, city: shipping.city,
        pincode: shipping.pincode, address: shipping.address, notes: shipping.notes || '',
      },
      timeline: [{ status: 'Awaiting Payment', timestamp: nowIso, changedBy: uid, note: 'Checkout started' }],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const { error: insErr } = await admin.from('orders').insert({
      id: orderId, user_id: uid, status: 'Awaiting Payment', total: grandTotal, data: orderData,
    });
    if (insErr) { log(`order insert failed: ${insErr.message}`); return json({ ok: false, error: 'server_error' }, 500); }

    return json({
      ok: true,
      orderId,
      razorpayOrderId: rzp.id,
      amount: grandTotal * 100,
      currency: 'INR',
      keyId,
      prefill: { name: shipping.name, email: shipping.email, contact: shipping.phone },
    });
  } catch (e) {
    log(`unhandled: ${(e as Error).message}`);
    return json({ ok: false, error: 'server_error' }, 500);
  }
});

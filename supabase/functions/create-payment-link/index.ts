// Edge function: create-payment-link
//
// Admin-triggered. Generates a Razorpay Payment Link for an existing order and
// stores the link on the order so it can be sent to the customer (e.g. via
// WhatsApp). The amount is taken from the order in the DB — never from the
// client — so a tampered request can't change what's charged.
//
// Auth model:
//   - The CALLER must be an authenticated admin (verified via their JWT).
//   - Privileged DB reads/writes use the service-role client.
//
// Deploy:  supabase functions deploy create-payment-link
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (+ SUPABASE_URL / SERVICE_ROLE auto-injected)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createPaymentLink } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // 2) Authorize: only admins may generate payment links.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    // 3) Load the order and compute the amount SERVER-SIDE.
    const { orderId } = await req.json();
    if (!orderId) return json({ error: 'orderId required' }, 400);

    const { data: row, error: orderErr } = await admin
      .from('orders').select('id, data, total').eq('id', orderId).single();
    if (orderErr || !row) return json({ error: 'Order not found' }, 404);

    const data = (row.data ?? {}) as Record<string, unknown>;
    const pricing = (data.pricing ?? {}) as Record<string, unknown>;
    const total = Number(
      (pricing.total as number) ?? (data.totalPrice as number) ?? row.total ?? 0,
    );
    if (!total || total <= 0) return json({ error: 'Order total is zero' }, 400);

    const customer = (data.customer ?? data.shippingDetails ?? {}) as Record<string, string>;

    // 4) Create the Razorpay payment link.
    const link = await createPaymentLink({
      amountPaise: Math.round(total * 100),
      orderId,
      receiptNumber: data.receiptNumber as string | undefined,
      description: `Grainood order ${data.receiptNumber || orderId}`,
      customer: { name: customer.name, email: customer.email, contact: customer.phone },
    });

    // 5) Persist link details on the order.
    const payment = {
      ...(data.payment as Record<string, unknown> ?? {}),
      status: 'link_sent',
      gateway: 'razorpay',
      gatewayLinkId: link.id,
      gatewayLinkUrl: link.short_url,
    };
    await admin
      .from('orders')
      .update({ data: { ...data, payment }, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return json({ url: link.short_url, id: link.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

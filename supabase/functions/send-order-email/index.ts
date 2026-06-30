// Edge function: send-order-email
//
// Admin-driven, server-side-only order email. The CLIENT sends ONLY:
//   { orderId, template, paymentLink? }
// It never sends the customer email or any PII, and never calls Resend directly.
//
// This function:
//   1. Verifies the caller's Supabase JWT and that they are an ADMIN.
//   2. Loads the order with the SERVICE ROLE key (bypasses RLS safely).
//   3. Reads the customer email/name FROM the order, server-side only.
//   4. Renders an allow-listed template and sends via Resend (EMAIL_API_KEY secret).
//   5. Returns a generic ok/fail — NO PII in the response or logs.
//
// Deploy:  supabase functions deploy send-order-email
// Secrets: EMAIL_API_KEY (Resend), EMAIL_FROM, optional SITE_URL, BRAND_NAME.
//          SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { EMAIL_TEMPLATES, EmailTemplateId, renderTemplate, OrderSummary } from '../_shared/orderEmailTemplates.ts';

// Non-PII structured logging only (never customer name/email/body/recipient).
const log = (msg: string, orderId?: string) => console.log(`[send-order-email] ${msg}${orderId ? ` order=${orderId}` : ''}`);

function isHttpsUrl(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  try {
    return new URL(s).protocol === 'https:';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'unauthorized' }, 401);

    // 2) Authorize: admins only.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return json({ ok: false, error: 'forbidden' }, 403);

    // 3) Validate inputs.
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    const template = body.template as EmailTemplateId;
    const paymentLink = body.paymentLink;
    if (!orderId) return json({ ok: false, error: 'bad_request' }, 400);
    if (!EMAIL_TEMPLATES.includes(template)) return json({ ok: false, error: 'bad_template' }, 400);
    if (template === 'payment_request' && !isHttpsUrl(paymentLink)) {
      return json({ ok: false, error: 'invalid_link' }, 400);
    }

    // 4) Load the order (service role) and read PII server-side only.
    const { data: row, error: orderErr } = await admin.from('orders').select('id, data').eq('id', orderId).single();
    if (orderErr || !row) {
      log('order not found', orderId);
      return json({ ok: false, error: 'not_found' }, 404);
    }
    const data = (row.data ?? {}) as Record<string, any>;
    const customer = (data.customer ?? data.customerInfo ?? data.shippingDetails ?? {}) as Record<string, string>;
    const recipient = customer.email || data.shippingDetails?.email || '';
    if (!recipient) {
      log('no recipient email', orderId);
      return json({ ok: false, error: 'no_recipient' }, 422);
    }

    const summary: OrderSummary = {
      customerName: customer.name || data.shippingDetails?.name || 'there',
      shortId: data.receiptNumber || row.id,
      total: Number(data.pricing?.total ?? data.totalPrice ?? data.grandTotal ?? 0),
      items: (data.items ?? []).map((it: any) => ({
        name: it.productName || it.product?.name || 'Custom bat',
        qty: it.quantity || 1,
        lineTotal: it.lineTotal ?? (it.unitPrice || it.price || 0) * (it.quantity || 1),
      })),
    };

    const rendered = renderTemplate(template, summary, {
      brand: Deno.env.get('BRAND_NAME') || 'GRAINOOD',
      site: Deno.env.get('SITE_URL') || 'https://grainood.com',
      paymentLink: typeof paymentLink === 'string' ? paymentLink : undefined,
    });
    if (!rendered) return json({ ok: false, error: 'bad_template' }, 400);

    // 5) Send via Resend.
    const apiKey = Deno.env.get('EMAIL_API_KEY');
    const from = Deno.env.get('EMAIL_FROM') || 'Grainood <onboarding@resend.dev>';
    if (!apiKey) {
      log('EMAIL_API_KEY not configured', orderId);
      return json({ ok: false, error: 'not_configured' }, 500);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: recipient, subject: rendered.subject, html: rendered.html }),
    });

    if (!res.ok) {
      // Do not log the provider body (may echo the recipient).
      log(`provider send failed status=${res.status}`, orderId);
      return json({ ok: false, error: 'send_failed' }, 502);
    }

    log(`sent template=${template}`, orderId);
    return json({ ok: true });
  } catch (_e) {
    // Generic — never leak error internals/PII.
    log('unhandled error');
    return json({ ok: false, error: 'error' }, 500);
  }
});

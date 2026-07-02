// Edge function: send-order-email
//
// Automated transactional email for orders, driven by a Supabase Database
// Webhook on public.orders (INSERT + UPDATE). The function inspects the row
// (and old_record on updates) and sends the right Resend email:
//
//   INSERT                          -> customer "order received" + admin alert
//   UPDATE payment -> confirmed     -> customer "payment received / in processing"
//   UPDATE status changed           -> customer "order now <status>"
//
// It can also be invoked manually by an ADMIN (valid admin JWT) with
// { orderId, template } to re-send a specific customer template.
//
// Customer PII is read server-side from the order (service role) and never
// returned to the caller. No PII is logged.
//
// Deploy:  supabase functions deploy send-order-email
// Secrets: RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAILS (comma-sep),
//          optional SITE_URL, BRAND_NAME.
//          SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY injected.
//
// Webhook Authorization header must be `Bearer <SERVICE_ROLE_KEY>`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  renderTemplate,
  renderAdminAlert,
  CUSTOMER_TEMPLATES,
  CustomerTemplateId,
  OrderSummary,
  OrderItemSummary,
} from '../_shared/orderEmailTemplates.ts';

const log = (msg: string, orderId?: string) =>
  console.log(`[send-order-email] ${msg}${orderId ? ` order=${orderId}` : ''}`);

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function rowToSummary(row: any): OrderSummary {
  const data = (row?.data ?? {}) as Record<string, any>;
  const customer = (data.customer ?? data.customerInfo ?? {}) as Record<string, string>;
  const ship = (data.shippingDetails ?? {}) as Record<string, string>;
  const items: OrderItemSummary[] = (data.items ?? []).map((it: any) => {
    const sels = (it.selections ?? [])
      .map((s: any) => (s.type === 'text' && s.valueText ? `${s.groupLabel}: ${s.valueText}` : s.optionLabel))
      .filter(Boolean)
      .join(' / ');
    return {
      name: it.productName || it.product?.name || 'Custom bat',
      qty: it.quantity || 1,
      lineTotal: it.lineTotal ?? (it.unitPrice || it.price || 0) * (it.quantity || 1),
      options: sels || undefined,
    };
  });
  const addr = [ship.address, ship.city, ship.state, ship.pincode].filter(Boolean).join(', ');
  return {
    customerName: customer.name || ship.name || 'there',
    customerEmail: customer.email || ship.email || '',
    customerPhone: customer.phone || ship.phone || '',
    shortId: data.receiptNumber || row.id,
    orderId: row.id,
    status: data.status || row.status || undefined,
    items,
    total: Number(data.pricing?.total ?? data.totalPrice ?? data.grandTotal ?? row.total ?? 0),
    address: addr || undefined,
    notes: ship.notes || undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── Authorize: DB webhook (shared secret / service-role) OR an admin JWT ──
    // The DB trigger sends `Authorization: Bearer <EMAIL_HOOK_SECRET>` (a
    // dedicated shared secret, avoids service-role key-format ambiguity). The
    // injected service-role key is also accepted for convenience/back-compat.
    const hookSecret = Deno.env.get('EMAIL_HOOK_SECRET');
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    const admin = createClient(supabaseUrl, serviceKey);

    let authorized = false;
    let isManual = false;
    if (bearer && ((hookSecret && bearer === hookSecret) || bearer === serviceKey)) {
      authorized = true; // trusted server-side webhook / DB trigger
    } else if (bearer) {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin') { authorized = true; isManual = true; }
      }
    }
    if (!authorized) return json({ ok: false, error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as any));

    // ── Config ──────────────────────────────────────────────────────────────
    const apiKey = Deno.env.get('RESEND_API_KEY') || Deno.env.get('EMAIL_API_KEY');
    const from = Deno.env.get('EMAIL_FROM') || 'Grainood <onboarding@resend.dev>';
    const brand = Deno.env.get('BRAND_NAME') || 'GRAINOOD';
    const site = Deno.env.get('SITE_URL') || 'https://grainood.com';
    const adminEmails = (Deno.env.get('ADMIN_EMAILS') || '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    if (!apiKey) { log('RESEND_API_KEY not configured'); return json({ ok: false, error: 'not_configured' }, 200); }

    async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!res.ok) { log(`provider send failed status=${res.status}`); return false; }
      return true;
    }

    // Resolve the order row + summary.
    async function loadSummary(orderId: string): Promise<OrderSummary | null> {
      const { data: row, error } = await admin.from('orders').select('id, status, total, data').eq('id', orderId).single();
      if (error || !row) { log('order not found', orderId); return null; }
      return rowToSummary(row);
    }

    // ── Manual admin re-send: { orderId, template } ─────────────────────────
    if (isManual && body?.orderId && body?.template) {
      const template = body.template as CustomerTemplateId;
      if (!CUSTOMER_TEMPLATES.includes(template)) return json({ ok: false, error: 'bad_template' }, 400);
      const summary = await loadSummary(body.orderId);
      if (!summary) return json({ ok: false, error: 'not_found' }, 404);
      if (!summary.customerEmail) return json({ ok: false, error: 'no_recipient' }, 422);
      const rendered = renderTemplate(template, summary, { brand, site });
      if (!rendered) return json({ ok: false, error: 'bad_template' }, 400);
      const ok = await sendEmail(summary.customerEmail, rendered.subject, rendered.html);
      log(`manual template=${template} ok=${ok}`, summary.orderId);
      return ok ? json({ ok: true }) : json({ ok: false, error: 'send_failed' }, 502);
    }

    // ── Webhook payload: { type, record, old_record } ───────────────────────
    const type = body?.type as 'INSERT' | 'UPDATE' | 'DELETE' | undefined;
    const record = body?.record;
    const oldRecord = body?.old_record;
    if (type === 'DELETE') return json({ ok: true }); // nothing to do
    if (!type || !record?.id) return json({ ok: false, error: 'bad_request' }, 400);

    const summary = rowToSummary(record);

    // Decide which customer template (if any) + whether to alert admins.
    let template: CustomerTemplateId | null = null;
    let alertAdmins = false;

    if (type === 'INSERT') {
      // Pay-at-checkout: a fresh insert is "Awaiting Payment" (unpaid) — don't
      // email yet. Only an already-paid insert (e.g. admin/POS order) notifies now.
      if (record?.data?.payment?.status === 'confirmed') {
        template = 'order_placed';
        alertAdmins = true;
      }
    } else if (type === 'UPDATE') {
      const newPay = record?.data?.payment?.status;
      const oldPay = oldRecord?.data?.payment?.status;
      const newStatus = record?.data?.status ?? record?.status;
      const oldStatus = oldRecord?.data?.status ?? oldRecord?.status;
      if (newPay === 'confirmed' && oldPay !== 'confirmed') {
        // Payment just landed → confirm to customer AND alert the shop (the
        // effective "new order" moment in the gateway flow).
        template = 'payment_confirmed';
        alertAdmins = true;
      } else if (newStatus && newStatus !== oldStatus) {
        template = 'status_changed';
      }
    }

    if (!template) return json({ ok: true, skipped: true }); // no email-worthy change

    let sentOk = true;

    // Customer email.
    if (summary.customerEmail) {
      const rendered = renderTemplate(template, summary, { brand, site });
      if (rendered) {
        const ok = await sendEmail(summary.customerEmail, rendered.subject, rendered.html);
        sentOk = sentOk && ok;
      }
    } else {
      log('no customer recipient', summary.orderId);
    }

    // Admin alert (new orders only).
    if (alertAdmins && adminEmails.length) {
      const alert = renderAdminAlert(summary, { brand, site });
      for (const to of adminEmails) {
        const ok = await sendEmail(to, alert.subject, alert.html);
        sentOk = sentOk && ok;
      }
    }

    log(`webhook ${type} template=${template} ok=${sentOk} total=${inr(summary.total)}`, summary.orderId);
    // 502 on send failure so the webhook retries; 200 otherwise.
    return sentOk ? json({ ok: true }) : json({ ok: false, error: 'send_failed' }, 502);
  } catch (_e) {
    log('unhandled error');
    return json({ ok: false, error: 'error' }, 500);
  }
});

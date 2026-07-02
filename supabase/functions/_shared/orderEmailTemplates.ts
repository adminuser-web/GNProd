// Order email templates — the SINGLE place to edit transactional email copy/markup.
//
// Pure functions: given an order summary, return { subject, html }. No secrets,
// no I/O. Rendered server-side inside the send-order-email edge function from the
// order loaded via the service role — customer PII never leaves the function.

export const CUSTOMER_TEMPLATES = [
  'order_placed',
  'payment_confirmed',
  'status_changed',
] as const;
export type CustomerTemplateId = (typeof CUSTOMER_TEMPLATES)[number];

export interface OrderItemSummary {
  name: string;
  qty: number;
  lineTotal: number;
  options?: string; // "Size: SH / Grip: Black"
}

export interface OrderSummary {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shortId: string;   // receiptNumber or order id — shown to the customer
  orderId: string;   // raw order id — used for tracking links
  status?: string;
  items: OrderItemSummary[];
  total: number;
  address?: string;  // admin alert only
  notes?: string;    // admin alert only
}

const GOLD = '#c5a059';
const INK = '#1a1a1a';

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function itemsTable(items: OrderItemSummary[]): string {
  if (!items?.length) return '';
  const rows = items
    .map((it) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;vertical-align:top;">
          <strong>${it.qty}× ${esc(it.name)}</strong>
          ${it.options ? `<div style="color:#8a8276;font-size:12px;margin-top:3px;">${esc(it.options)}</div>` : ''}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap;vertical-align:top;">${inr(it.lineTotal)}</td>
      </tr>`)
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">${rows}</table>`;
}

function totalRow(total: number): string {
  return `<table role="presentation" width="100%"><tr>
    <td style="font-size:15px;font-weight:bold;">Total</td>
    <td style="font-size:15px;font-weight:bold;text-align:right;color:${GOLD};">${inr(total)}</td>
  </tr></table>`;
}

function button(label: string, href: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${GOLD};color:${INK};text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;padding:13px 26px;">${esc(label)}</a>`;
}

function layout(heading: string, bodyHtml: string, brand: string, site: string): string {
  const host = site.replace(/^https?:\/\//, '');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e6e0d2;">
      <tr><td style="background:${INK};padding:24px 32px;text-align:center;"><span style="color:${GOLD};font-size:20px;font-weight:bold;letter-spacing:6px;">${esc(brand)}</span></td></tr>
      <tr><td style="padding:32px;"><h1 style="margin:0 0 16px;font-size:20px;letter-spacing:1px;color:${INK};">${esc(heading)}</h1>${bodyHtml}</td></tr>
      <tr><td style="background:#faf8f3;border-top:1px solid #e6e0d2;padding:20px 32px;text-align:center;"><p style="margin:0;font-size:12px;color:#8a8276;">Handcrafted English Willow · <a href="${esc(site)}" style="color:${GOLD};text-decoration:none;">${esc(host)}</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export interface RenderOpts {
  brand?: string;
  site?: string;
}

function trackLink(site: string, orderId: string): string {
  return `${site.replace(/\/$/, '')}/track?order=${encodeURIComponent(orderId)}`;
}

/** Render a CUSTOMER-facing template. Returns null for an unknown id. */
export function renderTemplate(
  template: CustomerTemplateId,
  order: OrderSummary,
  opts: RenderOpts = {},
): { subject: string; html: string } | null {
  const brand = opts.brand || 'GRAINOOD';
  const site = opts.site || 'https://grainood.com';
  const name = esc(order.customerName || 'there');
  const track = trackLink(site, order.orderId);

  if (template === 'order_placed') {
    return {
      subject: `Order received — ${order.shortId}`,
      html: layout(
        `Thank you, ${name} — we've received your order`,
        `<p style="font-size:14px;line-height:1.6;">Your order <strong>${esc(order.shortId)}</strong> is confirmed. Here's your summary:</p>
         ${itemsTable(order.items)}
         ${totalRow(order.total)}
         <div style="margin:20px 0;padding:16px;background:#faf8f3;border:1px solid #e6e0d2;">
           <p style="margin:0 0 8px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${INK};">What happens next</p>
           <p style="margin:0;font-size:13px;line-height:1.7;color:#4a463e;">1. Our team will reach out on WhatsApp within 24h to re-confirm your specifications.<br>2. Once you're happy, we share secure UPI / bank details for payment.<br>3. Crafting begins and you can track progress anytime.</p>
         </div>
         <p style="margin:16px 0;">${button('Track your order', track)}</p>
         <p style="font-size:12px;color:#8a8276;line-height:1.6;">No payment is needed yet. If the button doesn't work, copy this link:<br><a href="${esc(track)}" style="color:${GOLD};">${esc(track)}</a></p>`,
        brand,
        site,
      ),
    };
  }

  if (template === 'payment_confirmed') {
    return {
      subject: `Payment received — ${order.shortId} is now in processing`,
      html: layout(
        'Payment received — thank you!',
        `<p style="font-size:14px;line-height:1.6;">Hi ${name}, we've received your payment for order <strong>${esc(order.shortId)}</strong>. Your order is now <strong>confirmed and in processing</strong> — your bat is being hand-crafted.</p>
         ${itemsTable(order.items)}
         ${totalRow(order.total)}
         <p style="margin:16px 0;">${button('Track order & download receipt', track)}</p>
         <p style="font-size:12px;color:#8a8276;line-height:1.6;">Tap above to follow your order and download your receipt anytime with your order number and this email.</p>
         <p style="font-size:14px;line-height:1.6;margin-top:16px;">We'll share shipping details as soon as it's on the way. Thank you for choosing ${esc(brand)}.</p>`,
        brand,
        site,
      ),
    };
  }

  if (template === 'status_changed') {
    const status = esc(order.status || 'updated');
    return {
      subject: `Order ${order.shortId} — now ${status}`,
      html: layout(
        `Your order is now ${status}`,
        `<p style="font-size:14px;line-height:1.6;">Hi ${name}, there's an update on your order <strong>${esc(order.shortId)}</strong>. Its status is now <strong>${status}</strong>.</p>
         <p style="margin:16px 0;">${button('Track your order', track)}</p>
         <p style="font-size:14px;line-height:1.6;margin-top:16px;">Thank you for choosing ${esc(brand)}.</p>`,
        brand,
        site,
      ),
    };
  }

  return null;
}

/** Internal new-order alert for the shop team. PII is fine here (internal). */
export function renderAdminAlert(
  order: OrderSummary,
  opts: RenderOpts & { adminOrderUrl?: string } = {},
): { subject: string; html: string } {
  const brand = opts.brand || 'GRAINOOD';
  const site = opts.site || 'https://grainood.com';
  const adminUrl = opts.adminOrderUrl || `${site.replace(/\/$/, '')}/admin/orders/${encodeURIComponent(order.orderId)}`;
  const detail = (label: string, value?: string) =>
    value ? `<tr><td style="padding:4px 0;font-size:13px;color:#8a8276;width:120px;">${esc(label)}</td><td style="padding:4px 0;font-size:13px;">${esc(value)}</td></tr>` : '';

  return {
    subject: `🏏 New order ${order.shortId} — ${inr(order.total)}`,
    html: layout(
      `New order — ${esc(order.shortId)}`,
      `<p style="font-size:14px;line-height:1.6;">A new order has been placed on the website.</p>
       ${itemsTable(order.items)}
       ${totalRow(order.total)}
       <div style="margin:20px 0;padding:16px;background:#faf8f3;border:1px solid #e6e0d2;">
         <p style="margin:0 0 8px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${INK};">Customer</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           ${detail('Name', order.customerName)}
           ${detail('Email', order.customerEmail)}
           ${detail('Phone', order.customerPhone)}
           ${detail('Address', order.address)}
           ${detail('Notes', order.notes)}
         </table>
       </div>
       <p style="margin:16px 0;">${button('Open in admin', adminUrl)}</p>`,
      brand,
      site,
    ),
  };
}

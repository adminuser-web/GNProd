// Order email templates — the SINGLE place to edit email copy/markup.
//
// Pure functions: given a non-PII-minimal order summary (+ optional payment
// link), return { subject, html }. No secrets, no I/O. Rendered server-side
// inside the send-order-email edge function from the order loaded via the
// service role — the customer email/PII never leaves the function.

export const EMAIL_TEMPLATES = ['payment_request', 'payment_received'] as const;
export type EmailTemplateId = (typeof EMAIL_TEMPLATES)[number];

export interface OrderSummary {
  customerName: string;
  shortId: string;
  items: { name: string; qty: number; lineTotal: number }[];
  total: number;
}

const GOLD = '#c5a059';
const INK = '#1a1a1a';

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function itemsTable(items: OrderSummary['items']): string {
  if (!items?.length) return '';
  const rows = items
    .map(
      (it) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;"><strong>${it.qty}× ${esc(it.name)}</strong></td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap;">${inr(it.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">${rows}</table>`;
}

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

function layout(heading: string, bodyHtml: string, brand: string, site: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e6e0d2;">
      <tr><td style="background:${INK};padding:24px 32px;text-align:center;"><span style="color:${GOLD};font-size:20px;font-weight:bold;letter-spacing:6px;">${esc(brand)}</span></td></tr>
      <tr><td style="padding:32px;"><h1 style="margin:0 0 16px;font-size:20px;letter-spacing:1px;color:${INK};">${esc(heading)}</h1>${bodyHtml}</td></tr>
      <tr><td style="background:#faf8f3;border-top:1px solid #e6e0d2;padding:20px 32px;text-align:center;"><p style="margin:0;font-size:12px;color:#8a8276;">Handcrafted English Willow · <a href="${esc(site)}" style="color:${GOLD};text-decoration:none;">${esc(site.replace(/^https?:\/\//, ''))}</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(label: string, href: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${GOLD};color:${INK};text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;padding:13px 26px;">${esc(label)}</a>`;
}

function totalRow(total: number): string {
  return `<table role="presentation" width="100%"><tr>
    <td style="font-size:15px;font-weight:bold;">Total</td>
    <td style="font-size:15px;font-weight:bold;text-align:right;color:${GOLD};">${inr(total)}</td>
  </tr></table>`;
}

export interface RenderOpts {
  brand?: string;
  site?: string;
  paymentLink?: string;
}

/** Render an allow-listed template. Returns null for an unknown template id. */
export function renderTemplate(
  template: EmailTemplateId,
  order: OrderSummary,
  opts: RenderOpts = {},
): { subject: string; html: string } | null {
  const brand = opts.brand || 'GRAINOOD';
  const site = opts.site || 'https://grainood.com';
  const name = order.customerName || 'there';

  if (template === 'payment_request') {
    const cta = opts.paymentLink ? `<p style="margin:8px 0 0;">${button('Pay now', opts.paymentLink)}</p>` : '';
    return {
      subject: `Complete your payment — order ${order.shortId}`,
      html: layout(
        `Hi ${name}, your order is ready for payment`,
        `<p style="font-size:14px;line-height:1.6;">Thank you for your order <strong>${esc(order.shortId)}</strong>. Here's your summary:</p>
         ${itemsTable(order.items)}
         ${totalRow(order.total)}
         <div style="margin:20px 0;padding:16px;background:#faf8f3;border:1px solid #e6e0d2;">
           <p style="margin:0;font-size:13px;line-height:1.6;color:#4a463e;">Please complete your payment using the secure link below. Once we receive it, we begin hand-crafting your bat.</p>
         </div>
         ${cta}`,
        brand,
        site,
      ),
    };
  }

  if (template === 'payment_received') {
    return {
      subject: `Payment received — order ${order.shortId} in processing`,
      html: layout(
        'Payment received — thank you!',
        `<p style="font-size:14px;line-height:1.6;">Hi ${name}, we've received your payment for order <strong>${esc(order.shortId)}</strong>. Your order is now <strong>in processing</strong> and your bat is being hand-crafted.</p>
         ${itemsTable(order.items)}
         ${totalRow(order.total)}
         <p style="font-size:14px;line-height:1.6;margin-top:16px;">We'll be in touch with shipping details. Thank you for choosing ${esc(brand)}.</p>`,
        brand,
        site,
      ),
    };
  }

  return null;
}

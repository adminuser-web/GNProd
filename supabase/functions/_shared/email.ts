// Resend email helper + shared branded HTML layout.
// Secret RESEND_API_KEY is read from the function environment — never the browser.
//   supabase secrets set RESEND_API_KEY=... EMAIL_FROM="Grainood <orders@yourdomain>" \
//     EMAIL_REPLY_TO=... OWNER_EMAIL=... EMAIL_WEBHOOK_SECRET=...

const GOLD = '#c5a059';
const INK = '#1a1a1a';

export const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') || 'Grainood <onboarding@resend.dev>';
  const replyTo = Deno.env.get('EMAIL_REPLY_TO') || undefined;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  if (!to) throw new Error('No recipient');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, reply_to: replyTo }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

/**
 * Branded email shell. Light body with a dark/gold header so it reads well in
 * every mail client (email clients don't support our CSS variables, so all
 * styles are inline).
 */
export function layout(opts: { heading: string; bodyHtml: string; preheader?: string }): string {
  const brand = Deno.env.get('BRAND_NAME') || 'GRAINOOD';
  const site = Deno.env.get('SITE_URL') || 'https://grainood.com';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:${INK};">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e6e0d2;">
        <tr><td style="background:${INK};padding:24px 32px;text-align:center;">
          <span style="color:${GOLD};font-size:20px;font-weight:bold;letter-spacing:6px;">${brand}</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;letter-spacing:1px;color:${INK};">${opts.heading}</h1>
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="background:#faf8f3;border-top:1px solid #e6e0d2;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#8a8276;">Handcrafted English Willow · <a href="${site}" style="color:${GOLD};text-decoration:none;">${site.replace(/^https?:\/\//, '')}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Renders the order's line items as an HTML table fragment. */
export function itemsTable(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return '';
  const rows = items.map((it) => {
    const name = it.productName || it.product?.name || 'Custom bat';
    const qty = it.quantity || 1;
    const line = it.lineTotal ?? (it.unitPrice || 0) * qty;
    const sel = Array.isArray(it.selections)
      ? it.selections.map((s: any) => (s.type === 'text' && s.valueText ? `${s.groupLabel}: ${s.valueText}` : s.optionLabel)).filter(Boolean).join(' · ')
      : '';
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;">
        <strong>${qty}× ${name}</strong>
        ${sel ? `<br><span style="font-size:12px;color:#8a8276;">${sel}</span>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap;">${inr(line)}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">${rows}</table>`;
}

export function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${GOLD};color:${INK};text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;padding:12px 24px;">${label}</a>`;
}

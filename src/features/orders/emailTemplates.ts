// Client-side order email templates (plain text) + Gmail compose URL builder.
//
// The admin opens a PRE-FILLED Gmail draft and sends it themselves — nothing is
// auto-sent. Wording mirrors the previous server templates. Bodies are kept
// concise because compose URLs are length-capped (~2k–8k chars): we summarise
// the order (item lines + total) rather than dumping full detail.

export type OrderEmailTemplate = 'payment_request' | 'payment_received';

export interface OrderEmailInput {
  customerName?: string;
  shortId: string;
  items?: any[];
  total: number;
}

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function summariseItems(items: any[] | undefined, maxLines = 8): string {
  if (!items?.length) return '';
  const lines = items.slice(0, maxLines).map((it) => {
    const name = it.productName || it.product?.name || 'Custom bat';
    const qty = it.quantity || 1;
    const line = it.lineTotal ?? (it.unitPrice ?? it.price ?? 0) * qty;
    return `- ${qty}x ${name} — ${inr(line)}`;
  });
  if (items.length > maxLines) lines.push(`…and ${items.length - maxLines} more item(s)`);
  return lines.join('\n');
}

export function buildOrderEmail(
  template: OrderEmailTemplate,
  order: OrderEmailInput,
  opts: { paymentLink?: string; brandName?: string } = {},
): { subject: string; body: string } {
  const brand = opts.brandName || 'Grainood';
  const name = order.customerName || 'there';
  const items = summariseItems(order.items);
  const total = inr(order.total);

  if (template === 'payment_request') {
    return {
      subject: `Complete your payment — order ${order.shortId}`,
      body: [
        `Hi ${name},`,
        ``,
        `Thank you for your order ${order.shortId}. Here's your summary:`,
        ``,
        items,
        ``,
        `Total: ${total}`,
        ``,
        `Please complete your payment using this secure link:`,
        opts.paymentLink || '',
        ``,
        `Once we receive it, we begin hand-crafting your bat.`,
        ``,
        `Warm regards,`,
        brand,
      ].join('\n'),
    };
  }

  // payment_received
  return {
    subject: `Payment received — order ${order.shortId} in processing`,
    body: [
      `Hi ${name},`,
      ``,
      `We've received your payment for order ${order.shortId}. Your order is now in processing and your bat is being hand-crafted.`,
      ``,
      items,
      ``,
      `Total: ${total}`,
      ``,
      `We'll be in touch with shipping details. Thank you for choosing ${brand}.`,
      ``,
      `Warm regards,`,
      brand,
    ].join('\n'),
  };
}

/**
 * Build a Gmail web compose URL pre-filled with the draft. `authuser` targets a
 * SPECIFIC signed-in Google account by email (so it opens in the right account
 * even when several are signed in). Every value is encodeURIComponent-escaped.
 */
export function buildGmailComposeUrl(p: {
  sendFrom: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const parts = [
    `authuser=${encodeURIComponent(p.sendFrom)}`,
    `view=cm`,
    `fs=1`,
    `to=${encodeURIComponent(p.to)}`,
    `su=${encodeURIComponent(p.subject)}`,
    `body=${encodeURIComponent(p.body)}`,
  ];
  return `https://mail.google.com/mail/?${parts.join('&')}`;
}

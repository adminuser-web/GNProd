// Per-event email templates. Each returns { subject, html } and pulls what it
// needs from the order's `data` jsonb (customer, items, pricing, shipping).

import { layout, itemsTable, button, inr } from './email.ts';

const SITE = () => Deno.env.get('SITE_URL') || 'https://grainood.com';

function orderRef(data: any, id: string): string {
  return data.receiptNumber || id;
}
function customerName(data: any): string {
  return data.customer?.name || data.shippingDetails?.name || 'there';
}
function customerEmail(data: any): string {
  return data.customer?.email || data.shippingDetails?.email || '';
}

export function orderPlacedEmail(data: any, id: string) {
  const total = data.pricing?.total ?? data.totalPrice ?? 0;
  return {
    to: customerEmail(data),
    subject: `Order received — ${orderRef(data, id)}`,
    html: layout({
      heading: `Thank you, ${customerName(data)}!`,
      preheader: `We've received your order ${orderRef(data, id)}.`,
      bodyHtml: `
        <p style="font-size:14px;line-height:1.6;">We've received your order <strong>${orderRef(data, id)}</strong>. Here's what you ordered:</p>
        ${itemsTable(data.items || [])}
        <table role="presentation" width="100%"><tr>
          <td style="font-size:15px;font-weight:bold;">Total</td>
          <td style="font-size:15px;font-weight:bold;text-align:right;color:#c5a059;">${inr(total)}</td>
        </tr></table>
        <div style="margin:24px 0;padding:16px;background:#faf8f3;border:1px solid #e6e0d2;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:1px;color:#c5a059;">WHAT HAPPENS NEXT</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#4a463e;">No payment is needed yet. Our team will reach out on WhatsApp to confirm your specifications, then share a secure payment link (UPI / bank). Your bat is hand-made to order after payment is confirmed.</p>
        </div>
        <p style="font-size:14px;">${button('View your order', `${SITE()}/my-orders`)}</p>`,
    }),
  };
}

export function paymentConfirmedEmail(data: any, id: string) {
  const paid = data.payment?.paidAmount ?? data.pricing?.total ?? 0;
  return {
    to: customerEmail(data),
    subject: `Payment received — ${orderRef(data, id)}`,
    html: layout({
      heading: 'Payment confirmed',
      preheader: `We've received your payment for ${orderRef(data, id)}.`,
      bodyHtml: `
        <p style="font-size:14px;line-height:1.6;">Hi ${customerName(data)}, we've received your payment of <strong>${inr(paid)}</strong> for order <strong>${orderRef(data, id)}</strong>. Thank you!</p>
        <p style="font-size:14px;line-height:1.6;">Your bat now moves into hand-crafting. We'll email you again when it ships.</p>
        <p style="font-size:14px;">${button('View order & receipt', `${SITE()}/my-orders`)}</p>`,
    }),
  };
}

export function shippedEmail(data: any, id: string) {
  const t = data.shippingDetails || {};
  const tracking = data.tracking || data.shippingDetails?.tracking || {};
  const carrier = tracking.carrier || data.shippingDetails?.carrier;
  const num = tracking.number || tracking.trackingNumber || data.shippingDetails?.trackingNumber;
  const url = tracking.url || data.shippingDetails?.trackingUrl;
  return {
    to: customerEmail(data),
    subject: `Your order has shipped — ${orderRef(data, id)}`,
    html: layout({
      heading: 'On its way 🏏',
      preheader: `Order ${orderRef(data, id)} has shipped.`,
      bodyHtml: `
        <p style="font-size:14px;line-height:1.6;">Hi ${customerName(data)}, your order <strong>${orderRef(data, id)}</strong> has shipped.</p>
        ${carrier || num ? `<p style="font-size:14px;line-height:1.6;">${carrier ? `<strong>Carrier:</strong> ${carrier}<br>` : ''}${num ? `<strong>Tracking:</strong> ${num}` : ''}</p>` : ''}
        ${t.address ? `<p style="font-size:13px;color:#8a8276;">Shipping to: ${t.address}, ${t.city || ''} ${t.pincode || ''}</p>` : ''}
        ${url ? `<p style="font-size:14px;">${button('Track shipment', url)}</p>` : `<p style="font-size:14px;">${button('View order', `${SITE()}/my-orders`)}</p>`}`,
    }),
  };
}

export function deliveredEmail(data: any, id: string) {
  return {
    to: customerEmail(data),
    subject: `Delivered — ${orderRef(data, id)}`,
    html: layout({
      heading: 'Your bat has arrived',
      preheader: `Order ${orderRef(data, id)} was delivered.`,
      bodyHtml: `
        <p style="font-size:14px;line-height:1.6;">Hi ${customerName(data)}, your order <strong>${orderRef(data, id)}</strong> has been delivered. We hope you love it.</p>
        <p style="font-size:14px;line-height:1.6;">New bats need knocking-in before match use — see our <a href="${SITE()}/bat-care" style="color:#c5a059;">bat care guide</a>.</p>
        <p style="font-size:14px;">${button('Leave a review', `${SITE()}/my-orders`)}</p>`,
    }),
  };
}

export function cancelledEmail(data: any, id: string) {
  return {
    to: customerEmail(data),
    subject: `Order cancelled — ${orderRef(data, id)}`,
    html: layout({
      heading: 'Order cancelled',
      preheader: `Order ${orderRef(data, id)} has been cancelled.`,
      bodyHtml: `
        <p style="font-size:14px;line-height:1.6;">Hi ${customerName(data)}, your order <strong>${orderRef(data, id)}</strong> has been cancelled. If you have any questions or this was a mistake, just reply to this email.</p>
        <p style="font-size:14px;">${button('Browse the collection', `${SITE()}/collection`)}</p>`,
    }),
  };
}

/** Internal alert to the shop owner when a new order arrives. */
export function ownerNewOrderEmail(data: any, id: string, ownerEmail: string) {
  const total = data.pricing?.total ?? data.totalPrice ?? 0;
  const c = data.customer || data.shippingDetails || {};
  return {
    to: ownerEmail,
    subject: `🟢 New order ${orderRef(data, id)} — ${inr(total)}`,
    html: layout({
      heading: `New order: ${orderRef(data, id)}`,
      bodyHtml: `
        <p style="font-size:14px;line-height:1.6;"><strong>${c.name || 'Customer'}</strong> · ${c.phone || ''} · ${c.email || ''}</p>
        ${itemsTable(data.items || [])}
        <table role="presentation" width="100%"><tr>
          <td style="font-size:15px;font-weight:bold;">Total</td>
          <td style="font-size:15px;font-weight:bold;text-align:right;color:#c5a059;">${inr(total)}</td>
        </tr></table>
        <p style="font-size:14px;">${button('Open in admin', `${SITE()}/admin/orders/${id}`)}</p>`,
    }),
  };
}

// Edge function: send-email
//
// Triggered by a Supabase **Database Webhook** on the `orders` table
// (INSERT + UPDATE). Because every order path — storefront checkout, admin
// status changes, and the Razorpay payment webhook — writes to `orders`, this
// single function emails the right thing for every event with no scattered
// calls.
//
// Auth: the function URL is public, so the DB webhook must send a shared secret
// header `x-webhook-secret` matching EMAIL_WEBHOOK_SECRET.
//
// Deploy:  supabase functions deploy send-email --no-verify-jwt
// Secrets: RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, OWNER_EMAIL,
//          EMAIL_WEBHOOK_SECRET, SITE_URL, BRAND_NAME

import { sendEmail } from '../_shared/email.ts';
import {
  orderPlacedEmail,
  paymentConfirmedEmail,
  shippedEmail,
  deliveredEmail,
  cancelledEmail,
  ownerNewOrderEmail,
} from '../_shared/emailTemplates.ts';

type Built = { to: string; subject: string; html: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Shared-secret check (the function URL is public).
  const expected = Deno.env.get('EMAIL_WEBHOOK_SECRET');
  if (expected && req.headers.get('x-webhook-secret') !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: any;
  try { payload = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }

  const type = payload?.type as 'INSERT' | 'UPDATE' | 'DELETE';
  const record = payload?.record;
  const old = payload?.old_record;
  if (!record) return new Response('No record', { status: 200 });

  const id: string = record.id;
  const data = (record.data ?? {}) as any;
  const ownerEmail = Deno.env.get('OWNER_EMAIL');

  // Decide which emails to send for this DB event.
  const toSend: Built[] = [];

  if (type === 'INSERT') {
    toSend.push(orderPlacedEmail(data, id));
    if (ownerEmail) toSend.push(ownerNewOrderEmail(data, id, ownerEmail));
  } else if (type === 'UPDATE') {
    const oldData = (old?.data ?? {}) as any;

    // Payment newly confirmed (manual or via the Razorpay webhook).
    const wasPaid = oldData.payment?.status === 'confirmed';
    const isPaid = data.payment?.status === 'confirmed';
    if (isPaid && !wasPaid) {
      toSend.push(paymentConfirmedEmail(data, id));
    }

    // Order status changed → status emails (skip 'Payment Confirmed', covered above).
    if (record.status && record.status !== old?.status) {
      switch (record.status) {
        case 'Shipped':
          toSend.push(shippedEmail(data, id));
          break;
        case 'Delivered':
        case 'Completed':
          toSend.push(deliveredEmail(data, id));
          break;
        case 'Cancelled':
          toSend.push(cancelledEmail(data, id));
          break;
        default:
          break; // Processing / Payment Pending / Ready for Pickup: no email (low noise)
      }
    }
  }

  // Send all (best-effort). Always return 200 so the DB webhook doesn't retry
  // and double-send; report any failures in the body for logs.
  const errors: string[] = [];
  for (const mail of toSend) {
    if (!mail.to) continue;
    try {
      await sendEmail(mail);
    } catch (e) {
      errors.push(`${mail.subject}: ${(e as Error).message}`);
    }
  }

  return new Response(JSON.stringify({ sent: toSend.length - errors.length, errors }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

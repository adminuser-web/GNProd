# Transactional email (Resend) + public order tracking — setup guide

This wires up **automated order emails** and a **public "track your order" page**.
All the code lives in the repo; the steps below are the one-time infra wiring you
(the account owner) do in Resend, Hostinger DNS, and the Supabase dashboard.
None of these require touching or moving any uploaded images.

## What was built

| Piece | Where | What it does |
|---|---|---|
| `send-order-email` edge function | `supabase/functions/send-order-email/` | Fired by a DB webhook on `orders`. On INSERT → customer "order received" + admin alert. On payment→confirmed → "in processing". On status change → "now <status>". |
| `track-order` edge function | `supabase/functions/track-order/` | **Public.** Looks up an order by `{ orderId, email }` via the service role, verifies the email matches, returns a PII-safe status view. |
| Email templates | `supabase/functions/_shared/orderEmailTemplates.ts` | The single place to edit email copy/markup. |
| Track page | `src/components/TrackOrderPage.tsx` → route `/track` | Customer-facing lookup form + status timeline. Linked from the order-confirmation page and the footer. |
| Guest badge | `src/features/crm/hooks/useCustomers.ts` + Customers page | Guests (order-only, no account) are tagged so the team can spot them. |

Guest checkout already worked (anonymous Supabase session on `/order`); their
name/email/phone/address is captured on the order and surfaces in the admin
Customers page.

---

## 1. Resend — verify the grainood.com domain

1. In Resend → **Domains → Add Domain** → enter `grainood.com` (or a subdomain
   like `send.grainood.com` — recommended, keeps it isolated from Google mail).
2. Resend shows a set of DNS records (MX, SPF `TXT`, DKIM `TXT`, and optionally
   DMARC). Copy them exactly.
3. Add them in **Hostinger → DNS Zone**. **These do NOT conflict with Google
   Workspace mail** — Resend's MX/SPF are scoped to the `send` subdomain, so your
   inbox (Google MX on the root domain) is untouched. Do **not** edit or remove
   the existing `@` MX / `google._domainkey` / root SPF records.
4. Back in Resend, click **Verify**. Wait until the domain shows **Verified**.

Until the domain is verified, Resend only delivers from `onboarding@resend.dev`
to your own signup address — fine for a smoke test, not for customers.

## 2. Deploy the edge functions

Requires the Supabase CLI logged in and linked to project `ycebmqpayiiejcfukjra`.

```bash
supabase functions deploy send-order-email
supabase functions deploy track-order --no-verify-jwt   # public endpoint
```

## 3. Set the function secrets

```bash
supabase secrets set \
  RESEND_API_KEY="<your Resend API key>" \
  EMAIL_FROM="Grainood <orders@grainood.com>" \
  ADMIN_EMAILS="orders@grainood.com" \
  SITE_URL="https://grainood.com" \
  BRAND_NAME="GRAINOOD"
```

- `RESEND_API_KEY` — from Resend → API Keys. **Never** commit this or paste it in chat.
- `EMAIL_FROM` — must be on the **verified** domain from step 1.
- `ADMIN_EMAILS` — comma-separated; who gets the "new order" alert. `orders@grainood.com`
  must be a real mailbox/alias in Google Workspace to *receive* it.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are injected
  automatically — do not set them.

## 4. Create the Database Webhook (auto-send on order changes)

Supabase dashboard → **Database → Webhooks → Create a new hook**:

- **Table:** `public.orders`
- **Events:** ✅ Insert, ✅ Update  (leave Delete off)
- **Type:** Supabase Edge Functions → `send-order-email`
- **HTTP Headers:** add `Authorization: Bearer <SERVICE_ROLE_KEY>`
  (Settings → API → `service_role` secret). The function authorizes the webhook by
  matching this against its injected service-role key — no separate secret to manage.

That's it — placing an order (guest or logged-in) now emails the customer and
alerts `orders@grainood.com`; confirming payment or changing status emails the
customer automatically.

## 5. Smoke test

1. Place a test order on the site with an email you control.
2. Confirm: customer confirmation email arrives; `orders@grainood.com` gets the alert.
3. Go to `/track`, enter the order number + that email → status shows.
4. In admin, confirm payment → customer gets the "in processing" email.
5. Change status to Shipped → customer gets the "now Shipped" email.
6. Delete the test order when done:
   `delete from public.orders where id='<order id>';`

## Editing copy

All email wording/markup is in `supabase/functions/_shared/orderEmailTemplates.ts`.
Edit, then redeploy `send-order-email`.

## Notes / limits

- The webhook fires on **every** `orders` UPDATE; the function only emails when
  payment flips to confirmed or the status actually changes (it compares
  `old_record`), so admin edits like notes won't spam the customer.
- Admins can manually re-send a customer template by invoking `send-order-email`
  with a valid admin session and body `{ orderId, template }` where template is
  `order_placed` | `payment_confirmed` | `status_changed`.
- The track endpoint returns a generic "not found" on any email mismatch to avoid
  order-number enumeration, and never echoes address/phone back to the browser.

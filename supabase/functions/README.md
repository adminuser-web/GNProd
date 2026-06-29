# Payment edge functions (Razorpay)

Server-side payment code. The browser never holds the Razorpay secret or marks
an order paid — these functions do, inside Supabase's trust boundary.

| Function | Who calls it | Purpose |
|---|---|---|
| `create-payment-link` | Admin (from the app) | Generates a Razorpay payment link for an order; stores it on the order to send via WhatsApp |
| `razorpay-webhook` | Razorpay (server-to-server) | On `payment_link.paid`, verifies the signature and marks the order paid (audit + notify) |

`_shared/` holds CORS + Razorpay helpers (auth header, signature verification,
link creation). The `payment_events` table (migration `20260629000001`) gives
the webhook idempotency.

---

## One-time setup (do this when your Razorpay account is active)

### 1. Get your keys
- Razorpay Dashboard → **Settings → API Keys** → generate. Use **Test Mode** keys first.
  - `RAZORPAY_KEY_ID` (public, e.g. `rzp_test_…`)
  - `RAZORPAY_KEY_SECRET` (**secret**)
- Razorpay Dashboard → **Settings → Webhooks** → you'll set a **webhook secret** (any strong string) → `RAZORPAY_WEBHOOK_SECRET`.

### 2. Apply the migration
Run `supabase/migrations/20260629000001_payment_events.sql` in the Supabase SQL editor (or via the migration workflow).

### 3. Deploy the functions
```bash
# from repo root, with the Supabase CLI linked to the project
supabase functions deploy create-payment-link
supabase functions deploy razorpay-webhook --no-verify-jwt   # Razorpay can't send a Supabase JWT; HMAC is the auth
```

### 4. Set the secrets (NEVER commit these)
```bash
supabase secrets set \
  RAZORPAY_KEY_ID=rzp_test_xxx \
  RAZORPAY_KEY_SECRET=xxx \
  RAZORPAY_WEBHOOK_SECRET=your_strong_webhook_secret
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### 5. Register the webhook in Razorpay
- Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**
- URL: `https://<project-ref>.functions.supabase.co/razorpay-webhook`
- Secret: the same `RAZORPAY_WEBHOOK_SECRET`
- Active event: **`payment_link.paid`** (add `payment.captured` later if you also do standard checkout)

### 6. Test (Test Mode)
- From the admin order page, "Generate payment link" → open the link → pay with a
  [Razorpay test method](https://razorpay.com/docs/payments/payments/test-card-details/).
- Confirm the webhook fires and the order flips to **Payment Confirmed** in the admin board.

### 7. Go live
- Swap to **Live** keys (`rzp_live_…`) via `supabase secrets set` and update the live webhook.
- Flip `FEATURES.paymentGateway = true` in `src/config/features.ts`.
- Do one real ₹1–₹10 smoke order, then refund it from the dashboard.

---

## Security notes
- The order amount is computed **server-side from the DB**, never from the client.
- The webhook verifies the HMAC signature against the **raw** body before trusting anything.
- Only the service role can write `orders.payment.status = 'confirmed'` and `payment_events`.
- Keep all secrets in `supabase secrets` — they are git-ignored and never reach the browser bundle.

---

# Transactional email — `send-email`

One function, triggered by a **Database Webhook on `orders`** (INSERT + UPDATE).
Every order path writes to `orders`, so this covers storefront checkout, admin
status changes, AND the Razorpay payment webhook with no scattered calls.

Emails: order placed (customer) + new-order alert (owner); payment confirmed;
shipped (with tracking if present); delivered/completed; cancelled.

Transport is **Google Workspace SMTP by default** (free, no new DNS since the
domain is already Google-authenticated). To use Resend's HTTP API instead, set
`EMAIL_PROVIDER=resend` + `RESEND_API_KEY` (see end of section).

## One-time setup — Google Workspace SMTP (recommended, free)

### 1. Create a free `noreply@` alias
- Google Admin → **Directory → Users →** pick an existing user (e.g. `admin@grainood.com`) → **Add alternate email (alias)** → `noreply@grainood.com`.
  - An **alias is free**; a new *user* would cost a seat. Google auto-registers the alias as a verified "send mail as" address, so Gmail won't rewrite the From.

### 2. App Password on that user
- That user → enable **2-Step Verification** → **App Passwords** → generate one (16 chars). This is `SMTP_PASS`.

### 3. Deploy
```bash
supabase functions deploy send-email --no-verify-jwt
```

### 4. Secrets
```bash
supabase secrets set \
  SMTP_USER=admin@grainood.com \
  SMTP_PASS=your_16_char_app_password \
  EMAIL_FROM="Grainood <noreply@grainood.com>" \
  EMAIL_REPLY_TO=support@grainood.com \
  OWNER_EMAIL=you@grainood.com \
  EMAIL_WEBHOOK_SECRET=some_strong_random_string \
  SITE_URL=https://grainood.com \
  BRAND_NAME=GRAINOOD
```
- `SMTP_USER` = the real Workspace user you authenticate as.
- `EMAIL_FROM` = the `noreply@` alias (must belong to `SMTP_USER`).
- Defaults: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465` (TLS). Limit ≈ 2,000/day.

> Prefer Resend instead? `supabase secrets set EMAIL_PROVIDER=resend RESEND_API_KEY=re_xxx EMAIL_FROM="Grainood <orders@grainood.com>"` and verify your domain in Resend (adds DKIM DNS records alongside Google's — they coexist fine).

### 4. Create the Database Webhook
Supabase Dashboard → **Database → Webhooks → Create a new hook**:
- Table: `public.orders`
- Events: **Insert** and **Update**
- Type: **HTTP Request** → POST → URL `https://<project-ref>.functions.supabase.co/send-email`
- HTTP Headers: add **`x-webhook-secret`** = the same `EMAIL_WEBHOOK_SECRET`

(That secret header is the function's auth, since the URL is public.)

### 5. Test
- Place a test order → you should get the confirmation + an owner alert.
- Change an order to **Shipped / Delivered / Cancelled** in the admin → matching email.
- Confirm a payment (manual or via Razorpay test) → payment-received email.

## Notes
- Templates live in `_shared/emailTemplates.ts`; the shared shell + transport (SMTP/Resend) in `_shared/email.ts`.
- The function returns **200 even on send failure** (errors in the body) so the DB webhook doesn't retry and double-send. Check function logs for failures.
- Guests: the recipient email is read from the order's `data.customer.email` (captured at checkout), not from auth — so guest orders email correctly.

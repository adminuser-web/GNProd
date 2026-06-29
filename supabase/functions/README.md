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

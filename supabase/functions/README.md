# Supabase Edge Functions

> **Payments are gateway-free** (manual UPI). There is no payment edge function —
> the customer pays via a UPI link/QR (generated client-side, no secrets) and an
> admin confirms the payment. The only edge function here is transactional email.

# Transactional email — `send-email`

One function, triggered by a **Database Webhook on `orders`** (INSERT + UPDATE).
Every order path writes to `orders`, so this covers storefront checkout and
admin status changes with no scattered calls.

Emails: order placed (customer) + new-order alert (owner); payment confirmed;
shipped (with tracking if present); delivered/completed; cancelled.

Transport is **Google Workspace SMTP by default** (free, no new DNS since the
domain is already Google-authenticated). To use Resend's HTTP API instead, set
`EMAIL_PROVIDER=resend` + `RESEND_API_KEY` (see end).

## One-time setup — Google Workspace SMTP (recommended, free)

### 1. Create a free `noreply@` (or use an existing mailbox)
- Google Admin → **Directory → Users →** pick a user → **Add alternate email (alias)** → `noreply@grainood.com`.
  - An **alias is free**; Google auto-registers it as a verified "send mail as" address, so Gmail won't rewrite the From. (Or just send from the user directly.)

### 2. App Password on that user
- That user → enable **2-Step Verification** → **App Passwords** → generate one (16 chars) → `SMTP_PASS`.

### 3. Deploy
```bash
supabase functions deploy send-email --no-verify-jwt
```

### 4. Secrets
```bash
supabase secrets set \
  SMTP_USER=connect@grainood.com \
  SMTP_PASS=your_16_char_app_password \
  EMAIL_FROM="Grainood <noreply@grainood.com>" \
  EMAIL_REPLY_TO=connect@grainood.com \
  OWNER_EMAIL=you@grainood.com \
  EMAIL_WEBHOOK_SECRET=some_strong_random_string \
  SITE_URL=https://grainood.com \
  BRAND_NAME=GRAINOOD
```
- `SMTP_USER` = the real Workspace user you authenticate as.
- `EMAIL_FROM` = the `noreply@` alias (must belong to `SMTP_USER`) — or just `SMTP_USER`.
- Defaults: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465` (TLS). Limit ≈ 2,000/day.

### 5. Create the Database Webhook
Supabase Dashboard → **Database → Webhooks → Create a new hook**:
- Table `public.orders`, events **Insert** + **Update**
- **HTTP Request** → POST → `https://<project-ref>.functions.supabase.co/send-email`
- HTTP header **`x-webhook-secret`** = the same `EMAIL_WEBHOOK_SECRET` (this is the function's auth)

### 6. Test
- Place a test order → confirmation + owner alert.
- Change an order to **Shipped / Delivered / Cancelled** → matching email.
- Mark a payment confirmed → payment-received email.

## Notes
- Templates live in `_shared/emailTemplates.ts`; the shared shell + transport (SMTP/Resend) in `_shared/email.ts`.
- The function returns **200 even on send failure** (errors in the body) so the DB webhook doesn't retry and double-send. Check function logs for failures.
- Guests: the recipient email is read from the order's `data.customer.email`, so guest orders email correctly.

> Prefer Resend instead of SMTP? `supabase secrets set EMAIL_PROVIDER=resend RESEND_API_KEY=re_xxx EMAIL_FROM="Grainood <orders@grainood.com>"` and verify your domain in Resend (DKIM records coexist with Google's).

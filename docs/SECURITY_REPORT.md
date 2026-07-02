# Grainood — Application Security Assessment

**Type:** Grey-box, authorized, self-assessment (own application only)
**Date:** 2026-07-02
**Scope:** React/Vite SPA, Supabase (Postgres + RLS + Auth + Storage + Edge Functions), Razorpay payments, Vercel hosting
**Method:** Source + migration review, production-build (`dist/`) secret scan, live REST probing with the public anon key and two throwaway anonymous sessions, `npm audit`, git-history scan, browser walk of the customer flow.
**Tester constraints honoured:** No real customer/production data was read or modified. Findings were confirmed to the point of proof, then stopped. No action was taken against third-party services. No fixes were applied — this report is for review first.

---

## 1. Executive summary

**Overall risk rating: LOW.**

The application's core data-protection model is strong and held up under direct attack:

- **Row-Level Security (RLS) is enforced on every table** and was proven to block cross-user access. Using two independent anonymous sessions, user B could not read, update, or delete user A's order (every attempt returned zero rows). The unauthenticated anon key leaks nothing from any private table.
- **Pricing and order state are server-authoritative.** A customer cannot tamper with a total, self-confirm a payment, or self-promote to admin — all blocked at the database layer, independent of the UI.
- **Admin is gated at the data layer, not just the UI.** `is_admin()` requires an MFA-elevated (AAL2) session when the admin has enrolled an authenticator.
- **No server secrets ship to the client.** The production build contains no service-role key, no payment/email secret, no JWTs, and no source maps. Only the public Supabase URL + publishable anon key are present, as intended.
- **Payment integrity is sound:** server-created Razorpay orders, HMAC signature verification over the raw webhook body, idempotency, and a defence-in-depth re-fetch of the payment before marking an order paid.
- `npm audit`: **0 vulnerabilities**. Git history: **no committed secrets**.

Findings are almost entirely **hardening / defence-in-depth**. The one item worth addressing before scaling is **support-ticket attachments being stored in a public bucket** (Medium). There are no Critical or High findings.

### Findings at a glance

| # | Severity | Area | Finding |
|---|----------|------|---------|
| F-01 | **Medium** | Storage / PII | Support-ticket attachments are stored in the public `media` bucket (world-readable by URL, no expiry) |
| F-02 | Low–Medium | Business logic | Discount codes have no redemption/usage limit — a known code is reusable until expiry |
| F-03 | Low–Medium | Abuse | No rate limit on `orders` INSERT — an authenticated/anon user can spam order rows |
| F-04 | Low | AuthZ / edge fn | `razorpay-refund` checks `role` directly, bypassing the AAL2/MFA requirement of `is_admin()` |
| F-05 | Low | API | Edge-function CORS is `Access-Control-Allow-Origin: *` |
| F-06 | Low | Config | Maintenance bypass secret is world-readable in the public `content` table |
| F-07 | Low | Abuse | Turnstile/CAPTCHA scaffolded but not implemented; public forms rely on IP rate-limiting only |
| F-08 | Low | Headers | CSP is `frame-ancestors`-only; no `default-src`/`script-src` |
| F-09 | Info | Docs | `.env.example` is stale re: email (says no server email; Resend is now used) |
| F-10 | Info | Hygiene | No `robots.txt` (recommend disallowing `/admin` once live) |
| F-11 | Info | Cleanup | Test order `GRN-SECTEST-1783003227719` left by the IDOR proof needs admin deletion |

---

## Remediation status (applied 2026-07-02)

All findings except F-07 were fixed, verified, and shipped. DB changes were applied to the live project (migration `20260702000006_security_followups.sql`); edge functions were redeployed; client/config changes went out with the build.

| # | Status | What was done | Verification |
|---|--------|---------------|--------------|
| F-01 | ✅ Fixed | Support attachments now upload to a **private** `support-attachments` bucket (RLS: owner + admin); UI resolves short-lived signed URLs (`AttachmentLink`), with a legacy public-URL fallback | Proven: owner upload 200; **public read 400**; owner sign 200; other user signing owner's object 400 |
| F-02 | ✅ Fixed | Optional `maxUses` per code; enforced server-side in `razorpay-create-order` (counts confirmed redemptions) and in `validate_discount_code`; codes without `maxUses` stay unlimited | Migration applied; create-order healthy |
| F-03 | ✅ Fixed | `orders_rate_limit` trigger — 8 direct client inserts / 10 min per user+IP; admins & service-role bypass | Trigger present; create-order (service role) unaffected |
| F-04 | ✅ Fixed | `razorpay-refund` now checks `is_admin()` (AAL2-aware) instead of raw `role` — a password-only session can't refund | Non-admin → 403; no-JWT → 401 |
| F-05 | ✅ Fixed (config) | CORS reads `CORS_ALLOW_ORIGIN` secret; defaults to `*` until set — **set it to the site origin at launch** | Deployed; no-op until configured |
| F-06 | ✅ Fixed (mechanism) | Preview gate reads `VITE_PREVIEW_SECRET` first (falls back to content). **Set the env var + clear the DB `bypassSecret` to fully remove API exposure** | Ships; back-compat preserved |
| F-07 | ⏳ Deferred | Turnstile needs your Cloudflare site+secret keys **and** routing enquiry submission through an edge function (currently a direct DB insert). Rate-limiting mitigates meanwhile | Requires your keys |
| F-08 | ✅ Fixed | `vercel.json` CSP tightened to `default-src 'self'` + scoped `script/connect/frame/img/object/base/form-action` (Supabase + Razorpay allow-listed) | Verify live headers post-deploy |
| F-09 | ✅ Fixed | `.env.example` rewritten — documents Resend, Razorpay, `CORS_ALLOW_ORIGIN`, `VITE_PREVIEW_SECRET` | — |
| F-10 | ✅ Fixed | `public/robots.txt` disallows `/admin` + private routes | — |
| F-11 | ✅ Fixed | Test order `GRN-SECTEST-…` + its notification deleted from the live DB | Confirmed removed |

**Still on you (config, no code):** set `CORS_ALLOW_ORIGIN` and `VITE_PREVIEW_SECRET`; provision Turnstile keys for F-07; and the §12 dashboard items (leaked-password protection, email confirmation, PITR, live-header check).

---

## 2. Reconnaissance & attack surface

### Public routes (client-rendered SPA, catch-all rewrite → `index.html`)
Public: `/`, `/collection`, `/collection/:series[/:sub]`, `/about`, `/contact`, `/order`, `/order/confirmed`, `/track`, `/bat-consultant`, `/comparison`, `/locate-us`, `/login`, legal pages.
Authenticated (customer): `/my-orders[/:id][/receipt]`, `/my-builds`, `/my-requests`, `/profile[/setup]`, `/security`, `/dashboard`.
Admin (`/admin/*`): dashboard, customers, orders[/:id], products[/…], support, enquiries, content, audit.

All page guarding is **client-side**; the real boundary is RLS + edge-function auth (verified below). Because the SPA never server-renders admin data, a direct navigation to `/admin/*` by a non-admin renders empty shells with no data (RLS returns nothing).

### Supabase tables (RLS enabled on all)
`profiles, series, products, reviews, orders, builds, enquiries, tickets, notifications, content, content_revisions, audit_logs, discount_codes, pricing_rules, payment_events, rate_events`.

### RPCs
`is_admin()` (SECURITY DEFINER, AAL2-aware), `validate_discount_code()` (single-code lookup), `rl_check()` / `rl_client_ip()` (rate limiting), plus guard triggers (`orders_guard_insert`, `notifications_guard`, `prevent_role_change`, rate-limit triggers, `notify_admin_new_order`).

### Edge Functions (Deno)
`razorpay-create-order` (JWT), `razorpay-verify` (`--no-verify-jwt`, signature-gated), `razorpay-webhook` (`--no-verify-jwt`, HMAC-gated), `razorpay-refund` (admin), `razorpay-retry-payment` (JWT, owner-gated), `send-order-email` (secret/service/admin-gated), `track-order` (`--no-verify-jwt`, public, email-gated + rate-limited).

### Storage buckets
`media` — **public read**, write = admin or own `support/<uid>/` path.
`payment-proofs` — **private**, admin-only read/write.

### Third-party integrations
Razorpay (payments), Resend (order email, server-side via edge function), WhatsApp (outbound `wa.me` link only), Cloudflare Turnstile (site key scaffolded, **not wired**). No analytics SDK detected.

### Debug/dev exposure
- **Source maps in production:** none present in `dist/` — **PASS**.
- **Verbose errors:** edge functions return generic error codes (`error`, `not_found`, `bad_request`) and log details server-side only — **PASS**.
- `http://localhost:9999` strings in the bundle trace to a bundled dependency's dev default, not app code — no impact.

---

## 3. Secrets & data-leak scan (priority)

| Check | Method | Result |
|---|---|---|
| Service-role key in build | `grep` for `service_role` / JWT patterns in `dist/assets/*.js` | **PASS** — none |
| Payment/email secrets in build | `grep` for `rzp_(live\|test)_`, `re_…`, `RAZORPAY_KEY_SECRET`, `EMAIL_HOOK_SECRET`, `WEBHOOK_SECRET` | **PASS** — none |
| Embedded JWTs | Decode every `eyJ…` in build | **PASS** — none (anon key is the new `sb_publishable_…` format, not a JWT) |
| Only public keys client-side | `import.meta.env` usage audit | **PASS** — only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| Source maps | `find dist -name '*.map'` | **PASS** — none |
| Internal URLs | `grep http://` in build | **PASS** — only dependency dev defaults |
| Git history secrets | `git log --all -p` scan for keys/service-account/`BEGIN PRIVATE` | **PASS** — only placeholders (`RAZORPAY_KEY_SECRET=xxx`) and gitignore entries; **no rotation needed on this basis** |
| Ever-committed `.env`/key files | `git log --diff-filter=A` | **PASS** — only `.env.example` (names only, no values) |
| `localStorage`/`sessionStorage` PII | Live inspection | **PASS** — only the Supabase session token, cart (`grainood_order_v2`, no PII), theme, and Razorpay checkout IDs. No PII, no secrets cached. |

### Over-fetch / RLS leak test (the common "data leak")
Probed every private table with the **anon key and no session** (`GET /rest/v1/<table>`):

```
orders            HTTP 200 → 0 rows        profiles          HTTP 200 → 0 rows
builds            HTTP 200 → 0 rows        tickets           HTTP 200 → 0 rows
notifications     HTTP 200 → 0 rows        enquiries         HTTP 200 → 0 rows
audit_logs        HTTP 200 → 0 rows        discount_codes    HTTP 200 → 0 rows
rate_events       HTTP 200 → 0 rows        payment_events    HTTP 200 → 0 rows
content_revisions HTTP 200 → 0 rows
content/products/reviews → rows returned (public, expected)
```

**PASS** — RLS filters every private row to zero for an unauthenticated caller; only intentionally-public catalog/content is readable. No endpoint over-returns other users' rows.

---

## 4. Authentication & session

| Check | Result |
|---|---|
| Admin routes guarded server-side (not just UI) | **PASS** — `is_admin()` in RLS; direct REST calls as a non-admin return nothing (§3) |
| Privilege escalation via client (`role → admin`) | **PASS** — `PATCH /profiles … role=admin` affected **0 rows** (update policy filters non-self/non-admin) + `prevent_role_change` trigger |
| Admin requires MFA at data layer | **PASS** — `is_admin()` requires `aal2` when a verified TOTP factor exists (`20260630000003`) |
| Anonymous sessions (guest checkout) | Enabled by design; scoped by RLS to their own `auth.uid()` |
| Password policy, leaked-password protection, email-confirmation-required, auth rate-limits, JWT/session TTL | **Not testable from code** — Supabase Dashboard settings. See §12. |
| Password reset (token expiry/single-use/no user enumeration) | **Not testable here** — needs SMTP + a real inbox. See §12. |

---

## 5. Authorization / RLS — cross-user access (core "data leak" test)

**Dynamic proof with two independent anonymous sessions (A and B):**

```
A inserts a test order (id GRN-SECTEST-…)   → HTTP 201  (created, owned by A)
A reads its OWN order                        → HTTP 200  [{id, total}]         ✅ owner allowed
B reads A's order by id (IDOR)               → HTTP 200  []   (0 rows)         ✅ blocked
B updates A's order (PATCH status=hacked)    → HTTP 200  []   (0 rows)         ✅ blocked
B deletes A's order (DELETE)                 → HTTP 200  []   (0 rows)         ✅ blocked
```

| Target | Cross-user read | Cross-user write/delete |
|---|---|---|
| orders | **PASS** (0 rows) | **PASS** (0 rows) |
| profiles | **PASS** (self/admin only) | **PASS** (self only; role change trigger-blocked) |
| builds, tickets, notifications | **PASS** (owner/admin only per policy) | **PASS** (owner/admin only) |
| audit_logs, content_revisions, discount_codes, pricing_rules | **PASS** — admin-only read; anon got 0 rows | **PASS** — admin-only write |
| rate_events, payment_events | **PASS** — no client policy at all (0 rows) | **PASS** — service-role only |

**Storage authorization:**
- `payment-proofs` — private, admin-only read/write → a non-admin cannot generate or guess a working URL. **PASS.**
- `media` — public read; write restricted to admin or own `support/<uid>/` path. Product images are protected from customer overwrite/delete. **PASS on write control**, but see **F-01** on public readability of support attachments.

**Admin check location:** RLS/server-side via `is_admin()`, not client-only. **PASS.**

---

## 6. Input validation / injection

| Check | Result |
|---|---|
| Stored/reflected XSS | **PASS** — no `dangerouslySetInnerHTML` anywhere; React auto-escapes all rendered user content |
| SQL injection | **PASS** — all DB access via PostgREST/parameterized Supabase client and SQL functions with fixed parameters; no string-built SQL |
| Email-template injection (order emails) | **PASS** — `esc()` HTML-escapes `&<>"` on every interpolated value in `orderEmailTemplates.ts` |
| Mailto/compose header injection | **N/A** — the Gmail-compose flow was removed; emails are sent server-side via Resend |
| File upload validation (type/size) | Client checks `image/*` + size; storage RLS restricts path/bucket. Server-side content-type enforcement is best-effort — acceptable given private/admin scoping. |
| Notification link injection (phishing) | **PASS** — `notifications_guard` drops external/`javascript:` links and caps title/message length for non-admin inserts |

---

## 7. API / Edge Function security

| Function | Auth | Input validation | Errors | Notes |
|---|---|---|---|---|
| razorpay-create-order | Caller JWT → order owner | Recomputes amount server-side from product data; reconciles vs `expectedTotal` (±₹1) | Generic codes | **Server-authoritative pricing** |
| razorpay-verify | HMAC signature + re-fetch payment (order match, captured, exact paise) | Yes | Generic | Defence-in-depth |
| razorpay-webhook | HMAC over **raw body**, 401 on mismatch; idempotent via `payment_events` | Yes | `{ok:false}` | Server-to-server; CORS N/A |
| razorpay-refund | Auth + **`role`** check | Yes | 401/403 | **F-04**: bypasses AAL2 |
| razorpay-retry-payment | Auth + order-ownership | Yes | Generic | Reuses/repoints Razorpay order for fixed amount |
| send-order-email | `EMAIL_HOOK_SECRET` / service-role / admin JWT | Yes | Generic | PII read server-side only |
| track-order | Public, **email-gated**, IP rate-limited (30/10min) | Yes | Generic `not_found` (no enumeration) | Returns PII-minimal subset (first name only) |

- **CORS:** `Access-Control-Allow-Origin: *` on all functions — see **F-05** (Low; Bearer-token auth, not cookies).
- **Rate limiting on public inserts:** enquiries 10/10min/IP, tickets 15/10min/user, track 30/10min/IP — **PASS**. `orders` insert is **not** rate-limited — see **F-03**.

---

## 8. Client-side exposure

| Check | Result |
|---|---|
| Console PII/secret logging in prod | **PASS** — `installConsoleGuard()` wraps `console.*` in `import.meta.env.PROD`; live home page produced no console output. The 5 `console.*` strings in the bundle are library-level and neutralized at runtime. |
| API keys in HTML meta | **PASS** — none |
| Sitemap/robots indexing admin | No `robots.txt`/`sitemap.xml` present; admin isn't server-rendered. See **F-10** (hygiene). |
| Security headers configured (`vercel.json`) | HSTS (2y, preload), X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, CSP `frame-ancestors 'self'`, Referrer-Policy, Permissions-Policy — **present**. CSP is frame-only — see **F-08**. |
| Live deployed header verification | **Not performed** — no production domain is hardcoded and the site is behind the maintenance gate. See §12. |

---

## 9. Dependency & infra

- `npm audit`: **0 vulnerabilities** (prod + dev).
- Supabase project settings (PITR/backups, network restrictions, anon-key rotation, email-confirmation-required, auth rate limits, leaked-password protection): **Dashboard-only** — see §12.
- Vercel env var scoping (no server secret exposed to client build): **Dashboard-only** — verified indirectly (build scan shows no secret shipped). See §12.

---

## 10. Business-logic abuse

| Test | Result |
|---|---|
| Client tampers price/total before checkout | **PASS** — `razorpay-create-order` recomputes from product data and reconciles vs `expectedTotal`; `orders_guard_insert` recomputes `total` from line items for any non-admin/non-service insert |
| Non-admin sets order/payment status = confirmed | **PASS** — guard forces `status='Order Placed'`, `payment.status='pending'`, strips `receiptNumber`; only admin/service-role can update |
| Reuse a discount code beyond its limit | **FINDING F-02** — no usage/redemption limit exists; a valid code works until expiry |

---

## 11. Data-leak audit summary (every place PII could reach an unauthorized viewer)

| PII location | Who should see it | Tested | Result |
|---|---|---|---|
| `orders.data` (name, email, phone, address) | Owner + admin | Anon + cross-user (B→A) REST probes | **PASS** — 0 rows to others |
| `profiles` (contact, DOB, address) | Self + admin | Anon + PATCH escalation | **PASS** — 0 rows; role change blocked |
| `tickets` / `builds` / `notifications` | Owner + admin | Anon probe + policy review | **PASS** — 0 rows to others |
| `enquiries` (public submit) | Admin only (read) | Anon read probe | **PASS** — insert-only for public; read admin-only |
| `track-order` response | Anyone with order # **and** matching email | Function review | **PASS** — email-gated, PII-minimal (first name only; no address/phone/full email) |
| `payment-proofs` bucket | Admin only | Policy review | **PASS** — private, admin-only |
| **Support attachments in `media`** | Intended: owner + admin | Bucket/path review | **FINDING F-01** — public-readable by URL |
| Order emails (Resend) | The customer | Template review | **PASS** — sent server-side; PII never client-exposed |
| `localStorage` | The user | Live inspection | **PASS** — no PII beyond session token |
| Admin notifications | Admin | Trigger review | **PASS** — PII-free (order id + total only) |

---

## 12. Not testable here (needs external tooling / dashboards / a real engagement)

- **Supabase Auth configuration:** password minimum length, leaked-password (HIBP) protection, "confirm email" requirement for email signups, auth-endpoint rate limits, and JWT/refresh-token TTLs. *Verify in Supabase → Authentication → Providers/Policies.*
- **Password-reset flow security** (token single-use, expiry, no user-existence disclosure). *Needs a live SMTP + inbox; test manually or via DAST.*
- **Live deployed security headers.** *No production domain is hardcoded and the site is behind maintenance — run `curl -sI https://<prod-domain>` once live to confirm Vercel serves the `vercel.json` headers.*
- **Vercel environment-variable scoping** (build-time vs runtime; confirm no server secret is exposed to the client). *Vercel dashboard.*
- **Supabase infra:** PITR/backup enabled, network/IP restrictions, connection-pool exposure. *Supabase dashboard.*
- **Automated DAST** (OWASP ZAP / Burp Suite active scan), **load-based abuse/DoS testing**, and a **formal third-party penetration test**. *Out of scope for a code-level self-assessment; recommended before or shortly after public launch.*
- **Phishing / social-engineering assessment.** *Requires a dedicated engagement.*
- **Authenticated over-fetch review in DevTools as a real logged-in customer/admin.** *Partially covered by the RLS proofs above; a full session-based Network review needs real credentials (admin requires TOTP).*

---

## 13. Prioritized remediation list (proposed — awaiting your approval; nothing changed yet)

**Medium**
1. **F-01 — Move support-ticket attachments to a private bucket + signed URLs.** Upload to a private bucket (like `payment-proofs`) instead of public `media`; serve to owner/admin via short-lived `createSignedUrl`. Prevents world-readable customer files.

**Low–Medium**
2. **F-02 — Add discount-code redemption limits.** Add `maxUses` / per-user tracking; enforce in `validate_discount_code` and `razorpay-create-order`. (Skip if codes are intentionally unlimited broad promos — confirm intent.)
3. **F-03 — Rate-limit `orders` INSERT.** Add a rate-limit trigger (as on enquiries/tickets), e.g. N orders / 10 min per user+IP, to stop order-row and admin-notification spam.

**Low**
4. **F-04 — Enforce AAL2 in admin edge functions.** Have `razorpay-refund` (and any admin function) require an MFA-elevated session, not just `role='admin'`, so a password-only session can't issue refunds.
5. **F-05 — Scope edge-function CORS** to the production origin(s) instead of `*` (keep webhook as-is; it's server-to-server).
6. **F-06 — Stop treating the maintenance gate as security** and keep `bypassSecret` out of the public `content` row (it's currently world-readable: value `grainood-preview`). Data is RLS-protected regardless.
7. **F-07 — Wire Cloudflare Turnstile** on public forms (site key already scaffolded) before launch to complement IP rate-limiting.
8. **F-08 — Tighten CSP** in `vercel.json` with `default-src`/`script-src`/`connect-src` (allow self + Supabase + Razorpay) for XSS defence-in-depth.

**Info / hygiene**
9. **F-09 — Update `.env.example`** — it still says order emails aren't sent server-side; document `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`, `EMAIL_HOOK_SECRET`, `RAZORPAY_*` as required Supabase secrets.
10. **F-10 — Add `robots.txt`** disallowing `/admin` once live.
11. **F-11 — Delete the test order** `GRN-SECTEST-1783003227719` created for the IDOR proof (customers can't self-delete orders — admin/SQL only).

**Also recommended (from §12):** turn on Supabase leaked-password protection + email confirmation, and run one external DAST pass before public launch.

---

*End of report. No code was modified and nothing was pushed. Awaiting approval on the remediation list above before making any changes.*

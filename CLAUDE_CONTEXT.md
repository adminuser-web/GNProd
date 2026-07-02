# CLAUDE_CONTEXT.md

> Session restore file. Working dir: `/Users/sailokesh/Documents/Grainood 2.0`
> Supabase project ref `ycebmqpayiiejcfukjra`. GitHub `adminuser-web/GNProd`, branches develop (work) / main (prod, Vercel auto-deploy).

---

## ⏱️ RESUME HERE (2026-07-02 — payments + orders + design session)

**Git:** `main` HEAD = `f7af4f4` (+ email/payment edge functions deployed after). `develop` == `main`, working tree clean. `npm run lint`/`test`/`build` all green (~99 tests). Deploy gate relaxed this session: user has been approving `main` pushes routinely; edge functions deploy via `supabase functions deploy` (CLI now authenticated — I deployed them).

**LIVE domain:** `grainood.com` → Vercel **gn-prod** (apex `A @ → 216.198.79.1`, `www CNAME → cname.vercel-dns.com`, Hostinger nameservers). Google Workspace email (Google MX/SPF/DKIM/DMARC). ⚠️ Never click Hostinger "Reset DNS zone". Site currently behind **Launching Soon / maintenance mode** (default OFF flag, but toggled ON in prod content) — bypass with `?preview=grainood-preview`.

**💳 RAZORPAY pay-at-checkout (LIVE on `main`, still TEST keys):** memory [[razorpay-payments]]. Cart → Place Order → `razorpay-create-order` (recomputes amount server-side from products via `_shared/pricing.ts`; creates Razorpay order + a pending "Awaiting Payment" DB order as service role) → Razorpay Checkout (UPI/GPay/card) → `razorpay-verify` (HMAC + **re-fetches payment from Razorpay: must be captured & exact amount** before marking paid) → confirmation. `razorpay-webhook` (payment.captured/order.paid, idempotent via `payment_events`, amount-checked) is the net. `razorpay-refund` (admin-only) issues auto FULL refund on cancel. **Anti-tamper: amount is fixed on the Razorpay order → gateway-enforced; client can't pay less.** Client: `src/lib/razorpayClient.ts`, OrderPage rewritten. Manual-UPI flow fully REMOVED (UpiPayBox/upi.ts/emailTemplates.ts deleted; admin Content "Payments (UPI)" gone; `brand.payments` type removed).
- **GO-LIVE (not done):** finish Razorpay KYC → generate `rzp_live_…` → `supabase secrets set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET` to live → add a **live-mode** webhook (separate per mode; URL `…/functions/v1/razorpay-webhook`, secret `grainood-rzp-hook-2026`, events payment.captured+order.paid) → then turn OFF maintenance. Rotate the test key_secret. TEST creds were `rzp_test_T8XVNEOOj3U6Gg`.

**📧 Resend order email + tracking (functions DEPLOYED):** memory [[order-email-tracking-setup]]. `send-order-email` fired by DB webhook trigger `order_email_webhook` (net.http_post) on orders INSERT/UPDATE → emails on **PAID** (payment→confirmed sends customer confirmation + admin alert to `ADMIN_EMAILS=orders@grainood.com`), and on status change. `_shared/orderEmailTemplates.ts`. ⚠️ **`send-order-email` MUST be `--no-verify-jwt`** or the gateway 401s the trigger's non-JWT bearer; auth = `EMAIL_HOOK_SECRET` (`grainood-hook-2026`) matched in the trigger. `track-order` (public, `--no-verify-jwt`) powers `/track` (public order lookup by number+email → status timeline + printable **Download receipt**). Confirmation email links to /track. If no emails: check `select ... from net._http_response order by created desc` (200 {"ok":true}=sent; not_configured=RESEND_API_KEY; ok:true+no mail=Resend domain not verified).

**🔀 Order lifecycle (online only; in-store tracked outside app):** `lib/orderStatus.ts` STAGE_FLOW = Processing → Ready for Shipment → Shipped → Delivered. Full: Awaiting Payment →(auto on payment) Processing →[admin] Ready for Shipment →[admin: partner+tracking] Shipped →[admin] Delivered. Cancel any time before Delivered → auto Razorpay refund. `AdminOrderDetailsPage` rewritten to per-stage actions + cancel-with-refund (manual payment-confirm + Gmail-draft flows REMOVED). Realtime: `orderService.subscribe*` now use Supabase channels (migration `20260702000005` adds orders to `supabase_realtime` publication) → admin/customer views update live; detail page also re-fetches after mutations.

**🔐 Security (memory [[security-posture]], 2026-07-02 pentest — all fixed):** RLS solid + MFA-gated (`is_admin()` needs aal2). Fixed: **F1** media bucket (was writable/deletable by any guest → admin-write only + own `support/<uid>/`); **F2** notification injection (`with check(true)` → restricted + link sanitizer); **F3** HTTP security headers in `vercel.json`; **F4** order-integrity guard trigger (forces status/payment on insert, recomputes total; service_role bypass added for the gateway); **F5** rate limiting (`rate_events`+`rl_check`; enquiries/tickets triggers + track-order 30/10min). **Console PII/secret masking** in prod: `src/lib/consoleGuard.ts` + `logRedaction.ts` (installed in main.tsx). Migrations: `20260702000001` (F1/F2), `000002` (F4), `000003` (F5), `000004` (razorpay), `000005` (realtime).

**🎨 Design (this session):** Home collection grid + `/collection` cards rebuilt to ONE consistent premium style — **gold border** (25%→70% on hover + glow), rounded, willow bat FLOATS on themed bg (transparent LazyImage container → black in dark / white in light; NO grey box). `bg-surface` tiles → `bg-bg`. Collection badges deduped. **Customer `MyOrdersPage`** revamped: Active/Past tabs + premium cards + 4-step mini-tracker. **Admin `AdminOrdersBoard`** tabs retuned to Active/Completed(=Delivered)/Cancelled + gold-accented rows (rows → detail page; the board's old detail DRAWER is orphaned dead code — offered to remove).

**Admin/creds:** `adminuser@grainood.com` / `Cricket@123_` + fresh TOTP (aal2). Supabase project `ycebmqpayiiejcfukjra`, region ap-south-1.

**Open / to-do (user actions):** (a) **go-live Razorpay live keys** before disabling maintenance; (b) apply any un-applied migrations (000004 razorpay, 000005 realtime) via SQL editor/`db push`; (c) delete smoke-test orders; (d) optionally remove the orphaned admin drawer. The unified Attribute model, maintenance mode, favicon fix, and DNS/email setup from prior sessions are all shipped (details in the historical sections below).

---

## Project Overview

**Grainood** — a premium **English Willow** cricket-bat e-commerce storefront + admin back office.

- **Business rules (non-negotiable):** English Willow ONLY (never Kashmir). Five fixed series in order: **Debutant → Millennium → Legend → Eternal → Immortal**. Prices in **INR**. Dark + gold theme (gold `#c5a059`, dark gold `#8a6d2f`) with light/dark mode. Mobile-first.
- **Tech stack:** React 19 + Vite 6 + TypeScript + Tailwind v4. Routing: react-router-dom v7 (`BrowserRouter`). Animations: `motion`. Toasts: `sonner`. Icons: `lucide-react`.
- **Backend: Supabase** (Postgres + Auth + Storage + RLS). **Firebase was fully removed** in this migration.
- **Hosting: Vercel** (auto-deploys on push to the connected branch). `vercel.json` rewrites all routes → `index.html` (SPA).
- **Supabase project:** ref `ycebmqpayiiejcfukjra`, region Mumbai. Uses the new **publishable** key format (`sb_publishable_…`). Email/password auth enabled.
- **GitHub:** `adminuser-web/GNProd`. Owner account: adminuser@grainood.com.

---

## Current State

**The Firebase → Supabase migration is COMPLETE and deployed to production (`main`).** The entire app (Auth, database, Storage) runs on Supabase. Bundle dropped from 1,219 kB → 766 kB after removing Firebase.

- **Auth:** Supabase email/password. Admin = `profiles.role = 'admin'`. The admin account **adminuser@grainood.com** is already promoted.
- **Data model = documents:** most tables store a full object in a `jsonb data` column (mirrors the app's nested TS types; chosen for minimal churn + AI-maintainability):
  - `products` (id = series slug, `data` = full Product incl. nested `subSeries[]`)
  - `orders` (id = custom order number text, `data` = full OrderRecord; + `user_id`, `status`, `total` columns)
  - `tickets` (`data` + `notes` jsonb)
  - `enquiries` (`data`)
  - `content` (PK `area`, `data`) + `content_revisions`
  - `profiles` (1:1 with auth.users; columns: full_name, phone, role, dob, address jsonb, marketing_consent, profile_completed)
  - `notifications`, `builds`, `customer_notes`, `pricing_rules`, `discount_codes`, `audit_logs`
- **Storage:** public `media` bucket. Paths: `products/…`, `content/brand/logo`, `content/brand/favicon`, `support/<uid>/<ticket>/…`, `payments/<order>/…`.
- **Migrations applied to the DB (all 1–8):** seeded with 5 products + 8 content areas. Catalog/content are live.

### Key file structure
```
src/lib/supabase.ts            # Supabase browser client (placeholder fallback so it never throws w/o env)
src/lib/storage.ts             # uploadToStorage(path, file) -> public URL (bucket 'media')
src/lib/themedImage.ts         # resolveThemedImage(img, theme) for ThemedImage = string | {light,dark}
src/lib/orderStatus.ts         # ALLOWED_TRANSITIONS, mapLegacyStatus, ORDER_STATUSES, STATUS_COLORS
src/lib/errorUtils.ts          # generic error helper (Firebase deps removed)

src/context/AuthContext.tsx        # Supabase auth; exposes user as AppUser {uid,email,displayName}; profile from `profiles`
src/context/ContentContext.tsx     # loads content via contentService.getAllAreas + deepMerge (FIXED — see below)
src/context/ProductsContext.tsx    # fetchProducts; falls back to PUBLISHED_PRODUCTS (from types.ts) if empty/error
src/context/OrderContext.tsx       # cart state (client-only, no DB)
src/context/ThemeContext.tsx       # 'light'|'dark', localStorage 'grainood_theme'

src/features/<domain>/services/*.ts  # ALL on supabase-js:
  audit/auditService.ts        # audit_logs (offset cursor pagination)
  content/contentService.ts    # content + content_revisions; getArea/getAllAreas/updateArea/getRevisions/seedContentIfMissing
  products/productService.ts   # fetchProducts/updateProduct(merge)/isCollectionEmpty/seedProducts
  products/pricingConfigService.ts + pricingConfigAdminService.ts
  orders/services/orderService.ts   # getOrder + create/update*; subscribe* are FETCH-ON-CALL (no realtime yet)
  orders/hooks/useOrders.ts    # useAllOrders/useUserOrders/useOrder (via orderService)
  notifications/services/notificationService.ts + hooks/useNotifications.ts
  builds/services/buildService.ts
  enquiries/services/enquiryService.ts + hooks/useEnquiries.ts
  support/services/ticketService.ts + hooks/useTickets.ts
  crm/services/crmService.ts (customer_notes) + hooks/useCustomers.ts

src/components/admin/ImageUpload.tsx          # auto-uploads on select; "use same for light & dark" toggle; supportThemes prop
src/components/admin/content/AdminContentEditorPage.tsx  # Content Studio (see In Progress)
src/components/SiteMeta.tsx                    # applies brand/SEO content -> <title>, meta description, favicon at runtime
src/components/Navbar.tsx                      # renders logo (resolveThemedImage) with GRAINOOD text fallback

supabase/migrations/2026062800000{1..8}_*.sql  # versioned schema (source of truth)
```

### Git state
- **See the "⏱️ RESUME HERE" block at the top for the current state (2026-07-02).** `develop` == `main` (HEAD `f7af4f4`), everything published. Everything below this line is historical context and may be superseded by the RESUME block.
- Workflow: build on `develop` → merge to `main` to publish (deploy gate). Publish command: `git fetch origin && git checkout main && git reset --hard origin/main && git merge develop && git push origin main && git checkout develop`.

---

## In Progress

**Content Studio redesign — ✅ COMPLETE & SHIPPED to `main`.** All 8 sections in `AdminContentEditorPage.tsx` are now purpose-built `Card`/`Field` forms (registry `SECTION_FORMS`), no more raw JSON keys:
- Brand & Identity (name, tagline, **logo**, **favicon**, contact, store, social) — logo renders in header; favicon/title/description apply live via `SiteMeta`.
- Homepage (hero: headline/sub/CTAs/**bg image + video**, featured), SEO (title/description/**share image**), Philosophy, Contact (intro + **FAQs** add/remove), Footer (**columns + links** add/remove + copyright), Legal (privacy/terms/returns), Reviews (**list** add/remove).
- The old generic `renderField` recursive editor remains only as a fallback (no area uses it now).

**Admin portal revamp — IN PROGRESS.**
- **Phase 1 (shipped to `main`, ffa1f65):** new shared kit `src/components/admin/ui.tsx` (`PageHeader`, `Card`, `Field`, `StatCard`, `SectionLabel`, `StatusPill`, `EmptyState`, `SearchInput`, `Segmented`); AdminLayout sidebar grouped into Overview / Commerce / Customers / Content & System (one `NavItem`, badges preserved); Dashboard (AdminPage) uses shared StatCard/PageHeader/Segmented.
- **Phase 2 (on `develop`, pending validation):** standardized headers + empty states across Audit, Enquiries, Products, Orders, Customers, Support using the kit. Fixed legacy date bugs: Enquiries `createdAt.toDate()`→`fmtDate()` (was showing N/A), `isNewOrder` in Orders board now tolerates ISO strings. Big pages (Orders/Customers/Support) were standardized surgically (header/empty/date) — bespoke filter rows + local StatusBadge/StatusPill left intact to limit risk (login-gated, no preview).
- **Notes:** `AdminCustomersPage` Customer360 renders dates via `new Date(createdAt?.toMillis ? toMillis() : createdAt || 0)` — display-only and ISO-safe (`new Date(isoString)` parses fine), so NOT a bug. `AdminRecordList.tsx` is dead code (flagged for deletion). Admin pages are login-gated → validate via the user, not the preview tool.

---

## Owner-flow improvements (on `develop`, pending ship)
Round 3 — customer + owner flow polish (scope the user approved):
- **`HowItWorks` component** (`src/components/HowItWorks.tsx`): 3-step Place → Confirm on WhatsApp → Pay via UPI explainer. `variant="full"` on ProductPage + checkout; `variant="compact"` in the cart drawer. Makes the pay-later model clear early.
- **Guest checkout** (`OrderPage.tsx`): removed the login wall — form always shows; on submit, guests get a silent **`supabase.auth.signInAnonymously()`** session so the order satisfies orders RLS (`user_id = auth.uid()`). Their email/phone is captured on the order regardless. **Graceful fallback**: if anonymous sign-ins are disabled, shows "Please sign in to place your order" (no crash). ⚠️ **ACTION NEEDED (user):** enable **Anonymous Sign-ins** in Supabase → Authentication → Providers for guest checkout to actually work. Verified disabled as of this round.
- **Dashboard Action Queue** (`AdminPage.tsx`): `ActionQueue` worklist at top — New orders to confirm (`status === 'Order Placed'`), Payments to verify (`payment.status submitted/processing`), Open support. Links to filtered boards. AdminOrdersBoard now reads `?status=` param (not just `?payment=`).
- **ProductPage buy box reordered** (`ProductPage.tsx`, `@ts-nocheck`): primary **ADD TO CART** now leads, ENQUIRE secondary, SAVE/SHARE demoted to subtle text actions; compact HowItWorks strip added. Mobile sticky CTA already existed.
- Not done this round (deferred): #6/#7 WhatsApp-customer button + one-click Confirm Payment on order detail; bundle code-splitting.

## Payments — gateway-free UPI (manual confirm) on `develop`
**Decision (after solution-arch review): NO payment gateway.** Driver = security/compliance simplicity; manual confirmation is acceptable; India-first, international (PayPal/Wise) later. **Razorpay scaffold was removed** (create-payment-link, razorpay-webhook, _shared/razorpay.ts, payment_events migration deleted). Also rejected the arch's microservices/FastAPI suggestion as over-engineering for a solo-maintained low-volume shop — staying a modular monolith.
- `src/lib/upi.ts` — `buildUpiUri()` builds `upi://pay?pa=&pn=&am=&cu=INR&tn=` (pure string, no keys); `hasUpiConfigured()`.
- `src/components/UpiPayBox.tsx` — customer Pay-via-UPI box (amount, QR via `qrcode.react`, copy-UPI-ID, mobile deep-link button, "I've paid → WhatsApp" hand-off). Graceful fallback when no UPI id set. Rendered on `OrderDetailPage` when `payment.status !== 'confirmed'`.
- Admin `AdminOrderDetailsPage` — "Request Payment (WhatsApp)" button (prefilled msg w/ UPI id + amount + order ref + tap-to-pay link). Existing "Mark Paid" confirms (→ in-app notification via notificationService; no email).
- UPI config in **brand content** (`brand.payments.upiId`/`upiPayeeName`), editable in admin → Content → Brand → "Payments (UPI)". `OrderPayment`/`PaymentStatus` simplified (pending/submitted/confirmed/failed/refunded; no gateway fields). `paymentGateway` feature flag removed.
- New dep: `qrcode.react@4`. **ACTION (user):** set the business UPI ID in admin Content → Brand (else customers see the WhatsApp fallback). No deploy/keys needed — UPI is keyless.
- ⚠️ `UpiPayBox` is on the login-gated order page → verify visually on a real order (lint/build pass; UPI-URI logic preview-tested).

## Unified order flow (on `develop`)
One linear lifecycle across admin + customer — payment, delivery, cancellation all in one place (no separate payment/tracking sections).
- **4-stage model** (`orderStatus.ts`): `STAGE_FLOW = Placed → Processing → Shipped → Delivered` + `stageIndex()`/`STAGE_LABELS`. Transitions: confirming payment → **Processing**; Processing → Shipped; Shipped → Delivered; **Delivered is terminal**; **Cancel allowed any time before Delivered**.
- **orderService**: `updatePaymentStatus` confirm now sets status **Processing** (was 'Payment Confirmed'); new **`cancelOrder(id, reason, by)`** stores `order.cancellation {reason,at,by}`, sets Cancelled, customer notification with the reason. Delivery stored in `order.shipment {courierName(=partner), trackingNumber, trackingUrl, dispatchDate, estimatedDeliveryAt}`.
- **Admin `AdminOrderDetailsPage`** — fully rewritten to ONE panel: stepper + contextual stage action (Send Payment Email → Confirm Payment [proof optional] → delivery form → Mark Shipped → Mark Delivered), Cancel-with-reason modal (until delivered), payment+proof summary (signed URL) once paid, compact customer/items. Tabs removed.
- **Customer `OrderDetailPage`** — `StatusTracker` now 4-stage; one "Order Progress" card merges payment status + delivery details (partner/dispatch/expected/**Track** link) ; cancellation-reason banner when cancelled; removed the separate payment grid + shipment box. `UpiPayBox` still shown when unpaid.

## Admin order emails — Gmail compose (no auto-send, NO email provider) on `develop`
The admin **opens a pre-filled Gmail draft** and sends it themselves — there is **no server-side email** (Resend path fully removed; `supabase/functions/` deleted again — no edge functions in repo). Turnstile for enquiries = deferred follow-up.
- `src/features/orders/emailTemplates.ts` — `buildOrderEmail(template, order, {paymentLink, brandName})` → `{subject, body}` plain text (concise: item lines + total + link, capped); `buildGmailComposeUrl({sendFrom,to,subject,body})` → `https://mail.google.com/mail/?authuser=<email>&view=cm&fs=1&to=&su=&body=` (all `encodeURIComponent`, `%0A` newlines). Verified in preview (well-formed, ~600 chars).
- **Configurable send-from**: `brand.orderEmailFrom` (default `adminuser@grainood.com`), edited in admin Content → Brand → "Order Emails". `authuser=` targets that Google account even with several signed in.
- Admin `AdminOrderDetailsPage.handleOpenGmail`: validates `https` link (payment_request), builds draft from the loaded order (admin authorized), `window.open(gmailUrl)`. Pop-up-blocked → modal shows draft + **Copy** button (no silent fail). Records `payment.emailPreparedAt` via `orderService.markEmailPrepared` (NOT "sent"). Toast "Gmail draft opened — review and send."
- **`migration 20260630000001`** (KEPT, unrelated to email) — **private `payment-proofs` bucket** + admin-only storage RLS; SECURITY DEFINER **`orders_notify_admin` trigger** → PII-free admin notification on new orders (replaced client-side notif in `createOrder`).
- `src/lib/storage.ts` `uploadPrivate()` + `getSignedUrl()`; Payment tab "Upload Proof & Confirm" → private bucket, confirm (`confirmedBy`/`confirmedAt`), advance to **Processing**.
- **PII hygiene**: "Open Customer 360" uses **router state** not `?userId=` (AdminCustomersPage reads `location.state`, query fallback); sanitized enquiry error log; customer email only enters the Gmail URL the admin opens.
- Security audit: **RLS ON for all 16 tables**, `is_admin()` + `prevent_role_change` exist. Flagged: `discount_codes` SELECT is `using(true)` (world-readable promo codes) — fix candidate; `notifications` insert permissive (admin-read only). Legacy dup tables `support_tickets`/`series` orphaned.
- **ACTION (user):** only run migration `20260630000001` in the SQL editor (private proof bucket + admin-notify trigger). **No function deploy, no secrets, no DNS** needed for emails anymore. Set `brand.orderEmailFrom` + UPI id in admin Content. Firebase remnants are cosmetic-only.

## Transactional email — REMOVED (user decided against it)
The whole email system was deleted at the user's request: `supabase/functions/` (send-email + _shared) removed, the deployed `send-email` edge function deleted from Supabase, and all 8 email secrets (incl. the Gmail app password) unset. **There are no edge functions anymore** — `supabase/` holds only migrations. In-app notifications (`notifications` table / `notificationService`) still exist; only email was removed. If a Database Webhook on `orders` → `send-email` was ever created in the dashboard, delete it (it now points at a deleted function).

## Known Issues & Bugs

- **Bundle size:** main chunk 766 kB > Vite's 500 kB warning. Not addressed (candidate: `manualChunks`). Non-blocking.
- **Admin Support/Customers tables** may share the same hover/overlap pattern that was fixed in the Orders board — **unverified** (admin pages are login-gated; can't render in the preview tool). If reported, apply the same grid-rebalance fix used in `AdminOrdersBoard.tsx`.
- **Realtime is gone:** `orderService`/`ticketService` `subscribeTo*` are now fetch-on-call (return no-op unsubscribe). Admin boards don't live-update; they refetch on mount. Re-add Supabase realtime channels during hardening if desired.
- **Other date displays** may still use Firestore-style `createdAt.toDate()` (timestamps are ISO strings now). Fixed in AdminOrdersBoard; audit others if "N/A"/invalid dates appear.

### Security — ✅ DONE (2026-06-29)
- **Revoked** the Supabase Management API token named `migration` (user confirmed deleted on the dashboard).
- **Deleted** `~/Downloads/Grainood Keys - Sheet1.csv` (verified gone).
- The Supabase **`service_role` key was already rotated** by the user.
- Repo scanned: no live `sbp_`/`service_role`/JWT values in tracked files (only comments/docs that mention them).
- Never commit secrets. `.env.local`, `serviceAccountKey.json`, `*serviceAccount*.json`, `.supabase-token*` are gitignored.

---

## Key Decisions Made

- **Document (jsonb) data model over normalized tables.** The init migration (`…0001`) created normalized tables; migrations `…0002`/`…0003` reshaped catalog/orders into `id + data jsonb` documents to match the app's deeply-nested TS types (`Product` with `subSeries[]`, rich `OrderRecord`). Far less reshaping in the app + better for AI-assisted edits. Tickets/enquiries followed the same pattern.
- **Normalized `user.uid` via `AppUser`.** Supabase users expose `id`, not `uid`. `AuthContext` maps to `{ uid, email, displayName }` so the ~15 files using `user.uid` were untouched.
- **`is_admin()` via `profiles.role`** (SECURITY DEFINER fn) — replaced Firebase custom claims. No more claim/token-refresh pain; promote with one SQL update.
- **Supabase chosen over Convex/Pocketbase** for long-term sustainability (Postgres = portable, no lock-in) + Vercel synergy + AI-maintainability (explicit SQL schema).
- **Storage = single public `media` bucket** with authenticated-write policies (tighten by path prefix later).

### What didn't work / gotchas (don't repeat)
- **`deepMerge` shredded strings into char-indexed objects** (`Object.assign({}, "str")` → `{0:'/',1:'h',…}`) when a string default met an object value. **FIXED**: on type mismatch the source value wins (see snippet below). This was why content "wasn't reflecting." DB content was re-seeded clean.
- **`prevent_role_change` trigger bootstrap bug**: it blocked ALL role changes when `auth.uid()` is null (SQL editor / service_role) → impossible to make the first admin. **FIXED** in migration `…0007` (only block an *authenticated non-admin* user).
- **Video field stored as `{light,dark}` object** (themed) broke the homepage `<video>`. **FIXED**: video fields use `supportThemes={false}` (single string). The corrupted `videoUrl` was reset in the DB.
- **Migrations weren't idempotent** ("customer_notes already exists" on re-run) — for re-runs, prepend `drop ... if exists` / `drop policy if exists`.
- **`createClient('', '')` throws** → `src/lib/supabase.ts` uses placeholder fallbacks so unit tests/builds without env don't crash.
- **`@ts-nocheck` on ProductPage.tsx** hid a duplicate-import error from CI (tsc skipped it; esbuild tolerated it; the Vite dev Babel transform did not). Watch for this file.
- **Org policy blocks service-account key creation** — provisioning was done via `firebase login` (legacy), `gcloud auth application-default login`, and finally the **Supabase Management API token**. Direct DDL needs the Management API token or SQL editor (the service_role key can't run DDL and the role-change trigger blocked its PATCH).
- **Vite dev server stale-tab**: after edits, a normal refresh sometimes serves old code; use a full reload / Incognito. `DISABLE_HMR` is NOT set, so file-watching works.

---

## Next Steps

**Content Studio is done.** The next task is the **broader admin-portal redesign** (user's goal: "clean and simple, fewer options"). Suggested approach: reuse the Content Studio's visual language — `Card`/`Field` helpers (currently local to `AdminContentEditorPage.tsx`; consider extracting to a shared `src/components/admin/ui/` module), section headers with description, sticky save bars, restrained option density. Start with the highest-traffic admin pages (Dashboard, Sales/Orders, Products) and simplify each. Confirm scope/priority with the user before a big build (they prefer phase-wise with approval for large changes).

Each admin change: keep `lint`/`test`/`build` green, commit to `develop`, merge to `main` to ship (the deploy gate). Admin pages can't be rendered in the preview tool (login-gated) — rely on lint/build + the user's validation.

### Commands to get back to this state
```bash
cd "/Users/sailokesh/Documents/Grainood 2.0"
npm ci                 # install deps
# .env.local must contain (gitignored; also set in Vercel):
#   VITE_SUPABASE_URL=https://ycebmqpayiiejcfukjra.supabase.co
#   VITE_SUPABASE_ANON_KEY=<the sb_publishable_… key>
npm run dev            # vite dev server on http://localhost:3000 (watch enabled)
npm run lint           # tsc --noEmit   (MUST be green before "done")
npm run test           # vitest run     (2 files, 10 tests)
npm run build          # vite build
```
- **Admin login:** sign in as adminuser@grainood.com (must re-login if role just changed).
- **Apply a new migration:** add a file in `supabase/migrations/`, then run it in the Supabase SQL Editor (paste + Run) — or via the Management API token if available. Migrations 1–8 are already applied to the live DB.
- **Promote an admin:** `update public.profiles set role='admin' where email='<email>';` (works now that the role-change trigger is fixed).

---

## Important Code Snippets / Patterns

- **Themed images:** `type ThemedImage = string | { light?: string; dark?: string }`. Render with `resolveThemedImage(img, theme)` (a plain string serves both themes). The "Use same for light & dark" toggle in `ImageUpload` stores a single string when on, `{light,dark}` when off.
- **Option IDs are kebab-case** (`bat-size`, `toe-shape`, `grip-color`, …) — never rename.
- **`ImageUpload` (`src/components/admin/ImageUpload.tsx`):** auto-uploads valid images on select (no separate "Upload Now"); oversized images wait for compress. `supportThemes={false}` → single string (use for video, favicon). Uploads go to Supabase Storage via `uploadToStorage`.
- **The fixed `deepMerge` (ContentContext) — keep this shape:**
  ```ts
  function deepMerge(target, source) {
    if (!isObject(target) || !isObject(source)) return source; // type mismatch/leaf -> source wins
    const output = { ...target };
    Object.keys(source).forEach(k => {
      output[k] = (isObject(target[k]) && isObject(source[k])) ? deepMerge(target[k], source[k]) : source[k];
    });
    return output;
  }
  ```
- **Document round-trip:** services return `{ ...row.data, id: row.id }`; writes do `upsert({ id, ..., data })`. Partial updates fetch-merge into `data` (e.g. `productService.updateProduct`, `orderService.update*`).
- **Audit:** `auditService.writeAudit({ action, entityType, entityId, after })` — best-effort (never throws). Valid `action` values are a fixed union in `src/features/audit/types.ts` (`settings_updated` is used for content).
- **Timestamps:** write ISO strings (`new Date().toISOString()`), NOT Firestore `serverTimestamp()`. When formatting, handle both ISO strings and legacy `.toDate()`.
- **Seeds:** catalog from `PUBLISHED_PRODUCTS` (in `src/types.ts`), content from `DEFAULT_SITE_CONTENT` (also `src/types.ts`). `productService.seedProducts(true)` re-seeds catalog (admin "Seed Products" button at `/admin/products`).
- **RLS mental model:** catalog/content/reviews = public read, admin write; orders/builds/tickets/notifications = owner or admin; enquiries = public insert + admin read; audit_logs = admin read + insert-only.
- **`SiteMeta`** (mounted in `App.tsx` inside `<Router>`) applies `brand.faviconUrl`, `brand.brandName`/`tagline` → `<title>`, and `seo.defaultDescription` → meta description at runtime.

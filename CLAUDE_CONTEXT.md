# CLAUDE_CONTEXT.md

> Session restore file. Last updated after the Supabase migration + full Content Studio (all sections shipped to main).
> Working dir: `/Users/sailokesh/Documents/Grainood 2.0`

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
- Branch **`develop`** = working branch, HEAD `e69539e` (full Content Studio).
- **`main`** = production (Vercel deploys it), `a0d06d4`. **`develop` and `main` are IN SYNC** (Content Studio fully shipped).
- Workflow: build on `develop` → merge to `main` to publish (deploy gate). When merging, local `main` often lags `origin/main`; reconcile with `git checkout main && git reset --hard origin/main && git merge develop && git push origin main`.

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

## Payment gateway — Razorpay (Phase 1 scaffold on `develop`)
Decisions: **Razorpay**, **payment-link-after-WhatsApp-confirm** model, server code in **Supabase Edge Functions**. App had NO backend before this.
- **Phase 1 (done, on `develop`, NOT shipped):**
  - `src/types.ts` — typed `OrderPayment` + `PaymentStatus` (permissive `[k:string]:any`; adds Razorpay fields gatewayLinkId/Url, gatewayPaymentId, refunds…).
  - `src/config/features.ts` — `paymentGateway: false` flag (gates all UI; keep off until tested).
  - `supabase/functions/create-payment-link/` — admin-only; computes amount server-side from order, creates Razorpay link, stores on order (`payment.status='link_sent'`).
  - `supabase/functions/razorpay-webhook/` — verifies HMAC on raw body, idempotent via `payment_events`, marks order `confirmed` + audit + customer notification. Deploy with `--no-verify-jwt`.
  - `supabase/functions/_shared/` — cors + razorpay helpers (auth header, `verifyWebhookSignature`, `createPaymentLink`).
  - `supabase/migrations/20260629000001_payment_events.sql` — idempotency ledger, RLS on, no policies (service-role only).
  - `supabase/functions/README.md` — full deploy/secrets/webhook runbook.
  - Schemas matched to reality: notifications = flat cols (`user_id, role_target, type, title, message, read`); audit_logs = `actor_user_id/actor_name/action/entity_type/entity_id/before/after`; orders has no `receipt_number` col (read from `data`).
- **BLOCKED ON USER:** Razorpay account + KYC (multi-day), then TEST keys. **Phase 2** = wire admin "Generate & send link" + customer pay handling behind the flag, test end-to-end. **Phase 3** = refunds, reconciliation, live keys.
- ⚠️ Edge functions are Deno (import from esm.sh/deno.land) — they live OUTSIDE `src`, so `tsconfig` (include: ["src"]) and `npm run lint` do NOT type-check them. Validate by deploying to Supabase.

## Transactional email — Resend (scaffold on `develop`)
Decisions: **Resend**, triggered by a **Supabase Database Webhook on `orders`** (INSERT+UPDATE) → one `send-email` edge function. Covers storefront, admin, and the Razorpay payment webhook because all write to `orders`.
- `supabase/functions/send-email/` — routes DB-webhook events: INSERT → order-placed (customer) + new-order alert (owner); UPDATE → payment-confirmed (when `data.payment.status` flips to confirmed), Shipped/Delivered/Completed/Cancelled status emails. Shared-secret header `x-webhook-secret`. Returns 200 even on send failure (no retry double-send).
- `supabase/functions/_shared/email.ts` (Resend client + branded inline-HTML layout/itemsTable/button) + `emailTemplates.ts` (per-event).
- Recipient email read from `order.data.customer.email` (works for guests).
- Deploy `--no-verify-jwt`; secrets RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, OWNER_EMAIL, EMAIL_WEBHOOK_SECRET, SITE_URL, BRAND_NAME. Full steps + DB-webhook config in `supabase/functions/README.md`.
- **BLOCKED ON USER:** Resend account + domain DNS (SPF/DKIM) + API key. Testable with `onboarding@resend.dev` sandbox before DNS. No frontend changes needed (DB-driven).

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

# Grainood — Test Report

_Comprehensive test pass. Supabase + Vite + React (TypeScript). Generated from an automated + static audit; no app/business logic was changed — only tests, CI, and this report were added._

> Note on environment: this pass ran in a sandbox **without Docker**, so `supabase start` (local Supabase) and **Playwright browser** runs could not be _executed_ here. Those suites were **authored and wired into CI** so they run on every push; results below distinguish **executed here** vs **authored / runs in CI**. See [§ Could not test here](#could-not-test-here).

---

## Executive summary

| | |
|---|---|
| **Overall production-readiness** | **🟡 Conditional GO** for a low-volume launch |
| **Critical issues** | **0** (in everything testable here) |
| **High** | 1 (admin MFA not enabled) |
| **Medium** | 4 (discount-codes world-readable, bundle size, unpaginated admin lists, contrast/axe unverified) |
| **Build / lint / unit** | ✅ green — 51 unit tests pass, 0 vulns, no secrets in bundle |

**Go / No-Go:** **GO, conditional** on four items before/at launch: (1) apply the `payment-proofs` storage migration to production; (2) run the authored **RLS + E2E** suites green in CI; (3) lock down the world-readable **`discount_codes`** table; (4) enable **MFA** on admin accounts. No Critical defects were found in the testable surface; the conditions are about *proving* the security model live and closing known gaps.

**What's now automated:** lint (tsc), 9 unit suites (51 tests) + coverage, an RLS/policy suite, Playwright E2E (customer journey, auth guards) + axe a11y — all wired into GitHub Actions (`.github/workflows/ci.yml`) gating merges.

---

## A. Build & static health — ✅ executed here

| Check | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | ✅ pass, 0 errors |
| `npm run test` | ✅ 51 passed / 0 failed (9 files) + 6 skipped (RLS, no DB) |
| `npm run build` | ✅ pass (~1.4s) |
| `npm audit` | ✅ **0 vulnerabilities** (Critical 0, High 0) |
| **Secret scan of `dist/`** | ✅ **only** the Supabase URL + `sb_publishable_…` anon key present — **no** `service_role`, JWT, `EMAIL_API_KEY`, `SMTP_PASS`, or other server secret |

**Bundle:** main chunk `index-*.js` = **771.75 kB (gzip 225.82 kB)** — exceeds Vite's 500 kB warning. Routes are well code-split (35 `lazy()` imports); largest route chunks AdminProductEditor 57 kB, OrderDetailPage 53 kB, ProductPage 47 kB.

| Finding | Sev | Evidence | Suggested fix |
|---|---|---|---|
| Main vendor chunk > 500 kB | **Medium** | build output `index-*.js 771 kB` | `build.rollupOptions.output.manualChunks` to split react / supabase-js / motion; confirm `@google/genai` (15 MB in node_modules) is not eagerly bundled |

Secret-scan note: had any server secret appeared in `dist/`, it would be **Critical** — it did not. ✅

---

## B. Unit tests (vitest) — ✅ executed here

Added **5 suites / 31 tests** (all pass) over the core pure logic:

| Suite | Covers | File |
|---|---|---|
| `orderStatus.test.ts` | status mapping, `stageIndex`, transition rules (Delivered terminal, cancel-before-delivery) | `src/lib/orderStatus.test.ts` |
| `pricing.test.ts` | base + option deltas, inactive groups ignored, % rules, discount codes, clamp ≥ 0 | `src/lib/pricing.test.ts` |
| `emailTemplates.test.ts` | Gmail compose URL (authuser targeting, `view=cm`, encoded subject/body/`%0A`), link inclusion, long-list summarisation | `src/features/orders/emailTemplates.test.ts` |
| `upi.test.ts` | UPI intent encoding, 2-dp amount, empty-on-missing-VPA, VPA validation | `src/lib/upi.test.ts` |
| `themedImage.test.ts` | string/dark/light resolution + fallbacks | `src/lib/themedImage.test.ts` |

**Coverage (instrumented modules):** Statements **49.75%**, Branches **41.86%**, Functions **28.76%**, Lines **49.51%**. Strong on tested pure logic — upi 100%, emailTemplates 95%, orderStatus 89%, consultantRules 90%, pricing 49% (core paths).

| Finding | Sev | Evidence | Suggested fix |
|---|---|---|---|
| Services/hooks/contexts largely uncovered by unit tests | Low | `orderService.ts` 2.3%, `auditService`, `notificationService` low | These are DB-bound → covered by the RLS/integration suite (Category C/D) rather than unit tests |
| Checkout validation (name/phone/pincode/email) is **inline & not exported** | Low | `src/components/OrderPage.tsx` `validate()` | Extract to `src/lib/validation.ts` and unit-test (Indian 6-digit pincode, 10-digit phone, email) |

---

## C. Integration (local Supabase) — ⏸ authored / runs in CI

Could not execute here (Docker unavailable). **Authored** `tests/rls/rls.test.ts` (also serves Category D) and a CI job that runs `supabase start`, applies migrations, and executes it against a throwaway DB. Covers auth (service-role user creation, sign-in), order create→read lifecycle, and policy enforcement. Skips cleanly when DB env is absent (so `npm run test` is unaffected).

---

## D. Security & RLS — ⭐ highest priority

### RLS coverage — ✅ executed (static, from migrations) — **PASS 16/16**
Every `public` table has **RLS enabled**:

`audit_logs, builds, content, content_revisions, customer_notes, discount_codes, enquiries, notifications, orders, pricing_rules, products, profiles, reviews, series, support_tickets, tickets` — all have `alter table … enable row level security` (evidence: `supabase/migrations/20260628000001_init_schema.sql` lines 252–263, plus per-feature migrations). **No table is left unprotected** → a stranger with the anon key cannot blanket-read any table.

### World-readable `select using (true)` policies
Intentional public catalog/content: `products`, `reviews`, `series`, `content`, `pricing_rules`. **One outlier:**

| Finding | Sev | Evidence | Suggested fix |
|---|---|---|---|
| **`discount_codes` is world-readable** — anyone can enumerate all promo codes via the anon REST endpoint | **Medium** | `supabase/migrations/20260628000006_pricing.sql:19` `discount_codes_read … using (true)` | Restrict SELECT to `is_admin()` and validate codes server-side (edge function/RPC), or expose only redeemed/active state |

### Admin model — ✅
`is_admin()` SECURITY DEFINER + `prevent_role_change` trigger present (`init_schema.sql:41,72`). Orders/profiles policies are owner-or-admin (`orders_select using (user_id = auth.uid() or is_admin())`, `profiles_select using (id = auth.uid() or is_admin())`).

### Policy tests — ⏸ authored / runs in CI
`tests/rls/rls.test.ts` asserts, using the **anon client as two different customers**: anon cannot read `profiles`; a customer reads only their **own** order; a customer **cannot** read another's order, **cannot** escalate their role, and **cannot** change order status/payment. Admin (service role) can. Not executed here (no Docker) — runs in the CI `rls` job.

### Storage — ✅ static / live pending
`payment-proofs` bucket is created `public=false` with admin-only policies (`20260630000001_payment_proofs_and_admin_notify.sql`). Access is via short-lived admin **signed URLs** (`getSignedUrl`). ⚠️ **This migration must be applied to production** (still pending per project notes) before proof upload/read works.

### PII exposure — ✅ executed
- **Logs:** only generic messages (`'Error fetching customer note'`, `'enquiry_submit_failed'`) — **no** name/email/phone/address values logged.
- **URLs:** the previous `?userId=&orderId=` admin nav was moved to **router state** (`AdminOrderDetailsPage` → `AdminCustomersPage`); no PII in query strings.
- **Analytics:** no analytics SDK found emitting PII.

### Input / injection — ✅
No raw SQL string concatenation on the client — all DB access is via parameterized `supabase-js`. The Gmail link field is validated `https` in `handleOpenGmail`, and the email body is `encodeURIComponent`-escaped (unit-tested). Email template HTML escapes interpolated values (`esc()` in the former server template).

### Auth hardening
| Finding | Sev | Evidence | Suggested fix |
|---|---|---|---|
| **Admin MFA not enabled** | **High** | Supabase Auth (no TOTP enforced) | Enable MFA for admin accounts; admins can read all customer PII, so the admin login is the real blast-radius control |
| Protected routes guarded in **both** UI and RLS | ✅ Info | `AdminLayout` (`Navigate to /login` + `isAdmin`) **and** RLS `is_admin()` | UI guard is convenience; RLS is the real boundary — confirmed |
| Session tokens in `localStorage` (Supabase default) | Low/Info | supabase-js default | Acceptable for an SPA; mitigated by no untrusted `dangerouslySetInnerHTML`. Consider PKCE + short token TTL |
| Password-reset flow not verified | Low | not exercised here | Add an E2E for reset-email → set-new-password |

---

## E. E2E critical journeys (Playwright) — ⏸ authored / runs in CI

Authored `playwright.config.ts` (desktop + Pixel-5/mobile projects) + specs:
- `e2e/customer.spec.ts` — home → collection (5 series) → product → **add to cart** → checkout shows guest form + "How it works".
- `e2e/auth.spec.ts` — unauthenticated `/admin/*` and `/my-orders` **redirect to `/login`**; login form renders.
- `e2e/a11y.spec.ts` — axe scan (below).

Not executed here (no browser/server). Runs in the CI `e2e` job (`npx playwright install --with-deps chromium`). The admin proof-upload/payment-confirm journey needs a seeded admin session + local Supabase — recommended as a follow-up E2E once the RLS DB harness is green.

---

## F. Performance — 🟡 partial (static) + recommendations

| Finding | Sev | Evidence | Suggested fix |
|---|---|---|---|
| Admin lists are **capped, not paginated** | **Medium** | `useCustomers.ts:38-39` `profiles/builds .limit(500)`, `ticketService.ts:28` `.limit(500)`, `orderService.ts:26` `.limit(200)` | Server-side pagination + counts; the Customers page also does an O(orders×customers) **client-side join** that won't scale |
| Main bundle 771 kB | Medium | (see §A) | manualChunks vendor split |
| Lighthouse not run | — | no Chrome CLI here | Run `lhci`/Lighthouse on home, collection, series, product, checkout in CI |
| Images lazy-loaded | ✅ | `LazyImage` used in 13 components | — |

---

## G. Accessibility — ⏸ axe authored; static notes

| Finding | Sev | Evidence | Suggested fix |
|---|---|---|---|
| Low-contrast muted text (dark+gold) unverified | **Medium** | pervasive `text-muted`, `opacity-50`, `text-[9px]` | Run the authored `e2e/a11y.spec.ts` (axe wcag2aa); verify gold `#c5a059`/muted on dark meets 4.5:1 |
| Tiny type (`text-[8px]/[9px]`) | Low | admin labels | Ensure ≥ 12px effective for body/labels |
| Semantics | ✅ Info | buttons/links are semantic; logo SVGs have `aria-label`; `LazyImage` requires `alt` | keep alt text meaningful |

---

## H. Responsive / mobile — 🟡 static + mobile E2E authored

Tailwind is mobile-first with `sm/md/lg/xl` breakpoints throughout; a **Pixel-5 (~360px) Playwright project** is configured. Spot-checks during development looked clean (navbar, product buy box, checkout sticky CTA). Recommend running the mobile E2E project to assert no overflow on home/collection/product/checkout at 360/768/1280.

---

## I. Reliability & UX states — ✅ executed (static) — **PASS**

| Item | Status | Evidence |
|---|---|---|
| Top-level error boundary | ✅ | `src/components/ErrorBoundary.tsx` (in `App.tsx`) |
| 404 route | ✅ | `App.tsx:159` `path="*" → NotFoundPage` |
| Loading skeletons / empty states | ✅ | `Skeleton`/`EmptyState` across 20 components |
| Graceful failure | ✅ | placeholder Supabase client, `UpiPayBox` WhatsApp fallback, Gmail pop-up-blocked fallback |
| Silent service errors | Low | several services `console.error` and return `[]` (e.g. `orderService.subscribeToAllOrders`) — not always surfaced to UI |

---

## J. Data integrity — ✅ executed (static) — **PASS**

| Rule | Status | Evidence |
|---|---|---|
| Orders store an **immutable snapshot** (editing a product later doesn't alter history) | ✅ | `OrderPage.tsx:182` `snapshottedItems` freezes `productName`, `basePrice`, `unitPrice`, `selections` into the order `data` |
| Receipt gated on `payment.status === 'confirmed'` | ✅ | `OrderDetailPage.tsx:337` `canDownloadReceipt` |
| Payment/status transitions valid & admin-only | ✅ | `ALLOWED_TRANSITIONS` (unit-tested) + orders are admin-update-only via RLS; `updatePaymentStatus` confirm → Processing |

---

## Prioritized remediation backlog

> None of these were changed — listed for your approval as follow-up tasks.

**Critical** — none.

**High**
1. **Enable admin MFA** in Supabase Auth (biggest blast-radius control). _[D]_

**Medium**
2. **Lock down `discount_codes`** — restrict SELECT to `is_admin()` + validate codes server-side. _[D]_ (migration + small edge fn/RPC)
3. **Apply the `payment-proofs` migration to production** so proof upload + new-order admin notifications work; then run the live storage RLS test. _[D]_
4. **Paginate admin Orders/Customers/Tickets** (server-side) and replace the client-side customer↔order join. _[F]_
5. **Code-split the vendor bundle** (`manualChunks`); confirm `@google/genai` isn't eagerly imported. _[A/F]_
6. **Run axe + verify dark+gold contrast**; fix any serious violations. _[G]_

**Low**
7. Extract checkout **validators** to a pure module + unit tests. _[B]_
8. Surface service errors to the UI instead of silent `[]`. _[I]_
9. Add password-reset + admin proof-upload **E2E**. _[E]_
10. Run **Lighthouse** in CI on the 5 key pages. _[F]_

---

## Coverage summary — automated vs manual

| Area | Now automated | Still manual / external |
|---|---|---|
| Lint / typecheck | ✅ `tsc` in CI | — |
| Unit (pure logic) | ✅ 51 tests + coverage | service/hook integration |
| RLS / policies | ✅ suite authored + CI job | _must be run in CI (needs Docker)_ |
| E2E journeys | ✅ customer + auth + a11y + CI job | admin payment journey; needs seeded DB |
| Build / audit / secret-scan | ✅ in CI | — |
| Performance | ⏸ recommendations | Lighthouse, load/stress testing |
| Accessibility | ✅ axe authored | manual screen-reader pass |
| Responsive | ✅ mobile E2E project | real-device cloud |

---

## Could not test here

These need tools/infra absent from this sandbox; all are wired to run in CI or listed as recommendations:
- **Local Supabase (`supabase start`)** — Docker unavailable → RLS/integration suites authored but executed only in CI.
- **Playwright browser runs** — not installed here → E2E/a11y authored, run in CI (`npx playwright install`).
- **Lighthouse** — no headless Chrome CLI here → run in CI or locally.
- **Real cross-browser / device cloud** (BrowserStack/Sauce), **load/stress testing** (k6/Artillery), and a **formal third-party penetration test** — recommended before scaling marketing spend.

---

_Artifacts added by this pass: `src/lib/{orderStatus,pricing,upi,themedImage}.test.ts`, `src/features/orders/emailTemplates.test.ts`, `tests/rls/rls.test.ts`, `e2e/{customer,auth,a11y}.spec.ts`, `playwright.config.ts`, extended `.github/workflows/ci.yml`, coverage tooling. No application or business logic was modified._

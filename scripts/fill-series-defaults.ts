/**
 * Phase 2 one-time fill: gap-fill every sub-series with any attribute from its
 * SERIES template (series-level `attributes`) that it doesn't already have,
 * matched by key. Existing attributes are never overwritten or removed, and
 * added attributes are forced INACTIVE so the storefront is unchanged until an
 * admin enables them per product.
 *
 *   Dry run (read-only, DEFAULT):  npx tsx scripts/fill-series-defaults.ts
 *   Apply (writes to the DB):      npx tsx scripts/fill-series-defaults.ts --apply
 *
 * Auth + env are identical to scripts/migrate-attributes.ts (admin login,
 * AAL2 for --apply). Never touches media / order docs.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { applySeriesDefaults, getAttributes } from "../src/features/products/attributes";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (check .env.local).");
  process.exit(1);
}
const supabase = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

async function authenticate(requireAdmin: boolean) {
  const email = process.env.MIGRATE_EMAIL;
  const password = process.env.MIGRATE_PASSWORD;
  if (!email || !password) {
    if (requireAdmin) { console.error("--apply requires MIGRATE_EMAIL and MIGRATE_PASSWORD."); process.exit(1); }
    console.log("• No MIGRATE_EMAIL set — reading with anon access (published rows only).");
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { console.error("Sign-in failed:", error.message); process.exit(1); }
  console.log(`• Signed in as ${email}`);
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const code = process.env.MIGRATE_TOTP;
    if (!code) {
      if (requireAdmin) { console.error("This admin has MFA — set MIGRATE_TOTP for --apply."); process.exit(1); }
      console.log("• MFA enrolled but no MIGRATE_TOTP — continuing at aal1."); return;
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) { console.error("No verified TOTP factor found."); process.exit(1); }
    const { error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    if (mfaErr) { console.error("MFA verification failed:", mfaErr.message); process.exit(1); }
    console.log("• Session elevated to AAL2");
  }
}

async function main() {
  console.log(`\nSeries-default fill — ${APPLY ? "APPLY (writes to DB)" : "DRY RUN (read-only)"}\n`);
  await authenticate(APPLY);

  const { data: rows, error } = await supabase.from("products").select("*").order("sort_order");
  if (error) { console.error("Failed to read products:", error.message); process.exit(1); }
  const products = (rows ?? []).filter((r: any) => r.data && typeof r.data === "object");
  console.log(`• Read ${products.length} product row(s)\n`);

  const lines: string[] = [];
  lines.push("| Series › sub-series | before | added (inactive) | after | added keys |");
  lines.push("|---|---:|---:|---:|---|");

  const updates: any[] = [];
  let totalAdded = 0;
  const issues: string[] = [];

  for (const row of products) {
    const doc = row.data as any;
    const slug = doc.slug ?? row.id;
    const template = getAttributes(doc); // series-level attributes = the template
    let changed = false;

    if (Array.isArray(doc.subSeries)) {
      doc.subSeries = doc.subSeries.map((sub: any) => {
        const before = getAttributes(sub);
        const { attributes, added } = applySeriesDefaults(before, template); // added forced inactive
        totalAdded += added.length;
        if (added.length) changed = true;
        // integrity: existing attributes must all survive unchanged, count must add up
        if (attributes.length !== before.length + added.length) {
          issues.push(`${slug} › ${sub.slug}: count mismatch`);
        }
        const beforeKeys = new Set(before.map((a: any) => a.key));
        if (![...beforeKeys].every((k) => attributes.some((a: any) => a.key === k))) {
          issues.push(`${slug} › ${sub.slug}: an existing attribute was dropped`);
        }
        lines.push(
          `| ${slug} › ${sub.slug} | ${before.length} | ${added.length} | ${attributes.length} | ${added.join(", ") || "—"} |`,
        );
        return { ...sub, attributes };
      });
    }

    if (changed) {
      updates.push({
        id: row.id,
        slug: row.slug ?? slug,
        sort_order: row.sort_order ?? doc.sortOrder ?? 0,
        data: doc,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const report = [
    `# Series Default Fill Report`,
    ``,
    `- Generated: ${new Date().toISOString()}`,
    `- Mode: **${APPLY ? "APPLY" : "DRY RUN"}**`,
    `- Attributes added (all inactive): **${totalAdded}**`,
    `- Rows to update: **${updates.length}**`,
    `- Integrity issues: **${issues.length}** ${issues.length ? "❌" : "✅"}`,
    ``,
    ...lines,
    ``,
    issues.length ? "## ⚠️ Issues\n" + issues.map((i) => `- ${i}`).join("\n") : "## ✅ No existing attribute overwritten or dropped; added attributes are all inactive.",
    ``,
  ].join("\n");
  const outPath = resolve("docs/series-default-fill-report.md");
  writeFileSync(outPath, report);
  console.log(`• Report written to ${outPath}`);
  console.log(`• Attributes added (inactive): ${totalAdded} across ${updates.length} row(s)`);
  console.log(`• Integrity issues: ${issues.length}`);

  if (issues.length) { console.error("\n❌ Integrity check failed — refusing to write."); process.exit(2); }

  if (!APPLY) {
    console.log("\nDry run complete. Review docs/series-default-fill-report.md, then re-run with --apply.\n");
    return;
  }
  if (!updates.length) { console.log("\nNothing to apply — all sub-series already complete.\n"); return; }

  console.log(`\n• Applying ${updates.length} update(s)…`);
  const { error: upErr } = await supabase.from("products").upsert(updates);
  if (upErr) { console.error("Upsert failed:", upErr.message); process.exit(1); }
  console.log("✅ Applied. Added attributes are inactive — enable per product when ready.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });

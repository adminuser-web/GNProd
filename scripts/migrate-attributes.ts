/**
 * One-time migration: populate the unified `attributes` list on every product
 * series and sub-series from the legacy `specs` + `customizationGroups`.
 *
 *   Dry run (read-only, DEFAULT):  npx tsx scripts/migrate-attributes.ts
 *   Apply (writes to the DB):      npx tsx scripts/migrate-attributes.ts --apply
 *
 * Auth: signs in as an admin (same RLS path as the app). Because admins enrol
 * MFA and the products table is gated by is_admin() (AAL2), an --apply run also
 * elevates the session with a TOTP code.
 *
 * Env (via .env.local or the shell):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (already in .env.local)
 *   MIGRATE_EMAIL, MIGRATE_PASSWORD             (admin credentials)
 *   MIGRATE_TOTP                                (6-digit code — required for --apply if MFA is on)
 *
 * Legacy fields are NOT deleted — they stay on the doc as a rollback safety net.
 * The script never mutates order/build documents.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deriveAttributes } from "../src/features/products/attributes";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (check .env.local).");
  process.exit(1);
}

const supabase = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Entity = {
  attributes?: any[];
  specs?: Record<string, unknown>;
  customizationGroups?: any[];
};

const nonEmptySpecCount = (specs: Record<string, unknown> | undefined) =>
  Object.values(specs ?? {}).filter(
    (v) => !(v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)),
  ).length;

const optionCount = (groups: any[] | undefined) =>
  (groups ?? []).reduce((n, g) => n + (g.options?.length ?? 0), 0);

const attrOptionCount = (attrs: any[]) =>
  attrs.reduce((n, a) => n + (a.mode === "customizable" ? (a.options?.length ?? 0) : 0), 0);

type Issue = { where: string; message: string };
const issues: Issue[] = [];
const reportLines: string[] = [];

/** Verify no attribute or option is lost when deriving `entity`'s attributes. */
function checkEntity(where: string, entity: Entity) {
  const attrs = deriveAttributes(entity);
  const groups = entity.customizationGroups ?? [];
  const specs = entity.specs ?? {};

  // (a) every customization group survives as a customizable attribute
  const attrKeys = new Set(attrs.map((a) => a.key));
  for (const g of groups) {
    const match = attrs.find((a) => a.key === g.id && a.mode === "customizable");
    if (!match) {
      issues.push({ where, message: `group "${g.id}" not represented as a customizable attribute` });
    } else if ((match.options?.length ?? 0) !== (g.options?.length ?? 0)) {
      issues.push({
        where,
        message: `group "${g.id}" option count changed ${g.options?.length ?? 0} → ${match.options?.length ?? 0}`,
      });
    }
  }

  // (b) total options preserved exactly
  const optIn = optionCount(groups);
  const optOut = attrOptionCount(attrs);
  if (optIn !== optOut) {
    issues.push({ where, message: `total options changed ${optIn} → ${optOut}` });
  }

  // (c) classify every non-empty spec field precisely:
  //     - covered: the established SPEC_TO_CUSTOMIZATION_MAP maps it to an
  //                ACTIVE customizable attribute, so the fixed value is
  //                intentionally hidden (matches the old spec-table behaviour).
  //     - fixed:   everything else becomes its own fixed attribute (unique key).
  const activeCustomKeys = new Set(
    attrs.filter((a) => a.mode === "customizable" && a.active !== false).map((a) => a.key),
  );
  const covered: string[] = [];
  let fixedFromSpecs = 0;
  for (const [field, value] of Object.entries(specs)) {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const mapped = SPEC_TO_CUSTOMIZATION_MAP[field];
    if (mapped && activeCustomKeys.has(mapped)) {
      covered.push(`${field}→"${mapped}"`);
    } else {
      fixedFromSpecs++;
    }
  }

  const fixedCount = attrs.filter((a) => a.mode === "fixed").length;
  const custCount = attrs.filter((a) => a.mode === "customizable").length;

  // Accounting must balance exactly: no spec value disappears unexplained.
  const nonEmpty = nonEmptySpecCount(entity.specs);
  if (fixedFromSpecs !== fixedCount) {
    issues.push({ where, message: `fixed-attr count ${fixedCount} != fixed-from-specs ${fixedFromSpecs}` });
  }
  if (fixedFromSpecs + covered.length !== nonEmpty) {
    issues.push({ where, message: `spec accounting off: ${fixedFromSpecs} fixed + ${covered.length} covered != ${nonEmpty} non-empty` });
  }

  reportLines.push(
    `| ${where} | ${nonEmpty} | ${groups.length} | ${optIn} | ${fixedCount} | ${custCount} | ${optOut} | ${covered.length ? "covered: " + covered.join(", ") : "—"} |`,
  );

  return attrs;
}

// The established spec→customizable mapping — same source the app derive uses
// to decide when a fixed spec is "covered" (hidden) by a customizable group.
import { SPEC_TO_CUSTOMIZATION_MAP } from "../src/config/attributeMap";

async function authenticate(requireAdmin: boolean) {
  const email = process.env.MIGRATE_EMAIL;
  const password = process.env.MIGRATE_PASSWORD;
  if (!email || !password) {
    if (requireAdmin) {
      console.error("--apply requires MIGRATE_EMAIL and MIGRATE_PASSWORD.");
      process.exit(1);
    }
    console.log("• No MIGRATE_EMAIL set — reading with anon access (published rows only).");
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Sign-in failed:", error.message);
    process.exit(1);
  }
  console.log(`• Signed in as ${email}`);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const code = process.env.MIGRATE_TOTP;
    if (!code) {
      if (requireAdmin) {
        console.error("This admin has MFA enabled — set MIGRATE_TOTP to a current 6-digit code for --apply.");
        process.exit(1);
      }
      console.log("• MFA enrolled but no MIGRATE_TOTP — continuing at aal1 (read may be limited).");
      return;
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) {
      console.error("No verified TOTP factor found for this account.");
      process.exit(1);
    }
    const { error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    if (mfaErr) {
      console.error("MFA verification failed:", mfaErr.message);
      process.exit(1);
    }
    console.log("• Session elevated to AAL2");
  }
}

async function main() {
  console.log(`\nAttribute migration — ${APPLY ? "APPLY (writes to DB)" : "DRY RUN (read-only)"}\n`);
  await authenticate(APPLY);

  const { data: rows, error } = await supabase.from("products").select("*").order("sort_order");
  if (error) {
    console.error("Failed to read products:", error.message);
    process.exit(1);
  }
  const products = (rows ?? []).filter((r: any) => r.data && typeof r.data === "object");
  console.log(`• Read ${products.length} product row(s)\n`);

  reportLines.push("| Entity | specs (non-empty) | groups | options in | fixed attrs | cust. attrs | options out | notes (covered · merged) |");
  reportLines.push("|---|---:|---:|---:|---:|---:|---:|---|");

  const updates: any[] = [];
  for (const row of products) {
    const doc = row.data as any;
    const slug = doc.slug ?? row.id;

    // Series-level (customizable only)
    doc.attributes = checkEntity(`${slug} (series)`, doc);

    // Each sub-series (fixed + customizable)
    if (Array.isArray(doc.subSeries)) {
      doc.subSeries = doc.subSeries.map((sub: any) => ({
        ...sub,
        attributes: checkEntity(`${slug} › ${sub.slug ?? sub.id}`, sub),
      }));
    }

    updates.push({
      id: row.id,
      slug: row.slug ?? slug,
      sort_order: row.sort_order ?? doc.sortOrder ?? 0,
      data: doc,
      updated_at: new Date().toISOString(),
    });
  }

  // Assemble report
  const totalGroups = products.reduce(
    (n: number, r: any) =>
      n + optionCount(r.data.customizationGroups) * 0 + (r.data.customizationGroups?.length ?? 0) +
      (r.data.subSeries ?? []).reduce((m: number, s: any) => m + (s.customizationGroups?.length ?? 0), 0),
    0,
  );
  const totalOptionsIn = products.reduce(
    (n: number, r: any) =>
      n + optionCount(r.data.customizationGroups) +
      (r.data.subSeries ?? []).reduce((m: number, s: any) => m + optionCount(s.customizationGroups), 0),
    0,
  );
  const totalOptionsOut = updates.reduce(
    (n: number, u: any) =>
      n + attrOptionCount(u.data.attributes ?? []) +
      (u.data.subSeries ?? []).reduce((m: number, s: any) => m + attrOptionCount(s.attributes ?? []), 0),
    0,
  );

  const header = [
    `# Attribute Migration Report`,
    ``,
    `- Generated: ${new Date().toISOString()}`,
    `- Mode: **${APPLY ? "APPLY" : "DRY RUN"}**`,
    `- Product rows: **${products.length}**`,
    `- Customization groups in: **${totalGroups}** → customizable attributes out (options preserved)`,
    `- Options in → out: **${totalOptionsIn} → ${totalOptionsOut}** ${totalOptionsIn === totalOptionsOut ? "✅ match" : "❌ MISMATCH"}`,
    `- Integrity issues: **${issues.length}** ${issues.length === 0 ? "✅" : "❌"}`,
    ``,
    `## Per-entity`,
    ``,
  ].join("\n");

  const issuesBlock = issues.length
    ? ["", "## ⚠️ Issues (data would be lost — do NOT apply)", "", ...issues.map((i) => `- **${i.where}**: ${i.message}`), ""].join("\n")
    : ["", "## ✅ No integrity issues — every group, option and spec value is represented.", ""].join("\n");

  const report = header + reportLines.join("\n") + "\n" + issuesBlock;
  const outPath = resolve("docs/attribute-migration-report.md");
  writeFileSync(outPath, report);
  console.log(`• Report written to ${outPath}`);
  console.log(`• Options in → out: ${totalOptionsIn} → ${totalOptionsOut}`);
  console.log(`• Integrity issues: ${issues.length}`);

  if (issues.length > 0) {
    console.error("\n❌ Integrity check failed — refusing to write. See report.");
    process.exit(2);
  }

  if (!APPLY) {
    console.log("\nDry run complete. Review docs/attribute-migration-report.md, then re-run with --apply.\n");
    return;
  }

  console.log(`\n• Applying ${updates.length} update(s)…`);
  const { error: upErr } = await supabase.from("products").upsert(updates);
  if (upErr) {
    console.error("Upsert failed:", upErr.message);
    process.exit(1);
  }
  console.log("✅ Applied. Legacy specs/customizationGroups retained for rollback.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

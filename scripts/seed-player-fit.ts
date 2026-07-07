/**
 * One-time seed: give each series a distinct, spread-out Player Fit signature so
 * the AI Bat Consultant's stats-based matching separates bats cleanly (instead
 * of every premium bat looking similar). Applied to every sub-series that does
 * NOT already carry an explicit `playerFit` — an admin's own values are never
 * overwritten (use --force to override that).
 *
 *   Dry run (read-only, DEFAULT):  npx tsx scripts/seed-player-fit.ts
 *   Apply (writes to the DB):      npx tsx scripts/seed-player-fit.ts --apply
 *   Overwrite existing fits:       npx tsx scripts/seed-player-fit.ts --apply --force
 *
 * Auth + env are identical to scripts/fill-series-defaults.ts (admin login,
 * AAL2 for --apply). Never touches media / order docs.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (check .env.local).");
  process.exit(1);
}
const supabase = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

type Fit = { power: number; control: number; pickup: number; balance: number; styleTags: string[]; idealStrikeRate: { min: number; max: number }; ballType: "leather" };

// Deliberately spread across the range so a batsman's stats land on one bat.
const SERIES_FIT: Record<string, Fit> = {
  debutant:   { power: 5.0, control: 6.0, pickup: 8.0, balance: 7.0, styleTags: ["all-rounder"],            idealStrikeRate: { min: 60,  max: 115 }, ballType: "leather" },
  millennium: { power: 7.0, control: 6.5, pickup: 6.5, balance: 7.0, styleTags: ["all-rounder", "aggressive"], idealStrikeRate: { min: 90,  max: 145 }, ballType: "leather" },
  legend:     { power: 6.5, control: 8.5, pickup: 8.0, balance: 9.0, styleTags: ["touch", "all-rounder"],   idealStrikeRate: { min: 60,  max: 120 }, ballType: "leather" },
  eternal:    { power: 9.0, control: 7.5, pickup: 6.5, balance: 8.0, styleTags: ["aggressive"],             idealStrikeRate: { min: 110, max: 175 }, ballType: "leather" },
  immortal:   { power: 9.5, control: 8.5, pickup: 7.0, balance: 8.5, styleTags: ["aggressive", "all-rounder"], idealStrikeRate: { min: 120, max: 200 }, ballType: "leather" },
};

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
  console.log(`\nPlayer Fit seed — ${APPLY ? "APPLY (writes to DB)" : "DRY RUN (read-only)"}${FORCE ? " [--force]" : ""}\n`);
  await authenticate(APPLY);

  const { data: rows, error } = await supabase.from("products").select("*").order("sort_order");
  if (error) { console.error("Failed to read products:", error.message); process.exit(1); }
  const products = (rows ?? []).filter((r: any) => r.data && typeof r.data === "object");
  console.log(`• Read ${products.length} product row(s)\n`);

  const lines: string[] = [];
  lines.push("| Series › sub-series | action | power | control | pickup | balance |");
  lines.push("|---|---|---:|---:|---:|---:|");

  const updates: any[] = [];
  let set = 0, skipped = 0, unknown = 0;

  for (const row of products) {
    const doc = row.data as any;
    const slug = String(doc.slug ?? row.slug ?? row.id).toLowerCase();
    const fit = SERIES_FIT[slug];
    let changed = false;

    if (!fit) {
      unknown++;
      lines.push(`| ${slug} › — | ⚠️ no mapping (skipped) | — | — | — | — |`);
      continue;
    }

    const subs = Array.isArray(doc.subSeries) && doc.subSeries.length ? doc.subSeries : null;
    if (subs) {
      doc.subSeries = subs.map((sub: any) => {
        if (sub.playerFit && !FORCE) {
          skipped++;
          lines.push(`| ${slug} › ${sub.slug} | kept existing | ${sub.playerFit.power} | ${sub.playerFit.control} | ${sub.playerFit.pickup} | ${sub.playerFit.balance} |`);
          return sub;
        }
        set++; changed = true;
        lines.push(`| ${slug} › ${sub.slug} | ${FORCE && sub.playerFit ? "overwritten" : "seeded"} | ${fit.power} | ${fit.control} | ${fit.pickup} | ${fit.balance} |`);
        return { ...sub, playerFit: { ...fit } };
      });
    } else {
      // Flat product (no sub-series) — set on the doc itself.
      if (doc.playerFit && !FORCE) {
        skipped++;
        lines.push(`| ${slug} › (flat) | kept existing | ${doc.playerFit.power} | ${doc.playerFit.control} | ${doc.playerFit.pickup} | ${doc.playerFit.balance} |`);
      } else {
        doc.playerFit = { ...fit }; set++; changed = true;
        lines.push(`| ${slug} › (flat) | seeded | ${fit.power} | ${fit.control} | ${fit.pickup} | ${fit.balance} |`);
      }
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
    `# Player Fit Seed Report`,
    ``,
    `- Generated: ${new Date().toISOString()}`,
    `- Mode: **${APPLY ? "APPLY" : "DRY RUN"}**${FORCE ? " (force)" : ""}`,
    `- Sub-series seeded: **${set}**`,
    `- Kept existing (not overwritten): **${skipped}**`,
    `- Unmapped series (skipped): **${unknown}**`,
    `- Rows to update: **${updates.length}**`,
    ``,
    ...lines,
    ``,
  ].join("\n");
  const outPath = resolve("docs/player-fit-seed-report.md");
  writeFileSync(outPath, report);
  console.log(`• Report written to ${outPath}`);
  console.log(`• Seeded: ${set} · Kept: ${skipped} · Unmapped: ${unknown} · Rows to update: ${updates.length}`);

  if (!APPLY) {
    console.log("\nDry run complete. Review docs/player-fit-seed-report.md, then re-run with --apply.\n");
    return;
  }
  if (!updates.length) { console.log("\nNothing to apply.\n"); return; }

  console.log(`\n• Applying ${updates.length} update(s)…`);
  const { error: upErr } = await supabase.from("products").upsert(updates);
  if (upErr) { console.error("Upsert failed:", upErr.message); process.exit(1); }
  console.log("✅ Applied. Tune any bat later in Admin → Product → Details → Player Fit.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });

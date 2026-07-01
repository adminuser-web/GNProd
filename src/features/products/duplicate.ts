import type { ProductSubSeries } from "./types";

/**
 * Build a duplicate of a sub-series for the admin "Duplicate" action.
 *
 * HARD RULE: media is REFERENCED, never re-uploaded. The deep clone copies the
 * existing image URL strings verbatim (primary, gallery, detail views), which
 * point at the same Storage objects — no upload, copy, or new Storage object is
 * ever created. The admin can swap individual images afterwards via the normal
 * upload flow.
 *
 * The copy: appends " Copy" to the name, gets a fresh unique id/slug/SKU, is
 * INACTIVE by default, and carries over attributes (fixed + customizable incl.
 * options/prices), pricing, SEO and descriptions unchanged. The original object
 * is never mutated.
 */
export function buildDuplicateSubSeries(
  original: ProductSubSeries,
  ctx: { seriesSlug: string; existingSlugs: string[]; existingSkus: string[] },
): ProductSubSeries {
  // Deep clone so the original (and its media URL references) is untouched.
  const copy: any = JSON.parse(JSON.stringify(original));

  copy.name = `${(original.name || "Product").trim()} Copy`;

  const baseSlug =
    slugify(copy.name) || `${slugify(original.slug || "product")}-copy`;
  copy.slug = uniqueValue(baseSlug, ctx.existingSlugs);
  copy.id = `${ctx.seriesSlug}-${copy.slug}`;

  copy.sku = uniqueValue(
    original.sku ? `${original.sku}-COPY` : "SKU-COPY",
    ctx.existingSkus,
  );

  copy.active = false; // never auto-publish a duplicate
  copy.sortOrder = (typeof original.sortOrder === "number" ? original.sortOrder : 0) + 1;

  // media (primaryImage / gallery / detail views) is left exactly as cloned —
  // same URLs, same Storage objects. Do not touch.

  return copy as ProductSubSeries;
}

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Append -2, -3, … (or -COPY, -COPY-2 for SKUs) until the value is unused. */
function uniqueValue(base: string, taken: string[]): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

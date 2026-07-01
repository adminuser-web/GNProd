import type {
  BatSpecs,
  CustomizationGroup,
  CustomizationOption,
  ProductAttribute,
} from "./types";
import { SPEC_TO_CUSTOMIZATION_MAP } from "../../config/attributeMap";

/**
 * Single source of truth for the unified attribute model. Both the app
 * readers and the one-time migration script import `deriveAttributes` from
 * here, so what the migration persists is exactly what the app would compute.
 *
 * Entities may already carry a persisted `attributes` list (post-migration) or
 * only the legacy `specs` / `customizationGroups` (pre-migration or bundled
 * seed data). `getAttributes()` transparently handles both.
 */

type LegacyEntity = {
  attributes?: ProductAttribute[];
  specs?: BatSpecs;
  customizationGroups?: CustomizationGroup[];
};

/**
 * Kebab-case key + human label for legacy `BatSpecs` fields, used for fixed
 * attributes. Each field gets its OWN distinct key so no two fields ever
 * collapse into one (that would silently drop a value). A fixed spec is only
 * suppressed when the established `SPEC_TO_CUSTOMIZATION_MAP` says the same
 * concept is a customizable group (see `deriveAttributes`) — exactly the old
 * spec-table hide behaviour. Fields absent here fall back to `kebab(field)` /
 * title-case. Keys here are stable — never rename ones that shipped.
 */
export const FIXED_SPEC_KEYS: Record<string, { key: string; label: string }> = {
  willowGrade: { key: "willow-grade", label: "Willow Grade" },
  grainRange: { key: "grain-range", label: "Grain Range" },
  grains: { key: "grains", label: "Grains" },
  weightRange: { key: "weight-range", label: "Weight" },
  targetWeights: { key: "target-weights", label: "Target Weights" },
  edgeThickness: { key: "edge-thickness", label: "Edge Thickness" },
  edgeProfile: { key: "edge-profile-spec", label: "Edge" },
  edges: { key: "edges", label: "Edges" },
  spineHeight: { key: "spine-height", label: "Spine Height" },
  spine: { key: "spine", label: "Spine" },
  profile: { key: "profile", label: "Profile" },
  concaving: { key: "concaving", label: "Concaving" },
  sweetSpot: { key: "sweet-spot-spec", label: "Sweet Spot" },
  handleShape: { key: "handle-shape-spec", label: "Handle" },
  handle: { key: "handle", label: "Handle" },
  handleLength: { key: "handle-length-spec", label: "Handle Length" },
  toeProfile: { key: "toe-profile", label: "Toe" },
  toeProtection: { key: "toe-protection", label: "Toe Protection" },
  finish: { key: "finish-spec", label: "Finish" },
  pressing: { key: "pressing", label: "Pressing" },
  pickupFeel: { key: "pickup-feel", label: "Pickup" },
  knockedInStatus: { key: "knocked-in-status", label: "Pre-knocked" },
  preKnockedIncluded: { key: "pre-knocked-included", label: "Pre-knocked" },
  oilingStatus: { key: "oiling", label: "Oiling" },
};

const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();

const titleCase = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/** Legacy admin UI types (`select`, `color`) map onto the canonical set. */
export function normalizeCustomizationType(
  t: string | undefined,
): ProductAttribute["type"] {
  switch (t) {
    case "select":
    case "color":
    case "single_select":
      return "single_select";
    case "multi_select":
      return "multi_select";
    case "text":
      return "text";
    case "toggle":
      return "toggle";
    default:
      return "single_select";
  }
}

function specFieldMeta(field: string): { key: string; label: string } {
  return FIXED_SPEC_KEYS[field] ?? { key: kebab(field), label: titleCase(field) };
}

/** Format a raw spec value for display as a fixed attribute. */
function formatFixedValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value);
}

function isEmptySpecValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Build the unified `ProductAttribute[]` from an entity's legacy
 * `customizationGroups` + `specs`. Customizable attributes come first (in
 * group order), then fixed attributes. A fixed spec is dropped when its key
 * already belongs to a customizable attribute — this mirrors the old render
 * behaviour where a spec "managed by" a customization group was hidden, so no
 * visible value is lost.
 */
export function deriveAttributes(entity: LegacyEntity): ProductAttribute[] {
  const attributes: ProductAttribute[] = [];
  const usedKeys = new Set<string>();
  let sortOrder = 0;

  // 1. Customizable attributes (from customization groups) — carried through
  //    with options untouched (priceDelta / colorHex / imageUrl preserved).
  const groups = entity.customizationGroups ?? [];
  groups.forEach((g) => {
    const key = g.id;
    if (!key || usedKeys.has(key)) return;
    usedKeys.add(key);
    const active = g.enabled !== false && (g as any).active !== false;
    attributes.push({
      id: g.id,
      key,
      label: g.label ?? g.name ?? key,
      mode: "customizable",
      sortOrder: sortOrder++,
      active,
      required: g.required === true,
      type: normalizeCustomizationType(g.type),
      options: (g.options ?? []) as CustomizationOption[],
      ...(g.maxLength !== undefined ? { maxLength: g.maxLength } : {}),
      ...(g.validationRegex ? { validationRegex: g.validationRegex } : {}),
    });
  });

  // 2. Fixed attributes (from specs). A spec is hidden ONLY when the established
  //    SPEC_TO_CUSTOMIZATION_MAP says its concept is an ACTIVE customizable
  //    group (the old spec-table hide behaviour). Every other spec becomes its
  //    own fixed attribute; a disambiguating suffix guarantees each field keeps
  //    a unique key so no value is ever silently dropped.
  const specs = (entity.specs ?? {}) as Record<string, unknown>;
  Object.keys(specs).forEach((field) => {
    const value = specs[field];
    if (isEmptySpecValue(value)) return;

    const mappedKey = SPEC_TO_CUSTOMIZATION_MAP[field];
    if (
      mappedKey &&
      attributes.some(
        (a) => a.mode === "customizable" && a.key === mappedKey && a.active !== false,
      )
    ) {
      return; // covered by an active customizable group → intentionally hidden
    }

    const { key: baseKey, label } = specFieldMeta(field);
    let key = baseKey;
    let n = 2;
    while (usedKeys.has(key)) key = `${baseKey}-${n++}`;
    usedKeys.add(key);

    attributes.push({
      id: `fixed-${key}`,
      key,
      label,
      mode: "fixed",
      sortOrder: sortOrder++,
      active: true,
      fixedValue: formatFixedValue(value),
    });
  });

  return attributes;
}

/**
 * Read attributes off an entity, deriving from legacy fields when a persisted
 * `attributes` list is absent. Use this everywhere instead of touching `specs`
 * / `customizationGroups` directly.
 */
export function getAttributes(entity: LegacyEntity | null | undefined): ProductAttribute[] {
  if (!entity) return [];
  if (Array.isArray(entity.attributes)) return entity.attributes;
  return deriveAttributes(entity);
}

export function getCustomizableAttributes(
  entity: LegacyEntity | null | undefined,
): ProductAttribute[] {
  return getAttributes(entity)
    .filter((a) => a.mode === "customizable" && a.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getFixedAttributes(
  entity: LegacyEntity | null | undefined,
): ProductAttribute[] {
  return getAttributes(entity)
    .filter((a) => a.mode === "fixed" && a.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// --- Series-level templates (Phase 2) ------------------------------------

export interface ApplyDefaultsResult {
  attributes: ProductAttribute[];
  added: string[]; // keys of attributes that were filled in
}

/**
 * Gap-fill `current` with any template attribute it doesn't already have
 * (matched by key). Existing attributes are never overwritten or removed.
 * By default added attributes are forced INACTIVE so they never change the
 * storefront until an admin reviews and enables them per product; pass
 * `activateAdded: true` (e.g. when seeding a brand-new sub-series) to keep the
 * template's own active state.
 */
export function applySeriesDefaults(
  current: ProductAttribute[],
  template: ProductAttribute[] | undefined,
  opts?: { activateAdded?: boolean },
): ApplyDefaultsResult {
  const result = [...(current ?? [])];
  const existing = new Set(result.map((a) => a.key));
  const added: string[] = [];
  let sortOrder = result.length;
  for (const t of template ?? []) {
    if (!t.key || existing.has(t.key)) continue;
    const copy: ProductAttribute = JSON.parse(JSON.stringify(t));
    copy.sortOrder = sortOrder++;
    copy.active = opts?.activateAdded ? t.active !== false : false;
    existing.add(t.key);
    added.push(t.key);
    result.push(copy);
  }
  return { attributes: result, added };
}

export interface AttributeError {
  index: number;
  key: string;
  message: string;
}

/**
 * Validate an attribute list for the admin editor: no empty or duplicate keys,
 * and every required customizable attribute has at least one available option.
 * Returns one error per problem (keyed to the attribute index for inline UI).
 */
export function validateAttributes(attributes: ProductAttribute[]): AttributeError[] {
  const errors: AttributeError[] = [];
  const seen = new Map<string, number>();
  (attributes ?? []).forEach((a, index) => {
    const key = (a.key ?? "").trim();
    if (!key) {
      errors.push({ index, key: a.key ?? "", message: "Attribute needs a key." });
    } else if (seen.has(key)) {
      errors.push({ index, key, message: `Duplicate key "${key}" — keys must be unique.` });
    } else {
      seen.set(key, index);
    }
    if (a.mode === "customizable" && a.required) {
      const available = (a.options ?? []).filter((o) => o.available !== false);
      if (available.length === 0) {
        errors.push({ index, key, message: "Required option group needs at least one available option." });
      }
    }
  });
  return errors;
}

export type AttributeProvenance = "series-default" | "overridden" | "product";

/** Where a sub-series attribute came from, relative to its series template. */
export function attributeProvenance(
  attr: ProductAttribute,
  template: ProductAttribute[] | undefined,
): AttributeProvenance {
  const t = (template ?? []).find((x) => x.key === attr.key);
  if (!t) return "product";
  // Compare substantive config only — ignore sortOrder and active (admins are
  // expected to toggle live state per product without it counting as a fork).
  const norm = (a: ProductAttribute) =>
    JSON.stringify({
      label: a.label,
      mode: a.mode,
      type: a.type ?? null,
      required: !!a.required,
      fixedValue: a.fixedValue ?? null,
      maxLength: a.maxLength ?? null,
      validationRegex: a.validationRegex ?? null,
      options: (a.options ?? []).map((o) => ({
        id: o.id,
        label: o.label,
        priceDelta: o.priceDelta ?? 0,
        colorHex: o.colorHex ?? null,
        imageUrl: o.imageUrl ?? null,
        available: o.available !== false,
      })),
    });
  return norm(attr) === norm(t) ? "series-default" : "overridden";
}

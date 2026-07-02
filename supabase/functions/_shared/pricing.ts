// Authoritative server-side pricing — a faithful port of src/lib/pricing.ts +
// getCustomizableAttributes. The charged amount is computed HERE from persisted
// product data, never trusted from the client. Kept in lock-step with the
// client engine so the amount always matches what the customer saw.

export interface SOption {
  id: string;
  label?: string;
  priceDelta?: number;
  available?: boolean;
  active?: boolean;
}
export interface SAttr {
  key: string;
  mode: string;
  active?: boolean;
  type?: string;
  options?: SOption[];
  sortOrder?: number;
}
export interface SProduct {
  id?: string;
  slug?: string;
  price?: number;
  activeSubSeriesId?: string;
  attributes?: SAttr[];
  customizationGroups?: any[];
}
export interface SRule {
  id: string;
  label: string;
  type: 'flat' | 'percent';
  amount: number;
  appliesTo?: string;
  target?: string;
  active: boolean;
  startsAt?: number;
  endsAt?: number;
}
export interface SCode {
  code: string;
  type: 'flat' | 'percent';
  amount: number;
  active: boolean;
  expiresAt?: number;
}

function deriveCustomizable(p: SProduct): SAttr[] {
  const groups = p.customizationGroups ?? [];
  return groups.map((g: any, i: number) => ({
    key: g.id,
    mode: 'customizable',
    active: g.enabled !== false && g.active !== false,
    type: g.type,
    options: g.options ?? [],
    sortOrder: i,
  }));
}

function customizable(p: SProduct): SAttr[] {
  const attrs = Array.isArray(p.attributes) && p.attributes.length ? p.attributes : deriveCustomizable(p);
  return attrs
    .filter((a) => a.mode === 'customizable' && a.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export interface PriceResult {
  base: number;
  subtotal: number;
  total: number;
}

/** Faithful port of computePrice — base + option deltas − rules − code. */
export function computePrice(
  product: SProduct,
  selections: Record<string, string>,
  opts?: { rules?: SRule[]; discountCode?: string; availableCodes?: SCode[] },
): PriceResult {
  const base = product.price || 0;
  const lineItems: { amount: number; groupId?: string }[] = [];
  let optionsTotal = 0;

  for (const attr of customizable(product)) {
    const options = attr.options ?? [];
    const sel = selections[attr.key];
    if (!sel) continue;
    let opt: SOption | undefined = options.find((o) => o.id === sel);
    if (attr.type !== 'text' && opt && (opt.available === false || opt.active === false)) opt = undefined;
    if (attr.type === 'text') {
      if (String(sel).trim() !== '') opt = options[0];
    }
    if (opt && (opt.priceDelta ?? 0) > 0) {
      lineItems.push({ amount: opt.priceDelta!, groupId: attr.key });
      optionsTotal += opt.priceDelta!;
    }
  }

  const subtotal = base + optionsTotal;
  let totalDiscounts = 0;
  const now = Date.now();

  for (const rule of opts?.rules ?? []) {
    if (!rule.active) continue;
    if (rule.startsAt && now < rule.startsAt) continue;
    if (rule.endsAt && now > rule.endsAt) continue;

    if (!rule.appliesTo || rule.appliesTo === 'order') {
      totalDiscounts += rule.type === 'percent' ? subtotal * (rule.amount / 100) : rule.amount;
    } else if (rule.appliesTo === 'series' && rule.target) {
      if (product.id === rule.target || product.slug === rule.target) {
        totalDiscounts += rule.type === 'percent' ? subtotal * (rule.amount / 100) : rule.amount;
      }
    } else if (rule.appliesTo === 'subSeries' && rule.target) {
      if (product.activeSubSeriesId === rule.target) {
        totalDiscounts += rule.type === 'percent' ? subtotal * (rule.amount / 100) : rule.amount;
      }
    } else if ((rule.appliesTo === 'group' || rule.appliesTo === 'option') && rule.target) {
      const target = rule.appliesTo === 'option' ? rule.target.split(':')[0] : rule.target;
      const li = lineItems.find((l) => l.groupId === target);
      if (li && li.amount > 0) {
        totalDiscounts += rule.type === 'percent' ? li.amount * (rule.amount / 100) : Math.min(rule.amount, li.amount);
      }
    }
  }

  if (opts?.discountCode && opts.availableCodes) {
    const code = opts.availableCodes.find((c) => c.code.toLowerCase() === opts.discountCode!.toLowerCase());
    if (code && code.active && (!code.expiresAt || now <= code.expiresAt)) {
      totalDiscounts += code.type === 'percent' ? subtotal * (code.amount / 100) : code.amount;
    }
  }

  return { base, subtotal, total: Math.max(0, subtotal - totalDiscounts) };
}

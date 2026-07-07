// Player Fit — the matchable signature the AI consultant scores a batsman's
// Batting DNA against. Every bat has one. Admins can set it explicitly on a
// sub-series (`subSeries.playerFit`); when they haven't, we derive a sensible
// default from the data the product already carries, normalising the legacy
// 0–100 `performance`/`performanceMetrics` values onto a single 0–10 scale.

import { BallType } from './battingProfile';

/** Playing-style tags — aligned with config/productOptions PLAYING_STYLES ids. */
export type StyleTag = 'aggressive' | 'all-rounder' | 'touch' | 'defensive';

export interface PlayerFit {
  power: number;    // 0–10
  control: number;  // 0–10
  pickup: number;   // 0–10
  balance: number;  // 0–10
  styleTags: StyleTag[];
  idealStrikeRate: { min: number; max: number };
  ballType: BallType;
}

const clamp10 = (n: number) => Math.max(0, Math.min(10, Number(n) || 0));

/** A vector is "meaningful" if its axes aren't all identical (flat placeholder). */
function isMeaningfulVector(p: any): boolean {
  if (!p) return false;
  const vals = ['power', 'control', 'pickup', 'balance'].map((k) => Number(p[k]));
  if (vals.some((v) => !Number.isFinite(v))) return false;
  return new Set(vals).size > 1;
}

/** Legacy vectors were stored 0–100; anything above 10 is treated as a percent. */
function to10(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 5;
  return clamp10(n > 10 ? n / 10 : n);
}

/** Normalise any {power,control,pickup,balance} to 0–10 (missing → 5). */
export function normalizePerformance(p: any): Pick<PlayerFit, 'power' | 'control' | 'pickup' | 'balance'> {
  const src = p || {};
  return {
    power: to10(src.power),
    control: to10(src.control),
    pickup: to10(src.pickup),
    balance: to10(src.balance),
  };
}

function tagsFromStyle(style?: string): StyleTag[] {
  switch ((style || '').toLowerCase()) {
    case 'aggressive': return ['aggressive'];
    case 'touch': return ['touch'];
    case 'defensive': return ['defensive'];
    case 'all-rounder':
    case 'all-round': return ['all-rounder'];
    default: return ['all-rounder'];
  }
}

/**
 * Resolve the Player Fit for a sub-series. Prefers an explicit admin-set
 * `playerFit`; otherwise derives one from existing product fields so every
 * bat is matchable even before anyone fills the new editor.
 */
export function getPlayerFit(subSeries: any, series?: any): PlayerFit {
  const explicit = subSeries?.playerFit;
  // Priority: an explicit admin-set fit → the sub-series' own signature (only if
  // it looks intentionally set, not a flat placeholder) → the curated per-series
  // vector → any series-level performance. This keeps tiers differentiated even
  // when seed sub-series carry an identical placeholder value.
  const perf = normalizePerformance(
    subSeries?.playerFit ||
    (isMeaningfulVector(subSeries?.performance) ? subSeries.performance : null) ||
    series?.performanceMetrics ||
    series?.performance ||
    subSeries?.performance
  );

  if (explicit) {
    return {
      ...perf,
      styleTags: (explicit.styleTags?.length ? explicit.styleTags : tagsFromStyle(subSeries?.playingStyle)) as StyleTag[],
      idealStrikeRate: explicit.idealStrikeRate ?? defaultSRBand(perf),
      ballType: (explicit.ballType as BallType) || 'leather',
    };
  }

  return {
    ...perf,
    styleTags: tagsFromStyle(subSeries?.playingStyle || series?.playingStyle),
    idealStrikeRate: defaultSRBand(perf),
    ballType: 'leather',
  };
}

/** A reasonable strike-rate window inferred from a bat's power lean. */
function defaultSRBand(perf: { power: number; control: number }): { min: number; max: number } {
  // Power-leaning bats suit faster scorers; control-leaning suit accumulators.
  if (perf.power >= 8) return { min: 120, max: 200 };
  if (perf.power >= 6) return { min: 95, max: 160 };
  if (perf.control >= 8) return { min: 40, max: 100 };
  return { min: 70, max: 130 };
}

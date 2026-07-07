import { ProductSubSeries } from '../products/types';
import { getCustomizableAttributes } from '../products/attributes';
import { Product } from '../../types';
import { BattingDNA } from './battingProfile';
import { getPlayerFit } from './playerFit';

export type PlayerProfile =
  | "Beginner / Casual Player"
  | "Club Cricketer"
  | "League / Tournament Player"
  | "Advanced / Serious Player"
  | "Professional / Premium Buyer";

export type BattingStyle =
  | "Timing & Stroke Play"
  | "Power Hitting"
  | "Balanced All-Round Game"
  | "Defensive / Control Focus"
  | "Front-foot Dominant";

export type PickupFeel =
  | "Light Pickup"
  | "Balanced Pickup"
  | "Powerful / Slightly Heavy"
  | "Not Sure";

export type BudgetRange =
  | "Under ₹15,000"
  | "₹15,000 – ₹25,000"
  | "₹25,000 – ₹40,000"
  | "₹40,000 – ₹60,000"
  | "₹60,000+ / Best Available";

export type CustomizationPreference =
  | "Basic setup is enough"
  | "Some customization"
  | "Full custom build"
  | "I want expert help choosing";

export interface BatConsultantInput {
  playerProfile: PlayerProfile;
  battingStyle: BattingStyle;
  pickupFeel: PickupFeel;
  budgetRange: BudgetRange;
  customizationPreference: CustomizationPreference;
}

export interface BatConsultantRecommendation {
  seriesSlug: string;
  subSeriesSlug?: string;
  seriesName: string;
  subSeriesName?: string;
  sku?: string;
  price?: number;
  gradeLabel?: string;
  confidence: number;
  score: number;
  reason: string;
  matchHighlights: string[];
  recommendedSetup: {
    batSize?: string;
    weightProfile?: string;
    sweetSpot?: string;
    handleShape?: string;
    batProfile?: string;
    gripColor?: string;
  };
  alternatives: {
    seriesSlug: string;
    subSeriesSlug?: string;
    seriesName: string;
    subSeriesName?: string;
    reason: string;
    score: number;
  }[];
}

// ---------------------------------------------------------------------------
// Stats-based path — matches a batsman's Batting DNA to a bat's Player Fit.
// ---------------------------------------------------------------------------

export interface StatsFollowUp {
  budgetRange: BudgetRange;
  pickupFeel: PickupFeel;
}

export interface StatsRecommendation extends BatConsultantRecommendation {
  battingDNA: BattingDNA;
  fitScore: number;              // 0–100 — how well the pick's Player Fit matches
  fitBreakdown: { label: string; need: number; bat: number }[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The bat characteristics a batsman with this DNA actually needs (each 0–10). */
function needsFromDNA(dna: BattingDNA) {
  return {
    power: clamp(dna.power * 0.6 + dna.aggression * 0.4, 0, 10),
    control: clamp((10 - dna.aggression) * 0.5 + dna.consistency * 0.5, 0, 10),
    pickup: clamp(6 + (5 - dna.experience) * 0.35 + (dna.aggression < 5 ? 1 : 0), 0, 10),
    balance: clamp(5.5 + (dna.consistency - 5) * 0.3 + (dna.experience - 5) * 0.15, 0, 10),
  };
}

/** Dominant playing-style tag implied by the DNA. */
function dominantStyle(dna: BattingDNA): string {
  if (dna.power >= 7 && dna.aggression >= 7) return 'aggressive';
  if (dna.consistency >= 6.5 && dna.aggression <= 5) return 'defensive';
  if (dna.aggression >= 6 && dna.power <= 5) return 'touch';
  return 'all-rounder';
}

/** Skill/level score (0–10) → target series tier index (0 entry … 4 elite). */
function targetTier(dna: BattingDNA): number {
  const level = dna.consistency * 0.4 + dna.experience * 0.3 + ((dna.aggression + dna.power) / 2) * 0.3;
  if (level < 3) return 0;
  if (level < 5) return 1;
  if (level < 7) return 2;
  if (level < 8.5) return 3;
  return 4;
}

function seriesTierIndex(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('debutant')) return 0;
  if (n.includes('millennium')) return 1;
  if (n.includes('legend')) return 2;
  if (n.includes('eternal')) return 3;
  if (n.includes('immortal')) return 4;
  return 2;
}

function budgetBand(range: BudgetRange): number {
  switch (range) {
    case 'Under ₹15,000': return 0;
    case '₹15,000 – ₹25,000': return 1;
    case '₹25,000 – ₹40,000': return 2;
    case '₹40,000 – ₹60,000': return 3;
    default: return 4;
  }
}
function priceBand(price: number): number {
  if (price <= 15000) return 0;
  if (price <= 25000) return 1;
  if (price <= 40000) return 2;
  if (price <= 60000) return 3;
  return 4;
}

export function consultByStats(
  dna: BattingDNA,
  followUp: StatsFollowUp,
  activeProducts: Product[]
): StatsRecommendation | null {
  if (!activeProducts || activeProducts.length === 0) return null;

  const needs = needsFromDNA(dna);
  const style = dominantStyle(dna);
  const tTier = targetTier(dna);
  const bBand = budgetBand(followUp.budgetRange);

  // Vector fit: weighted closeness of a bat's Player Fit to the batsman's needs.
  const W = { power: 0.35, control: 0.35, pickup: 0.15, balance: 0.15 };
  type Scored = { series: Product; sub: ProductSubSeries; fit: number; total: number; highlights: string[]; breakdown: StatsRecommendation['fitBreakdown'] };
  const scored: Scored[] = [];

  for (const series of activeProducts) {
    if (!series.active || !series.subSeries) continue;
    for (const sub of series.subSeries) {
      if (!sub.active || !sub.slug || !series.slug) continue;
      const price = sub.basePrice || series.price || 0;
      if (price === 0) continue;

      const pf = getPlayerFit(sub, series);
      if (pf.ballType !== dna_ballType(dna)) { /* leather-only catalogue: no-op filter */ }

      const dist =
        W.power * Math.abs(needs.power - pf.power) +
        W.control * Math.abs(needs.control - pf.control) +
        W.pickup * Math.abs(needs.pickup - pf.pickup) +
        W.balance * Math.abs(needs.balance - pf.balance);
      const fit = clamp(Math.round(100 - dist * 6.5), 35, 99);

      const highlights: string[] = [];
      if (fit >= 85) highlights.push('Closely matches your batting profile');

      // Style tag alignment.
      const styleScore = pf.styleTags.includes(style as any) ? 100 : 55;
      if (styleScore === 100) highlights.push(`Built for your ${styleLabel(style)} game`);

      // Tier alignment.
      const tierScore = clamp(100 - Math.abs(seriesTierIndex(series.name) - tTier) * 28, 0, 100);

      // Budget alignment.
      const bandDiff = Math.abs(priceBand(price) - bBand);
      const budgetScore = bandDiff === 0 ? 100 : bandDiff === 1 ? 60 : 15;
      if (bandDiff === 0) highlights.push('Fits your budget');

      // Strike-rate window.
      const inBand = true; // SR contributes via aggression → needs; kept soft here.

      const total = fit * 0.55 + styleScore * 0.15 + tierScore * 0.15 + budgetScore * 0.15;

      scored.push({
        series, sub, fit, total, highlights,
        breakdown: [
          { label: 'Power', need: round1(needs.power), bat: round1(pf.power) },
          { label: 'Control', need: round1(needs.control), bat: round1(pf.control) },
          { label: 'Pickup', need: round1(needs.pickup), bat: round1(pf.pickup) },
          { label: 'Balance', need: round1(needs.balance), bat: round1(pf.balance) },
        ],
      });
      void inBand;
    }
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.total - a.total);
  const best = scored[0];
  const second = scored[1] || null;

  const setup = recommendedSetup(dna, followUp);
  const reason = statsReason(dna, best.series.name);

  const alternatives = [];
  if (second && second.total >= best.total - 20) {
    alternatives.push({
      seriesSlug: second.series.slug,
      subSeriesSlug: second.sub.slug,
      seriesName: second.series.name,
      subSeriesName: second.sub.name,
      reason: (second.sub.basePrice || 0) > (best.sub.basePrice || 0)
        ? 'A step up if you want more bat for the same game.'
        : 'A strong value alternative with a similar feel.',
      score: Math.round(second.total),
    });
  }

  return {
    seriesSlug: best.series.slug,
    subSeriesSlug: best.sub.slug,
    seriesName: best.series.name,
    subSeriesName: best.sub.name,
    sku: best.sub.sku,
    price: best.sub.basePrice || best.series.price,
    gradeLabel: (best.sub as any).gradeLabel || (best.sub as any).grade,
    score: Math.round(best.total),
    confidence: best.fit,
    fitScore: best.fit,
    battingDNA: dna,
    fitBreakdown: best.breakdown,
    reason,
    matchHighlights: Array.from(new Set(best.highlights)),
    recommendedSetup: setup,
    alternatives,
  };
}

function dna_ballType(_dna: BattingDNA): 'leather' { return 'leather'; }
function round1(n: number) { return Math.round(n * 10) / 10; }
function styleLabel(s: string) {
  return s === 'aggressive' ? 'power-hitting' : s === 'defensive' ? 'anchoring' : s === 'touch' ? 'timing' : 'all-round';
}

function recommendedSetup(dna: BattingDNA, followUp: StatsFollowUp): BatConsultantRecommendation['recommendedSetup'] {
  let weightProfile = 'Medium / 2lb 9oz – 2lb 11oz';
  if (followUp.pickupFeel === 'Light Pickup') weightProfile = 'Light / 2lb 7oz – 2lb 9oz';
  else if (followUp.pickupFeel === 'Powerful / Slightly Heavy') weightProfile = 'Medium-heavy / 2lb 11oz+';

  const power = dna.power;
  const sweetSpot = power >= 7 ? 'Mid-to-high sweet spot' : power >= 4.5 ? 'Mid sweet spot' : 'Mid-to-low sweet spot';
  const batProfile = power >= 7 ? 'Full profile' : power >= 4.5 ? 'Mid profile' : 'Mid-to-low profile';
  const handleShape = power >= 7 ? 'Round handle' : 'Semi-oval handle';

  return { batSize: 'Short Handle (SH)', weightProfile, sweetSpot, handleShape, batProfile, gripColor: 'White' };
}

function statsReason(dna: BattingDNA, seriesName: string): string {
  return `${seriesName} is your best match because your numbers point to a ${dna.archetype.toLowerCase()}: ${dna.summary}`;
}

export function consultBat(
  input: BatConsultantInput,
  activeProducts: Product[]
): BatConsultantRecommendation {
  const fallbackRecommendation: BatConsultantRecommendation = {
    seriesSlug: 'millennium',
    subSeriesSlug: 'premium',
    seriesName: 'Millennium',
    subSeriesName: 'Premium',
    price: 34999,
    confidence: 70,
    score: 70,
    reason: "Because we couldn't match specific models in the live catalog, we recommend Millennium. It provides the most balanced, reliable English Willow performance for all-around players.",
    matchHighlights: ["Versatile all-around bat", "Reliable English Willow"],
    recommendedSetup: {
      batSize: 'Short Handle (SH)',
      weightProfile: 'Medium / 2lb 9oz – 2lb 11oz',
      sweetSpot: 'Mid sweet spot',
      handleShape: 'Semi-oval handle',
      batProfile: 'Mid profile',
      gripColor: 'White'
    },
    alternatives: []
  };

  if (!activeProducts || activeProducts.length === 0) return null as any;

  type ScoredItem = { series: Product; subSeries: ProductSubSeries; score: number; highlights: string[] };
  const items: ScoredItem[] = [];

  for (const series of activeProducts) {
    if (!series.active || !series.subSeries) continue;

    for (const subSeries of series.subSeries) {
      if (!subSeries.active) continue;
      // Do not recommend if no price or slug
      if (!subSeries.slug || !series.slug) continue;
      const price = subSeries.basePrice || series.price || 0;
      if (price === 0) continue;

      let score = 0;
      const highlights: string[] = [];
      const sName = series.name.toLowerCase();

      // 1. Player profile match (25 points)
      let profileScore = 0;
      if (sName.includes('debutant')) {
        if (input.playerProfile === 'Beginner / Casual Player') profileScore = 25;
        else if (input.playerProfile === 'Club Cricketer') profileScore = 18;
        else if (input.playerProfile === 'League / Tournament Player') profileScore = 8;
        else if (input.playerProfile === 'Advanced / Serious Player') profileScore = 3;
        else if (input.playerProfile === 'Professional / Premium Buyer') profileScore = 0;
      } else if (sName.includes('millennium')) {
        if (input.playerProfile === 'Beginner / Casual Player') profileScore = 10;
        else if (input.playerProfile === 'Club Cricketer') profileScore = 25;
        else if (input.playerProfile === 'League / Tournament Player') profileScore = 20;
        else if (input.playerProfile === 'Advanced / Serious Player') profileScore = 8;
        else if (input.playerProfile === 'Professional / Premium Buyer') profileScore = 3;
      } else if (sName.includes('legend')) {
        if (input.playerProfile === 'Beginner / Casual Player') profileScore = 3;
        else if (input.playerProfile === 'Club Cricketer') profileScore = 14;
        else if (input.playerProfile === 'League / Tournament Player') profileScore = 25;
        else if (input.playerProfile === 'Advanced / Serious Player') profileScore = 22;
        else if (input.playerProfile === 'Professional / Premium Buyer') profileScore = 8;
      } else if (sName.includes('eternal')) {
        if (input.playerProfile === 'Beginner / Casual Player') profileScore = 0;
        else if (input.playerProfile === 'Club Cricketer') profileScore = 5;
        else if (input.playerProfile === 'League / Tournament Player') profileScore = 16;
        else if (input.playerProfile === 'Advanced / Serious Player') profileScore = 25;
        else if (input.playerProfile === 'Professional / Premium Buyer') profileScore = 20;
      } else if (sName.includes('immortal')) {
        if (input.playerProfile === 'Beginner / Casual Player') profileScore = 0;
        else if (input.playerProfile === 'Club Cricketer') profileScore = 0;
        else if (input.playerProfile === 'League / Tournament Player') profileScore = 8;
        else if (input.playerProfile === 'Advanced / Serious Player') profileScore = 18;
        else if (input.playerProfile === 'Professional / Premium Buyer') profileScore = 25;
      } else {
        profileScore = 10; // Fallback for any other series
      }
      
      if (profileScore >= 20) highlights.push(`Ideal for ${input.playerProfile}`);
      score += profileScore;

      // 2. Batting style match (20 points)
      let styleScore = 0;
      const perf = subSeries.performance || { power: 5, control: 5, pickup: 5, balance: 5 };
      if (input.battingStyle === 'Timing & Stroke Play') {
        styleScore = (perf.pickup + perf.control + perf.balance) / 3 * 2;
        if (sName.includes('legend')) styleScore += 5;
      } else if (input.battingStyle === 'Power Hitting') {
        styleScore = perf.power * 2;
        if (sName.includes('eternal') || sName.includes('immortal')) styleScore += 5;
      } else if (input.battingStyle === 'Balanced All-Round Game') {
        styleScore = perf.balance * 2;
        if (sName.includes('millennium') || sName.includes('legend') || sName.includes('eternal')) styleScore += 3;
      } else if (input.battingStyle === 'Defensive / Control Focus') {
        styleScore = (perf.control + perf.pickup) / 2 * 2;
        if (sName.includes('debutant') || sName.includes('legend')) styleScore += 3;
      } else if (input.battingStyle === 'Front-foot Dominant') {
        styleScore = (perf.power + perf.control) / 2 * 2;
        if (sName.includes('millennium') || sName.includes('eternal')) styleScore += 3;
      }
      styleScore = Math.min(20, styleScore);
      if (styleScore >= 15) highlights.push(`Matches ${input.battingStyle} style closely`);
      score += styleScore;

      // 3. Pickup feel match (15 points)
      let pickupScore = 0;
      if (input.pickupFeel === 'Light Pickup') {
        pickupScore = (perf.pickup / 10) * 15;
      } else if (input.pickupFeel === 'Balanced Pickup') {
        pickupScore = (perf.balance / 10) * 15;
      } else if (input.pickupFeel === 'Powerful / Slightly Heavy') {
        pickupScore = (perf.power / 10) * 15;
      } else {
        pickupScore = (perf.balance / 10) * 15; // Not sure
      }
      pickupScore = Math.min(15, pickupScore);
      if (pickupScore >= 12) highlights.push(`Perfect ${input.pickupFeel.toLowerCase()}`);
      score += pickupScore;

      // 4. Budget match (25 points)
      let budgetScore = 0;
      let bandIndex = 0;
      if (price <= 15000) bandIndex = 0;
      else if (price <= 25000) bandIndex = 1;
      else if (price <= 40000) bandIndex = 2;
      else if (price <= 60000) bandIndex = 3;
      else bandIndex = 4;

      let targetBand = 0;
      if (input.budgetRange === 'Under ₹15,000') targetBand = 0;
      else if (input.budgetRange === '₹15,000 – ₹25,000') targetBand = 1;
      else if (input.budgetRange === '₹25,000 – ₹40,000') targetBand = 2;
      else if (input.budgetRange === '₹40,000 – ₹60,000') targetBand = 3;
      else if (input.budgetRange === '₹60,000+ / Best Available') targetBand = 4;

      const bandDiff = Math.abs(bandIndex - targetBand);
      if (bandDiff === 0) {
        budgetScore = 25;
        highlights.push(`Fits perfectly in your budget`);
      } else if (bandDiff === 1) {
        budgetScore = 12;
      } else {
        budgetScore = 2;
        // Don't recommend expensive bats for low budget!
        if (targetBand === 0 && bandIndex >= 2) budgetScore = -20;
      }
      score += Math.max(0, budgetScore);

      // 5. Customization match (15 points)
      let customScore = 0;
      const numGroups = getCustomizableAttributes(subSeries).length;
      const requiresConsultation = subSeries.consultationRequired || subSeries.whatsappConsultationEnabled;

      if (input.customizationPreference === 'Basic setup is enough') {
        if (numGroups <= 3) customScore = 15;
        else if (numGroups <= 5) customScore = 8;
        else customScore = 2;
      } else if (input.customizationPreference === 'Some customization') {
        if (numGroups >= 4 && numGroups <= 7) customScore = 15;
        else if (numGroups > 7) customScore = 10;
        else customScore = 5;
      } else if (input.customizationPreference === 'Full custom build') {
        if (numGroups >= 8) customScore = 15;
        else customScore = numGroups;
      } else if (input.customizationPreference === 'I want expert help choosing') {
        if (requiresConsultation) customScore = 15;
        else if (numGroups >= 8) customScore = 12;
        else customScore = 5;
      }
      if (customScore >= 12 && input.customizationPreference !== 'Basic setup is enough') {
        highlights.push(`Meets customization expectations`);
      }
      score += customScore;

      items.push({ series, subSeries, score, highlights });
    }
  }

  if (items.length === 0) return null as any;

  items.sort((a, b) => b.score - a.score);
  const bestMatch = items[0];
  const secondBest = items.length > 1 ? items[1] : null;

  // Recommended setup
  let weightProfile = 'Balanced medium weight';
  if (input.pickupFeel === 'Light Pickup') {
    weightProfile = 'Light / 2lb 7oz – 2lb 9oz';
  } else if (input.pickupFeel === 'Balanced Pickup') {
    weightProfile = 'Medium / 2lb 9oz – 2lb 11oz';
  } else if (input.pickupFeel === 'Powerful / Slightly Heavy') {
    weightProfile = 'Medium-heavy / 2lb 11oz+';
  }

  let sweetSpot = 'Mid sweet spot';
  if (input.battingStyle === 'Timing & Stroke Play') sweetSpot = 'Mid sweet spot';
  else if (input.battingStyle === 'Power Hitting') sweetSpot = 'Mid-to-high sweet spot';
  else if (input.battingStyle === 'Balanced All-Round Game') sweetSpot = 'Mid sweet spot';
  else if (input.battingStyle === 'Defensive / Control Focus') sweetSpot = 'Mid-to-low sweet spot';
  else if (input.battingStyle === 'Front-foot Dominant') sweetSpot = 'Low-to-mid sweet spot';

  let handleShape = 'Semi-oval handle';
  if (input.battingStyle === 'Power Hitting') handleShape = 'Round handle';
  else if (input.battingStyle === 'Defensive / Control Focus') handleShape = 'Oval or semi-oval handle';

  let batProfile = 'Mid profile';
  if (input.battingStyle === 'Power Hitting') batProfile = 'Full profile';
  else if (input.battingStyle === 'Front-foot Dominant') batProfile = 'Low-to-mid profile';

  const confidence = Math.min(98, Math.max(60, Math.round((bestMatch.score / 100) * 100)));

  let reason = '';
  const sName = bestMatch.series.name.toLowerCase();
  if (sName.includes('debutant')) {
    reason = "Debutant is ideal because it gives you a proper English Willow experience without forcing you into premium pricing. It is best for building technique and getting reliable match performance.";
  } else if (sName.includes('millennium')) {
    reason = "Millennium suits you because you play regularly and need a bat that balances durability, power, and value for match use.";
  } else if (sName.includes('legend')) {
    reason = "Legend is the best match because your answers show you value timing, pickup, and control. It is built for players who want the bat to feel quick in the hands without losing power.";
  } else if (sName.includes('eternal')) {
    reason = "Eternal is recommended because you need a premium bat with strong power, advanced customization, and a profile suited for aggressive match play.";
  } else if (sName.includes('immortal')) {
    reason = "Immortal is the right match because your answers show you want the best available Grainood build, with premium willow selection, full customization, and expert consultation.";
  } else {
    reason = `Based on your level and preferred style, the ${bestMatch.series.name} fits your game perfectly.`;
  }

  const alternatives = [];
  if (secondBest && secondBest.score >= bestMatch.score - 25) {
    let altReason = `A great alternative option that also fits your ${input.battingStyle.toLowerCase()} style.`;
    if (secondBest.subSeries.basePrice! > bestMatch.subSeries.basePrice!) {
      altReason = `A premium upgrade option focusing more on ultimate performance.`;
    } else if (secondBest.subSeries.basePrice! < bestMatch.subSeries.basePrice!) {
      altReason = `An excellent value-focused alternative with similar characteristics.`;
    }

    alternatives.push({
      seriesSlug: secondBest.series.slug,
      subSeriesSlug: secondBest.subSeries.slug,
      seriesName: secondBest.series.name,
      subSeriesName: secondBest.subSeries.name,
      reason: altReason,
      score: secondBest.score,
    });
  }

  return {
    seriesSlug: bestMatch.series.slug,
    subSeriesSlug: bestMatch.subSeries.slug,
    seriesName: bestMatch.series.name,
    subSeriesName: bestMatch.subSeries.name,
    sku: bestMatch.subSeries.sku,
    price: bestMatch.subSeries.basePrice || bestMatch.series.price,
    gradeLabel: (bestMatch.subSeries as any).gradeLabel || (bestMatch.subSeries as any).grade,
    score: bestMatch.score,
    confidence,
    reason,
    matchHighlights: bestMatch.highlights,
    recommendedSetup: {
      batSize: 'Short Handle (SH)',
      weightProfile,
      sweetSpot,
      handleShape,
      batProfile,
      gripColor: 'White'
    },
    alternatives
  };
}

import { ProductSubSeries } from '../products/types';
import { Product } from '../../types';

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
      const numGroups = subSeries.customizationGroups?.filter(g => g.enabled !== false).length || 0;
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

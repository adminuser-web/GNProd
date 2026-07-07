// Batting DNA — turns a batsman's raw stats (as shown in apps like CricHeroes)
// into four 0–10 sub-scores and an archetype, which the bat-matching engine then
// maps to the right bat. Leather-ball cricket only (Grainood makes English Willow).
//
// The band tables below are deliberately explicit and easy to retune — the club
// cricketer who owns this catalogue can adjust them without touching the logic.

export type BallType = 'leather' | 'tennis';

/** Manually-entered stats. Only the fields that actually predict bat fit. */
export interface BattingStats {
  ballType: BallType;
  matches: number;
  innings: number;
  runs: number;
  highScore: number;
  average: number;      // may be entered directly; falls back to runs/innings
  strikeRate: number;   // runs per 100 balls
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  ducks: number;
}

export interface BattingDNA {
  aggression: number;    // 0–10 — intent / tempo (from strike rate)
  power: number;         // 0–10 — six-hitting / lofted power (from sixes)
  consistency: number;   // 0–10 — reliability (from average, conversions, ducks)
  experience: number;    // 0–10 — volume / exposure (from matches + runs)
  archetype: string;     // human-readable player type
  summary: string;       // one-line description grounded in their numbers
}

const clamp10 = (n: number) => Math.max(0, Math.min(10, n));
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Piecewise-linear score from a value against ascending [threshold, score] stops.
 * Interpolates between stops so the score moves smoothly, not in jumps.
 */
function bandScore(value: number, stops: [number, number][]): number {
  if (value <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    const [x0, y0] = stops[i - 1];
    const [x1, y1] = stops[i];
    if (value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

// --- Band tables (leather-ball, club/amateur calibration) --------------------

/** Strike rate → intent. ~70 accumulator, ~100 busy, 130+ aggressor. */
const SR_BANDS: [number, number][] = [
  [40, 1], [60, 3], [80, 5], [100, 6.5], [120, 8], [140, 9.5], [170, 10],
];

/** Average → run reliability. */
const AVG_BANDS: [number, number][] = [
  [5, 1.5], [10, 3], [15, 4.5], [20, 6], [30, 7.5], [40, 9], [55, 10],
];

/** Matches → exposure. */
const MATCHES_BANDS: [number, number][] = [
  [3, 1], [10, 3], [30, 5], [60, 7], [100, 8.5], [150, 10],
];

export function deriveBattingDNA(raw: Partial<BattingStats>): BattingDNA {
  const innings = Math.max(1, num(raw.innings) || num(raw.matches));
  const matches = num(raw.matches) || innings;
  const runs = num(raw.runs);
  const sixes = num(raw.sixes);
  const fours = num(raw.fours);
  const ducks = num(raw.ducks);
  const fifties = num(raw.fifties);
  const hundreds = num(raw.hundreds);
  const strikeRate = num(raw.strikeRate);
  const average = num(raw.average) || runs / innings;

  // 1) AGGRESSION — driven by strike rate.
  const aggression = clamp10(bandScore(strikeRate, SR_BANDS));

  // 2) POWER — six-hitting per innings, lifted by the share of boundaries that
  //    clear the rope. A pure roper of fours reads lower than a lofted hitter.
  const sixesPerInns = sixes / innings;
  const boundaries = fours + sixes;
  const sixShare = boundaries > 0 ? sixes / boundaries : 0;
  const power = clamp10(bandScore(sixesPerInns, [
    [0.05, 1], [0.15, 3], [0.3, 5], [0.5, 7], [0.8, 9], [1.2, 10],
  ]) + sixShare * 3);

  // 3) CONSISTENCY — average is the base, boosted by 50+/100 conversions and
  //    docked for a high duck rate.
  const duckRate = ducks / innings;
  const conversion = (fifties + hundreds) / innings; // big scores per innings
  const consistency = clamp10(
    bandScore(average, AVG_BANDS) + conversion * 8 - duckRate * 6
  );

  // 4) EXPERIENCE — matches played, nudged up by total run volume.
  const experience = clamp10(
    bandScore(matches, MATCHES_BANDS) + bandScore(runs, [[200, 0], [1000, 0.5], [3000, 1]])
  );

  const { archetype, summary } = classify({
    aggression, power, consistency, experience,
    strikeRate, average, sixes, innings, sixesPerInns,
  });

  return { aggression, power, consistency, experience, archetype, summary };
}

function classify(d: {
  aggression: number; power: number; consistency: number; experience: number;
  strikeRate: number; average: number; sixes: number; innings: number; sixesPerInns: number;
}): { archetype: string; summary: string } {
  const { aggression, power, consistency, experience } = d;

  if (power >= 7 && aggression >= 7) {
    return {
      archetype: 'Aggressive Finisher',
      summary: `A ${Math.round(d.strikeRate)} strike rate and ${d.sixes} sixes — you clear the rope and score fast. You need a bat built for power.`,
    };
  }
  if (consistency >= 6.5 && aggression >= 6.5) {
    return {
      archetype: 'Attacking Top-order',
      summary: `You combine tempo with runs (avg ${d.average.toFixed(1)}, SR ${Math.round(d.strikeRate)}) — a bat that rewards timing and still hits hard suits you.`,
    };
  }
  if (consistency >= 6.5 && aggression <= 5.5) {
    return {
      archetype: 'Anchor / Accumulator',
      summary: `You bat time and pile up runs (avg ${d.average.toFixed(1)}) without chasing risk. Control and pickup matter more than raw power for you.`,
    };
  }
  if (aggression >= 6 && power <= 5 && consistency >= 4.5) {
    return {
      archetype: 'Timing Stroke-maker',
      summary: `You score through placement and timing rather than muscle — a well-balanced, quick-pickup bat is your match.`,
    };
  }
  if (experience >= 6.5 && consistency <= 4.5 && (aggression >= 5 || power >= 4.5)) {
    return {
      archetype: 'Big-hitting Cameo Player',
      summary: `Plenty of games behind you and you go hard when you're in — a forgiving bat with a big sweet spot and good ping fits your game.`,
    };
  }
  if (experience <= 3.5) {
    return {
      archetype: 'Developing Batter',
      summary: `You're building your game — a reliable, balanced bat with an easy pickup and a large middle will help you the most.`,
    };
  }
  return {
    archetype: 'All-round Batter',
    summary: `A balanced record across the board — a versatile bat that does everything well without specialising is the safe, strong pick.`,
  };
}

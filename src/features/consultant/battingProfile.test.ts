import { describe, it, expect } from 'vitest';
import { deriveBattingDNA, BattingStats } from './battingProfile';

const base: BattingStats = {
  ballType: 'leather',
  matches: 50, innings: 45, runs: 900, highScore: 78, average: 20,
  strikeRate: 110, fifties: 5, hundreds: 0, fours: 90, sixes: 20, ducks: 3,
};

describe('deriveBattingDNA', () => {
  it('rates a fast six-hitter as an Aggressive Finisher', () => {
    const dna = deriveBattingDNA({
      ...base, strikeRate: 155, sixes: 60, fours: 70, average: 28, innings: 45,
    });
    expect(dna.aggression).toBeGreaterThan(8);
    expect(dna.power).toBeGreaterThan(7);
    expect(dna.archetype).toBe('Aggressive Finisher');
  });

  it('rates a patient high-average batter as an Anchor / Accumulator', () => {
    const dna = deriveBattingDNA({
      ...base, strikeRate: 68, average: 42, sixes: 6, fours: 120, fifties: 12, innings: 50,
    });
    expect(dna.consistency).toBeGreaterThan(6.5);
    expect(dna.aggression).toBeLessThan(5.5);
    expect(dna.archetype).toBe('Anchor / Accumulator');
  });

  it('rates a raw newcomer as a Developing Batter', () => {
    const dna = deriveBattingDNA({
      ...base, matches: 4, innings: 3, runs: 20, average: 6.7, strikeRate: 75, sixes: 0, fours: 3, fifties: 0,
    });
    expect(dna.experience).toBeLessThanOrEqual(3.5);
    expect(dna.archetype).toBe('Developing Batter');
  });

  it('all sub-scores stay within 0–10', () => {
    const dna = deriveBattingDNA({
      ...base, strikeRate: 300, sixes: 500, average: 200, matches: 999, innings: 1, ducks: 0,
    });
    for (const k of ['aggression', 'power', 'consistency', 'experience'] as const) {
      expect(dna[k]).toBeGreaterThanOrEqual(0);
      expect(dna[k]).toBeLessThanOrEqual(10);
    }
  });

  it('handles the sample CricHeroes screenshot player', () => {
    // 177 Mat, 122 Inns, 1031 Runs, HS 38, Avg 10.52, SR 84.72, 0x50s, 101x4, 28x6, 22 ducks
    const dna = deriveBattingDNA({
      ballType: 'leather', matches: 177, innings: 122, runs: 1031, highScore: 38,
      average: 10.52, strikeRate: 84.72, fifties: 0, hundreds: 0, fours: 101, sixes: 28, ducks: 22,
    });
    expect(dna.experience).toBeGreaterThan(9);   // very experienced
    expect(dna.consistency).toBeLessThan(4);      // low avg + many ducks
    expect(dna.aggression).toBeGreaterThan(4);    // busy SR
  });
});

import type { Card, KittiRules, SolverRecommendation } from '../types/cards';
import { cardToSymbol } from '../utils/cardUtils';
import { evaluateFarasHand } from './faras';

export interface KittiPartition {
  hand1: Card[];
  hand2: Card[];
  hand3: Card[];
  score1: number;
  score2: number;
  score3: number;
  q1: number; // percentile in [0, 1]
  q2: number;
  q3: number;
  pWin: number; // overall win probability %
  pSalami: number; // all 3 rounds sweep %
  desc1: string;
  desc2: string;
  desc3: string;
}

// Generate all 280 partitions of 9 items into 3 sets of 3 items
// 9 choose 3 = 84. Remaining 6 choose 3 = 20. Total = 84 * 20 / 6 = 280 unique unordered partitions
export function generate280Partitions(cards: Card[]): [number[], number[], number[]][] {
  if (cards.length !== 9) return [];
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const partitions: [number[], number[], number[]][] = [];

  // Card 0 is always in the first group to avoid duplicate permutations of groups
  for (let b = 1; b < 9; b++) {
    for (let c = b + 1; c < 9; c++) {
      const g1 = [0, b, c];
      const remaining1 = indices.filter(i => !g1.includes(i));
      
      // Fix first available index into group 2
      const firstRem = remaining1[0];
      for (let j = 1; j < remaining1.length; j++) {
        for (let k = j + 1; k < remaining1.length; k++) {
          const g2 = [firstRem, remaining1[j], remaining1[k]];
          const g3 = remaining1.filter(i => !g2.includes(i));
          partitions.push([g1, g2, g3]);
        }
      }
    }
  }

  return partitions;
}

export function solveKitti(cards: Card[], rules: KittiRules): SolverRecommendation {
  if (cards.length !== 9) {
    return {
      primaryAction: 'SCAN OR SELECT EXACTLY 9 CARDS',
      breakdown: [{ label: 'Cards Selected', value: `${cards.length} / 9` }],
    };
  }

  // 1. Instant check: Four of a Kind (Chauka)
  const rankCounts: Record<string, Card[]> = {};
  for (const c of cards) {
    if (!rankCounts[c.rank]) rankCounts[c.rank] = [];
    rankCounts[c.rank].push(c);
  }

  for (const [rankStr, group] of Object.entries(rankCounts)) {
    if (group.length >= 4) {
      return {
        primaryAction: `SHOW IMMEDIATELY — FOUR OF A KIND (${rankStr}s) INSTANT POT WIN!`,
        isInstantWin: true,
        isWinningDeclaration: true,
        winType: 'Chauka',
        confidenceScore: 100,
        cardsToHighlight: group.map(c => c.id),
        breakdown: [
          { label: 'Instant Rule', value: 'Chauka / Four-of-a-kind auto-wins entire pot!' },
          { label: 'Ranks Held', value: `Four ${rankStr}s: ${group.map(cardToSymbol).join(' ')}` },
          { label: 'Action', value: 'Reveal immediately without playing rounds.' },
        ],
      };
    }
  }

  // 2. Instant check: Four Pairs (Redeal)
  let pairsCount = 0;
  const pairRanks: string[] = [];
  for (const [rankStr, group] of Object.entries(rankCounts)) {
    if (group.length === 2) {
      pairsCount += 1;
      pairRanks.push(rankStr);
    }
  }

  if (pairsCount >= 4) {
    return {
      primaryAction: 'DECLARE FOUR PAIRS — FREE REDEAL!',
      isWinningDeclaration: true,
      winType: 'FourPairs',
      confidenceScore: 100,
      breakdown: [
        { label: 'Instant Rule', value: 'Holding 4 distinct pairs entitles player to a free re-deal.' },
        { label: 'Pairs Found', value: pairRanks.join(', ') },
        { label: 'Action', value: 'Call Four Pairs and demand a new shuffle.' },
      ],
    };
  }

  // 3. Exhaustive 280-partition evaluation
  const rawPartitions = generate280Partitions(cards);
  const M = rules.numOpponents || 3;
  const validPartitions: KittiPartition[] = [];

  for (const [g1, g2, g3] of rawPartitions) {
    const set1 = [cards[g1[0]], cards[g1[1]], cards[g1[2]]];
    const set2 = [cards[g2[0]], cards[g2[1]], cards[g2[2]]];
    const set3 = [cards[g3[0]], cards[g3[1]], cards[g3[2]]];

    const e1 = evaluateFarasHand(set1);
    const e2 = evaluateFarasHand(set2);
    const e3 = evaluateFarasHand(set3);

    // Permute the 3 sets to find if any order satisfies H1 >= H2 >= H3
    const groups = [
      { cards: set1, eval: e1 },
      { cards: set2, eval: e2 },
      { cards: set3, eval: e3 },
    ];

    // Sort descending by rank score
    groups.sort((a, b) => b.eval.rankScore - a.eval.rankScore);

    const h1 = groups[0].cards;
    const h2 = groups[1].cards;
    const h3 = groups[2].cards;
    const score1 = groups[0].eval.rankScore;
    const score2 = groups[1].eval.rankScore;
    const score3 = groups[2].eval.rankScore;

    // Must strictly satisfy H1 >= H2 >= H3
    if (score1 >= score2 && score2 >= score3) {
      const q1 = groups[0].eval.percentile / 100;
      const q2 = groups[1].eval.percentile / 100;
      const q3 = groups[2].eval.percentile / 100;

      // Round win probabilities against M opponents
      const w1 = Math.pow(q1, 2.2 * M);
      const w2 = Math.pow(q2, 1.0 * M);
      const w3 = Math.pow(q3, 0.5 * M);

      // P(Win >= 2)
      let pWin = 0;
      if (rules.ruleVariant === 'twoInARow') {
        pWin = w2 * (w1 + w3 - w1 * w3);
      } else {
        pWin = w1 * w2 * w3 + w1 * w2 * (1 - w3) + w1 * (1 - w2) * w3 + (1 - w1) * w2 * w3;
      }

      const pSalami = w1 * w2 * w3 * 100;

      validPartitions.push({
        hand1: h1,
        hand2: h2,
        hand3: h3,
        score1,
        score2,
        score3,
        q1,
        q2,
        q3,
        pWin: pWin * 100,
        pSalami,
        desc1: groups[0].eval.handTypeName,
        desc2: groups[1].eval.handTypeName,
        desc3: groups[2].eval.handTypeName,
      });
    }
  }

  if (validPartitions.length === 0) {
    return {
      primaryAction: 'NO VALID PARTITIONS FOUND (H1 >= H2 >= H3)',
      warning: 'Card ranks could not form an ordered split.',
      breakdown: [],
    };
  }

  // Sort partitions by highest P(Win >= 2)
  validPartitions.sort((a, b) => b.pWin - a.pWin);
  const best = validPartitions[0];

  // Salami threshold warning / Fold advice
  if (rules.salamiRule && best.pWin < 15) {
    return {
      primaryAction: 'FOLD HAND — PROTECT AGAINST SALAMI PENALTY',
      secondaryAction: `Pot Win Probability is only ${best.pWin.toFixed(1)}% (<15% threshold)`,
      confidenceScore: 85,
      suggestedMelds: [best.hand1, best.hand2, best.hand3],
      warning: 'High risk that another player achieves Salami (sweeps all 3 rounds). Fold to avoid double ante.',
      breakdown: [
        { label: 'Round 1 (H1)', value: `${best.hand1.map(cardToSymbol).join(' ')} (${best.desc1})` },
        { label: 'Round 2 (H2)', value: `${best.hand2.map(cardToSymbol).join(' ')} (${best.desc2})` },
        { label: 'Round 3 (H3)', value: `${best.hand3.map(cardToSymbol).join(' ')} (${best.desc3})` },
        { label: 'Win Probability', value: `${best.pWin.toFixed(1)}%` },
      ],
    };
  }

  const isHighSalami = best.pSalami > 70;

  return {
    primaryAction: isHighSalami
      ? `SALAMI CANDIDATE (${best.pSalami.toFixed(0)}% SWEEP) — SPLIT AND PLAY`
      : `OPTIMAL 3x3 SPLIT (${best.pWin.toFixed(1)}% POT WIN EQUITY)`,
    secondaryAction: `H1: ${best.desc1} | H2: ${best.desc2} | H3: ${best.desc3}`,
    isWinningDeclaration: isHighSalami,
    winType: isHighSalami ? 'Salami' : undefined,
    confidenceScore: Math.round(best.pWin),
    suggestedMelds: [best.hand1, best.hand2, best.hand3],
    breakdown: [
      { label: 'Round 1 (H1)', value: `${best.hand1.map(cardToSymbol).join('  ')} — ${best.desc1} (${(best.q1 * 100).toFixed(1)}% equity)` },
      { label: 'Round 2 (H2)', value: `${best.hand2.map(cardToSymbol).join('  ')} — ${best.desc2} (${(best.q2 * 100).toFixed(1)}% equity)` },
      { label: 'Round 3 (H3)', value: `${best.hand3.map(cardToSymbol).join('  ')} — ${best.desc3} (${(best.q3 * 100).toFixed(1)}% equity)` },
      { label: 'Pot Win Probability', value: `${best.pWin.toFixed(1)}% vs ${M} opponents` },
      { label: 'Rule Enforced', value: 'H1 ≥ H2 ≥ H3 (Valid descending strength)' },
    ],
  };
}

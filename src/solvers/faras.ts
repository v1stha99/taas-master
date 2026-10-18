import type { Card, FarasRules, Rank, SolverRecommendation } from '../types/cards';
import { cardToSymbol, getRankValue } from '../utils/cardUtils';

export type FarasHandType = 'trail' | 'pure_sequence' | 'sequence' | 'colour' | 'pair' | 'high_card';

export interface FarasEvaluation {
  handType: FarasHandType;
  handTypeName: string;
  rankScore: number; // Higher number beats lower
  percentile: number; // 0.0 to 100.0%
  description: string;
}

// Check if three rank values form a sequence (handles A-K-Q and A-2-3)
export function isSequenceRanks(v1: number, v2: number, v3: number): { isSeq: boolean; highRank: number } {
  const sorted = [v1, v2, v3].sort((a, b) => a - b);
  // Standard consecutive: x, x+1, x+2
  if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    return { isSeq: true, highRank: sorted[2] };
  }
  // Ace-low consecutive: A(1), 2, 3
  if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
    return { isSeq: true, highRank: 3 }; // In standard Teen Patti, A-K-Q is highest, A-2-3 is second highest
  }
  // Ace-high consecutive wrap: A(1), Q(12), K(13)
  if (sorted[0] === 1 && sorted[1] === 12 && sorted[2] === 13) {
    return { isSeq: true, highRank: 14 }; // A-K-Q highest
  }
  return { isSeq: false, highRank: 0 };
}

// Evaluate exact 3-card hand in Teen Patti / Faras
export function evaluateFarasHand(cards: Card[]): FarasEvaluation {
  if (cards.length < 3) {
    return {
      handType: 'high_card',
      handTypeName: 'Incomplete',
      rankScore: 0,
      percentile: 0,
      description: 'Need 3 cards to evaluate',
    };
  }

  const c1 = cards[0];
  const c2 = cards[1];
  const c3 = cards[2];

  // Map Ace to 14 for high card comparisons (except in A-2-3 runs)
  const getHighVal = (r: Rank) => (r === 'A' ? 14 : getRankValue(r));
  const rawVals = [getRankValue(c1.rank), getRankValue(c2.rank), getRankValue(c3.rank)];
  const highVals = [getHighVal(c1.rank), getHighVal(c2.rank), getHighVal(c3.rank)].sort((a, b) => b - a);

  const isFlush = c1.suit === c2.suit && c2.suit === c3.suit;
  const isTrio = c1.rank === c2.rank && c2.rank === c3.rank;
  const seqCheck = isSequenceRanks(rawVals[0], rawVals[1], rawVals[2]);

  // 1. Trail / Trio (A-A-A to 2-2-2)
  if (isTrio) {
    const val = getHighVal(c1.rank);
    // 52 combinations total. 99.76% - 100.0%
    const percentile = 99.76 + (val / 14) * 0.24;
    return {
      handType: 'trail',
      handTypeName: 'Trail (Trio)',
      rankScore: 500000 + val,
      percentile: parseFloat(percentile.toFixed(2)),
      description: `Three of a Kind (${c1.rank}s)`,
    };
  }

  // 2. Pure Sequence (Suited Run)
  if (isFlush && seqCheck.isSeq) {
    // 48 combinations total. 99.55% - 99.76%
    const percentile = 99.55 + (seqCheck.highRank / 14) * 0.21;
    return {
      handType: 'pure_sequence',
      handTypeName: 'Pure Sequence (Straight Flush)',
      rankScore: 400000 + seqCheck.highRank,
      percentile: parseFloat(percentile.toFixed(2)),
      description: `Suited Straight (${seqCheck.highRank === 14 ? 'A-K-Q' : `High ${seqCheck.highRank}`})`,
    };
  }

  // 3. Sequence / Straight (Mixed Suit Run)
  if (seqCheck.isSeq) {
    // 720 combinations. 96.29% - 99.55%
    const percentile = 96.29 + (seqCheck.highRank / 14) * 3.26;
    return {
      handType: 'sequence',
      handTypeName: 'Sequence (Straight / Run)',
      rankScore: 300000 + seqCheck.highRank,
      percentile: parseFloat(percentile.toFixed(2)),
      description: `Run (${seqCheck.highRank === 14 ? 'A-K-Q' : `High ${seqCheck.highRank}`})`,
    };
  }

  // 4. Colour / Flush (Suited non-sequence)
  if (isFlush) {
    // 1,096 combinations. 91.33% - 96.29%
    const score = highVals[0] * 256 + highVals[1] * 16 + highVals[2];
    const percentile = 91.33 + (score / (14 * 256 + 13 * 16 + 12)) * 4.96;
    return {
      handType: 'colour',
      handTypeName: 'Colour (Flush)',
      rankScore: 200000 + score,
      percentile: parseFloat(percentile.toFixed(2)),
      description: `Flush in ${c1.suit} (${highVals[0]}-High)`,
    };
  }

  // 5. Pair (Two of a kind)
  const isPair12 = c1.rank === c2.rank;
  const isPair23 = c2.rank === c3.rank;
  const isPair13 = c1.rank === c3.rank;

  if (isPair12 || isPair23 || isPair13) {
    const pairRankVal = isPair12 ? getHighVal(c1.rank) : isPair23 ? getHighVal(c2.rank) : getHighVal(c1.rank);
    const kickerVal = isPair12 ? getHighVal(c3.rank) : isPair23 ? getHighVal(c1.rank) : getHighVal(c2.rank);
    // 3,744 combinations. 74.39% - 91.33%
    const score = pairRankVal * 16 + kickerVal;
    const percentile = 74.39 + (score / (14 * 16 + 13)) * 16.94;
    return {
      handType: 'pair',
      handTypeName: 'Pair (Double)',
      rankScore: 100000 + score,
      percentile: parseFloat(percentile.toFixed(2)),
      description: `Pair with ${pairRankVal}s (Kicker ${kickerVal})`,
    };
  }

  // 6. High Card
  const score = highVals[0] * 256 + highVals[1] * 16 + highVals[2];
  // 16,440 combinations. 0.0% - 74.39%
  const percentile = (score / (14 * 256 + 13 * 16 + 11)) * 74.39;
  return {
    handType: 'high_card',
    handTypeName: 'High Card',
    rankScore: score,
    percentile: parseFloat(Math.min(74.39, Math.max(0.1, percentile)).toFixed(2)),
    description: `High Card ${highVals[0]} (${highVals[1]}, ${highVals[2]})`,
  };
}

// Faras solver recommendation
export function solveFaras(cards: Card[], _rules?: FarasRules): SolverRecommendation {
  if (cards.length < 3) {
    return {
      primaryAction: 'SCAN OR SELECT 3 CARDS',
      breakdown: [{ label: 'Status', value: `Currently selected: ${cards.length}/3 cards` }],
    };
  }

  const evalResult = evaluateFarasHand(cards);
  const { handType, percentile, handTypeName } = evalResult;

  if (handType === 'trail' || handType === 'pure_sequence') {
    return {
      primaryAction: 'RAISE MAXIMUM / BUILD POT',
      secondaryAction: `Monster Hand (>98% equity) - ${handTypeName}`,
      confidenceScore: 99,
      cardsToHighlight: cards.map(c => c.id),
      breakdown: [
        { label: 'Hand Category', value: handTypeName },
        { label: 'Cumulative Equity', value: `${percentile}% (Top ${Math.max(0.01, (100 - percentile)).toFixed(2)}%)` },
        { label: 'Recommended Seen Action', value: 'Double bet / Raise pot limit' },
        { label: 'Cards Held', value: cards.map(cardToSymbol).join('  ') },
      ],
    };
  }

  if (handType === 'sequence') {
    return {
      primaryAction: 'RAISE / CALL CONTINUOUSLY',
      secondaryAction: `Strong Run (${percentile}% percentile equity)`,
      confidenceScore: 92,
      cardsToHighlight: cards.map(c => c.id),
      breakdown: [
        { label: 'Hand Category', value: handTypeName },
        { label: 'Equity vs 3 Players', value: '~91% win equity' },
        { label: 'Action', value: 'Seen player should bet confidently; do not fold.' },
        { label: 'Cards', value: cards.map(cardToSymbol).join('  ') },
      ],
    };
  }

  if (handType === 'colour') {
    return {
      primaryAction: 'CALL / STAY IN POT',
      secondaryAction: `Solid Flush (${percentile}% percentile)`,
      confidenceScore: 82,
      cardsToHighlight: cards.map(c => c.id),
      breakdown: [
        { label: 'Hand Category', value: handTypeName },
        { label: 'Equity', value: '76% - 88% win rate' },
        { label: 'Show Threshold', value: 'Request Show immediately when only 2 players remain.' },
      ],
    };
  }

  if (handType === 'pair') {
    const isHighPair = evalResult.rankScore >= 100000 + 10 * 16;
    if (isHighPair) {
      return {
        primaryAction: 'CALL 1–2 BETS (HIGH PAIR)',
        secondaryAction: `Pair of 10s or higher (${percentile}%)`,
        confidenceScore: 68,
        cardsToHighlight: cards.map(c => c.id),
        breakdown: [
          { label: 'Hand Category', value: handTypeName },
          { label: 'Strategy', value: 'Call 1-2 rounds of bets. Fold if a Seen player re-raises.' },
          { label: 'Percentile', value: `${percentile}%` },
        ],
      };
    }
    return {
      primaryAction: 'FOLD LOW PAIR TO HEAVY ACTION',
      secondaryAction: `Low Pair (${percentile}%) carries high showdown risk`,
      confidenceScore: 60,
      breakdown: [
        { label: 'Hand Category', value: handTypeName },
        { label: 'Strategy', value: 'Low pairs (2s through 6s) lose to higher pairs and flushes.' },
        { label: 'Action', value: 'Check or fold if stake doubles.' },
      ],
    };
  }

  // High Card
  return {
    primaryAction: 'FOLD IMMEDIATELY AS SEEN PLAYER',
    secondaryAction: `Bottom 74% Deadwood (${percentile}% percentile)`,
    confidenceScore: 90,
    breakdown: [
      { label: 'Hand Category', value: 'High Card (Weak)' },
      { label: 'Advice', value: 'As a Seen player paying 2x stakes, calling with High Card is heavily -EV.' },
      { label: 'Action', value: 'Fold cards immediately to preserve chips.' },
    ],
  };
}

// In-Between Win Probability & Betting Advice
export function solveInBetween(card1: Card, card2: Card): SolverRecommendation {
  const v1 = getRankValue(card1.rank);
  const v2 = getRankValue(card2.rank);

  const low = Math.min(v1, v2);
  const high = Math.max(v1, v2);
  const interiorRanks = Math.max(0, high - low - 1);
  const spread = high - low;

  // Single 52-card deck with 2 boundary cards removed leaves 50 cards
  // 4 cards per interior rank
  const winOuts = interiorRanks * 4;
  const winProbability = (winOuts / 50) * 100;

  if (spread >= 8) {
    return {
      primaryAction: 'FAVORABLE ODDS (56%+) — BET POT / AGGRESSIVE',
      secondaryAction: `${winProbability.toFixed(1)}% Win Rate (${interiorRanks} interior ranks, ${winOuts} outs)`,
      confidenceScore: Math.round(winProbability),
      breakdown: [
        { label: 'Rank Spread', value: `${cardToSymbol(card1)} to ${cardToSymbol(card2)} (Gap: ${spread})` },
        { label: 'Win Probability', value: `${winProbability.toFixed(1)}%` },
        { label: 'Interior Outs', value: `${winOuts} / 50 cards win` },
        { label: 'EV Status', value: '✅ High Positive Expected Value (+EV)' },
      ],
    };
  }

  if (spread === 7) {
    return {
      primaryAction: 'SLIGHT NEGATIVE EV (48%) — MINIMUM BET',
      secondaryAction: `${winProbability.toFixed(1)}% Win Rate (${winOuts} winning cards in deck)`,
      confidenceScore: 50,
      breakdown: [
        { label: 'Rank Spread', value: `${cardToSymbol(card1)} to ${cardToSymbol(card2)} (Gap: 7)` },
        { label: 'Win Probability', value: '48.0%' },
        { label: 'Advice', value: 'House edge is slight (48% vs 52% lose/tie). Bet minimum table stake.' },
      ],
    };
  }

  return {
    primaryAction: 'SKIP / BET TABLE MINIMUM',
    secondaryAction: `Severe Negative EV (${winProbability.toFixed(1)}% Win Rate)`,
    confidenceScore: 85,
    warning: 'High risk of post match or outside miss!',
    breakdown: [
      { label: 'Rank Spread', value: `${cardToSymbol(card1)} to ${cardToSymbol(card2)} (Gap: ${spread})` },
      { label: 'Win Probability', value: `${winProbability.toFixed(1)}% (Only ${winOuts} winning cards)` },
      { label: 'EV Status', value: '❌ Unfavorable Bet — Fold or bet smallest allowable chip.' },
    ],
  };
}

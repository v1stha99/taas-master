import type { Card, DhumbalRules, SolverRecommendation } from '../types/cards';
import { cardToSymbol, getRankValue } from '../utils/cardUtils';

export interface DhumbalContext {
  hand: Card[];
  offeredCard: Card | null;
  turnNumber: number;
  opponentHandSizes: number[]; // e.g. [5, 4, 3, 2]
  isTurnStart: boolean; // Before throwing
  hasThrownMultiCard: boolean; // For rule where floor pickup requires prior multi-throw
}

export function getDhumbalCardValue(card: Card, rules: DhumbalRules): number {
  if (card.rank === 'A') return 1;
  const val = getRankValue(card.rank);
  if (val >= 2 && val <= 10) return val;

  // Court cards
  if (card.rank === 'J') {
    if (rules.jackValue === 'zero') return 0;
    if (rules.jackValue === 'eleven') return 11;
    return 10; // Flat-10
  }
  if (card.rank === 'Q') {
    return rules.jackValue === 'eleven' ? 12 : 10;
  }
  if (card.rank === 'K') {
    return rules.jackValue === 'eleven' ? 13 : 10;
  }
  return 0;
}

export function calculateDhumbalHandSum(hand: Card[], rules: DhumbalRules): number {
  return hand.reduce((sum, c) => sum + getDhumbalCardValue(c, rules), 0);
}

export interface LegalThrow {
  type: 'single' | 'set' | 'sequence';
  cards: Card[];
  pointsShed: number;
  topCard: Card; // Card to leave on top of discard pile
}

// Enumerate all legal throws in Dhumbal
export function enumerateLegalThrows(hand: Card[], rules: DhumbalRules): LegalThrow[] {
  const throws: LegalThrow[] = [];

  // 1. Single card throws
  for (const c of hand) {
    throws.push({
      type: 'single',
      cards: [c],
      pointsShed: getDhumbalCardValue(c, rules),
      topCard: c,
    });
  }

  // 2. Multi-card sets (2, 3, 4 of same rank)
  const groupedByRank: Record<string, Card[]> = {};
  for (const c of hand) {
    if (!groupedByRank[c.rank]) groupedByRank[c.rank] = [];
    groupedByRank[c.rank].push(c);
  }

  for (const group of Object.values(groupedByRank)) {
    if (group.length >= 2) {
      const points = group.reduce((sum, c) => sum + getDhumbalCardValue(c, rules), 0);
      throws.push({
        type: 'set',
        cards: group,
        pointsShed: points,
        topCard: group[0],
      });
    }
  }

  // 3. Sequences of >= 3 consecutive cards of same suit
  const suits = ['S', 'H', 'D', 'C'] as const;
  for (const s of suits) {
    const suitCards = hand.filter(c => c.suit === s);
    if (suitCards.length >= 3) {
      const sorted = [...suitCards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
      // Check 3-card sequences
      for (let i = 0; i <= sorted.length - 3; i++) {
        const c1 = sorted[i];
        const c2 = sorted[i + 1];
        const c3 = sorted[i + 2];
        const v1 = getRankValue(c1.rank);
        const v2 = getRankValue(c2.rank);
        const v3 = getRankValue(c3.rank);

        if (v1 + 1 === v2 && v2 + 1 === v3) {
          const seq = [c1, c2, c3];
          const points = seq.reduce((sum, c) => sum + getDhumbalCardValue(c, rules), 0);
          // Always leave highest card on top so next opponent cannot pick low card
          throws.push({
            type: 'sequence',
            cards: seq,
            pointsShed: points,
            topCard: c3,
          });
        }
      }
    }
  }

  return throws;
}

export function solveDhumbal(
  context: DhumbalContext,
  rules: DhumbalRules
): SolverRecommendation {
  const { hand, offeredCard, turnNumber, opponentHandSizes, isTurnStart } = context;
  const currentSum = calculateDhumbalHandSum(hand, rules);
  const limit = rules.callThreshold;

  // 1. Turn Start: Evaluate Jhyap / Dhumbal call
  if (isTurnStart && currentSum <= limit) {
    const opponentWithLowCards = opponentHandSizes.some(size => size <= 2);

    // Safe call thresholds
    const isUltraSafe = currentSum <= 2;
    const isMediumSafe = currentSum === 3 && !opponentWithLowCards;
    const isEarlySafe = currentSum <= 5 && turnNumber <= 2;

    if (isUltraSafe || isMediumSafe || isEarlySafe) {
      return {
        primaryAction: `CALL "JHYAP!" NOW — HAND TOTAL: ${currentSum} PTS`,
        secondaryAction: `Lowest Table Total (${currentSum} pts $\\le$ ${limit} limit)`,
        isInstantWin: true,
        isWinningDeclaration: true,
        winType: 'Jhyap',
        confidenceScore: 95,
        breakdown: [
          { label: 'Current Hand Sum', value: `${currentSum} points` },
          { label: 'Call Threshold', value: `\\le ${limit} points` },
          { label: 'Undercut Risk', value: 'Low. High probability of claiming 0 points!' },
          { label: 'Penalty Alert', value: 'If undercut, caller pays +25 point penalty.' },
        ],
      };
    }

    // High undercut risk warning
    return {
      primaryAction: `DO NOT CALL AT ${currentSum} PTS (UNDERCUT RISK)`,
      secondaryAction: 'Opponents have small hand sizes. Throw & reduce further.',
      confidenceScore: 78,
      warning: 'Warning: Opponent holds 1–2 cards and may hold lower count. Calling risks +25 penalty!',
      breakdown: [
        { label: 'Current Hand Sum', value: `${currentSum} points` },
        { label: 'Strategy', value: 'Throw high deadwood to lower sum to 0–2 before calling.' },
        { label: 'Opponent Status', value: opponentWithLowCards ? 'Opponent has $\\le 2$ cards!' : 'Table normal' },
      ],
    };
  }

  // 2. Discard / Throw Engine (Maximize immediate points shed while protecting 0-pt cards)
  const legalThrows = enumerateLegalThrows(hand, rules);

  if (legalThrows.length === 0) {
    return {
      primaryAction: 'NO LEGAL THROWS FOUND',
      breakdown: [],
    };
  }

  // Filter out throwing 0-point Jacks/Jokers unless no other choice
  const preferredThrows = legalThrows.filter(t => {
    if (t.cards.length === 1 && getDhumbalCardValue(t.cards[0], rules) === 0) {
      return false; // Don't throw isolated 0-pt card
    }
    return true;
  });

  const pool = preferredThrows.length > 0 ? preferredThrows : legalThrows;
  // Sort descending by points shed
  pool.sort((a, b) => b.pointsShed - a.pointsShed);
  const bestThrow = pool[0];

  // Evaluate pickup recommendation
  let pickAdvice = 'DRAW FROM BLIND STOCK';
  if (offeredCard) {
    const offeredVal = getDhumbalCardValue(offeredCard, rules);
    if (offeredVal <= 2) {
      pickAdvice = `PICK OFFERED CARD ${cardToSymbol(offeredCard)} (Low ${offeredVal} pts)`;
    }
  }

  const throwDesc = bestThrow.cards.map(cardToSymbol).join(' ');
  const topDesc = cardToSymbol(bestThrow.topCard);

  return {
    primaryAction: `THROW [${throwDesc}] (SHED ${bestThrow.pointsShed} PTS)`,
    secondaryAction: `${pickAdvice} | Leave ${topDesc} on top of discard pile`,
    confidenceScore: 90,
    cardsToDiscard: bestThrow.cards.map(c => c.id),
    breakdown: [
      { label: 'Recommended Throw', value: `${bestThrow.type.toUpperCase()}: ${throwDesc}` },
      { label: 'Points Shed', value: `-${bestThrow.pointsShed} pts (New total: ~${Math.max(0, currentSum - bestThrow.pointsShed + 3)} pts)` },
      { label: 'Top Card Strategy', value: `Place ${topDesc} (highest) on top to starve next player` },
      { label: 'Pickup Guidance', value: pickAdvice },
    ],
  };
}
